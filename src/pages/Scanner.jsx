import { useState, useEffect, useRef } from "react";
import Layout from "@/components/Layout";
import CameraScanner from "@/components/CameraScanner";
import { supabase } from "@/lib/supabase";
import { useFarmerLanguage } from "@/hooks/useFarmerLanguage";
import { useTranslation } from "react-i18next";
import ShareReportButton from "@/components/ShareReportButton";
import { preprocessImage } from "@/lib/imagePreprocess";
import { scanPlant } from "@/lib/scanPlant";
import toast from "react-hot-toast";

const GROQ_KEY = () => import.meta.env.VITE_GROQ_KEY;
const LANG_NAME  = { en:"English", yo:"Yoruba", ha:"Hausa", ig:"Igbo" };
const LANG_INSTR = {
  en:"Respond in clear, simple English suitable for a Nigerian farmer.",
  yo:"Dahun ni ede Yoruba pẹlu gbogbo alaye pataki.",
  ha:"Amsa cikin harshen Hausa tare da cikakken bayani.",
  ig:"Zaghachi n'asụsụ Igbo nke ọma.",
};

const SEV_STYLE = {
  low:      "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800",
  moderate: "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800",
  high:     "bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800",
  critical: "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800",
};

// ── Load community corrections ─────────────────────────────────────────
async function loadCorrections() {
  const { data } = await supabase.from("ai_corrections").select("*").eq("active",true).limit(20);
  return data ?? [];
}

// ── Send multiple images to Groq at once ──────────────────────────────
// async function scanPlantMultiAngle(captures, region, lang, corrections) {
//   const langName  = LANG_NAME[lang]  ?? "English";
//   const langInstr = LANG_INSTR[lang] ?? LANG_INSTR.en;

//   const correctionBlock = corrections.length > 0
//     ? `CORRECTIONS FROM NIGERIAN FARMERS — DO NOT MAKE THESE MISTAKES:\n${corrections.map(c =>
//         `• NEVER call it "${c.wrong_id}" when it is "${c.correct_id}". ${c.visual_clue ?? ""}`
//       ).join("\n")}\n\n`
//     : "";

//   const angleCount = captures.length;
//   const angleList  = captures.map(c => c.angle).join(", ");

//   const system = `You are TerraIQ+, an expert botanist and agronomist for Nigerian farmers.
// LANGUAGE: ${langInstr}. ALL advice text in ${langName}. Scientific names stay in Latin.

// ${correctionBlock}

// MULTI-ANGLE ANALYSIS:
// You are receiving ${angleCount} photo(s) of the SAME plant from different angles: ${angleList}.
// This gives you more visual information. Use ALL photos together to make a more accurate identification.
// If one angle is blurry or unclear, use the other angles to fill in the information.

// ANGLE-AWARE IDENTIFICATION:
// - From ABOVE: you see leaf arrangement, colour pattern, canopy shape
// - From BELOW/UNDERSIDE: you see disease spots, rust, pustules, egg masses, vein patterns
// - CLOSE-UP: you see leaf texture, spots, lesions, powdery coating, holes
// - FRONT/SIDE: you see stem, overall plant shape, wilting, growth pattern

// CRITICAL IDENTIFICATION RULES:
// 1. Neem/Dongoyaro — COMPOUND leaves: many small serrated leaflets on one stem. NOT cashew (single oval leaf).
// 2. Ewedu (Corchorus olitorius) — small heart-shaped serrated leaves. Common Nigerian vegetable.
// 3. Amaranthus/Tete — broad oval leaves, sometimes red stems. Edible vegetable.
// 4. Bitter leaf (Ewuro/Vernonia amygdalina) — dark green, distinctive bitter smell.
// 5. Ugu/Fluted pumpkin — large lobed leaves on climbing vine.
// 6. Siam weed — triangular leaves with strong smell. Invasive weed.
// 7. Spear grass — long thin grass with white fluffy seed tips. Harmful weed.
// 8. Striga/Witchweed — parasitic plant on cereal crops. Very harmful.

// IDENTIFICATION FROM ANY ANGLE:
// - A leaf from the underside still shows the same shape — just reversed
// - An angled shot still shows the leaf margin shape and vein pattern
// - A blurry close-up still shows colour and spot patterns
// - Combine ALL photos before deciding

// HEALTH ASSESSMENT:
// Look carefully across ALL photos for: leaf spots, yellowing edges, wilting, lesions,
// powdery white coating, rust pustules, holes from insects, stunted sections, abnormal colour.
// Only say healthy if genuinely no issues visible in ANY photo.

// WEED RULE:
// If it is a weed with no farm value: weed_action = "REMOVE IMMEDIATELY"
// If it has a use (mulch, medicine, edible): weed_action = "MANAGE — [brief use]"

// Respond ONLY with valid JSON. No markdown. No backticks.
// {
//   "not_a_plant": false,
//   "plant_type": "crop / weed / tree / grass / unknown",
//   "crop_identified": "Name + local name e.g. Neem (Dongoyaro)",
//   "scientific_name": "scientific name if known",
//   "identification_confidence": 88,
//   "identification_notes": "which visual features from which angles helped identify this",
//   "angles_used": ["front","underside"],
//   "is_weed": false,
//   "weed_action": null,
//   "is_healthy": false,
//   "diagnosis": "specific issue name in ${langName}",
//   "confidence": 88,
//   "severity": "low / moderate / high / critical",
//   "severity_explanation": "in ${langName}",
//   "immediate_action": "in ${langName}",
//   "steps": ["step in ${langName}", "step", "step"],
//   "local_products": [{"name":"product","price_naira":4500,"where":"available in Nigeria"}],
//   "organic_option": "in ${langName}",
//   "prevention": "in ${langName}"
// }`;

//   // Build user message with ALL images
//   const imageContent = captures.map(cap => ({
//     type: "image_url",
//     image_url: { url:`data:image/jpeg;base64,${cap.base64}` }
//   }));

//   const textContent = {
//     type:"text",
//     text:`Identify this plant carefully using all ${angleCount} photo(s) from angles: ${angleList}.
// Farmer is in ${region}, Nigeria. Use all photos together for the most accurate identification.
// Be honest if genuinely uncertain — describe what you see. Language: ${langName}.`
//   };

//   const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
//     method:"POST",
//     headers:{ "Content-Type":"application/json","Authorization":`Bearer ${GROQ_KEY()}` },
//     body: JSON.stringify({
//       model: "meta-llama/llama-4-scout-17b-16e-instruct",
//       max_tokens: 1200,
//       messages:[
//         { role:"system", content:system },
//         { role:"user",   content:[...imageContent, textContent] },
//       ],
//     }),
//   });

//   if (!res.ok) {
//     const e = await res.json().catch(() => ({}));
//     throw new Error(e.error?.message ?? "Scan failed. Please try again.");
//   }
//   const data = await res.json();
//   const raw  = data.choices[0].message.content;
//   return JSON.parse(raw.replace(/```json|```/g,"").trim());
// }

// ── Feedback ──────────────────────────────────────────────────────────
async function recordFeedback(scanId, verdict, wrongCrop, result) {
  const { data: { session: _sess } } = await supabase.auth.getSession();
      const user = _sess?.user;
  if (!user) return;
  await supabase.from("scan_feedback").insert({ user_id:user.id, scan_id:scanId, verdict, wrong_crop:wrongCrop||null });
  if (verdict==="wrong" && wrongCrop && result?.crop_identified) {
    const { data:existing } = await supabase.from("ai_corrections")
      .select("id,wrong_count").eq("wrong_id",result.crop_identified).eq("correct_id",wrongCrop).maybeSingle();
    if (existing) {
      await supabase.from("ai_corrections").update({ wrong_count:existing.wrong_count+1, updated_at:new Date().toISOString() }).eq("id",existing.id);
    } else {
      await supabase.from("ai_corrections").insert({ wrong_id:result.crop_identified, correct_id:wrongCrop, wrong_count:1, visual_clue:`Community: "${result.crop_identified}" was actually "${wrongCrop}"`, active:true });
    }
  }
}

// ══════════════════════════════════════════════════════════════════════
export default function ScannerPage() {
  const lang = useFarmerLanguage();
  const { t } = useTranslation();
  const fileRef = useRef(null);

  const [mode,        setMode]        = useState("idle");
  const [captures,    setCaptures]    = useState([]); // [{base64, preview, angle}]
  const [result,      setResult]      = useState(null);
  const [scanId,      setScanId]      = useState(null);
  const [error,       setError]       = useState(null);
  const [profile,     setProfile]     = useState(null);
  const [city,        setCity]        = useState("");
  const [corrections, setCorrections] = useState([]);
  const [processing,  setProcessing]  = useState(false);
  const [processStep, setProcessStep] = useState("");

  const [feedbackGiven,   setFeedbackGiven]   = useState(false);
  const [feedbackVerdict, setFeedbackVerdict] = useState(null);
  const [wrongCropInput,  setWrongCropInput]  = useState("");
  const [showWrongInput,  setShowWrongInput]  = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { session: _sess } } = await supabase.auth.getSession();
      const user = _sess?.user;
      if (user) {
        const { data } = await supabase.from("profiles").select("region,full_name,city").eq("id",user.id).single();
        setProfile(data);
        setCity(data?.city ?? "");
      }
      setCorrections(await loadCorrections());
    })();
  }, []);

  // Receive captures from camera (array of {base64, preview, angle})
  const handleCaptures = async (caps) => {
    setCaptures(caps);
    setMode("preview");
    setError(null);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      setCaptures([{ base64:ev.target.result.split(",")[1], preview:ev.target.result, angle:"front" }]);
      setError(null); setMode("preview");
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyse = async () => {
    if (captures.length === 0) return;
    setMode("analysing"); setError(null);
    const tid = toast.loading("Scanning your plant photo...");

    try {
      // Step 1: Preprocess image
      setProcessStep("Enhancing image quality...");
      const processed = await Promise.all(captures.map(async cap => {
        const result = await preprocessImage(cap.base64, { sharpen:true, brightness:1.08, contrast:1.12 });
        return { ...cap, base64:result.base64 };
      }));

      // Step 2: Send to AI
      setProcessStep("Analysing with AI...");
      const region = profile?.region ?? "Nigeria";
      const parsed = await scanPlant(processed, region, lang, corrections, city);
 

      if (parsed.not_a_plant) {
        toast.dismiss(tid); toast.error("No plant detected");
        setError("No plant found in these photos. Take a clear photo of a leaf, stem, fruit, or any part of a plant.");
        setMode("preview"); return;
      }

      setResult(parsed);
      setFeedbackGiven(false); setFeedbackVerdict(null);
      setWrongCropInput(""); setShowWrongInput(false);

      // Create thumbnail for storage
      let thumbnailBase64 = captures[0].preview.split(",")[1];
      try {
        const thumb = await preprocessImage(captures[0].preview.split(",")[1], { maxWidth: 200, maxHeight: 200 });
        thumbnailBase64 = thumb;
      } catch (thumbErr) {
        console.error('Thumbnail creation failed:', thumbErr);
      }

      // Upload image to storage
      let imageUrl = null;
      if (captures[0]?.preview) {
        try {
          const response = await fetch(captures[0].preview);
          const blob = await response.blob();
          const fileName = `scan_${Date.now()}_${user.id}.jpg`;
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('scans')
            .upload(fileName, blob, {
              contentType: 'image/jpeg',
              upsert: false
            });
          if (!uploadError) {
            const { data: { publicUrl } } = supabase.storage
              .from('scans')
              .getPublicUrl(fileName);
            imageUrl = publicUrl;
          }
        } catch (uploadErr) {
          console.error('Image upload failed:', uploadErr);
          // No fallback to data URL to avoid truncation
        }
      }

      // Save scan
      const { data: { session: _sess } } = await supabase.auth.getSession();
      const user = _sess?.user;
      if (user) {
        const { data:savedScan } = await supabase.from("scans").insert({
          user_id:        user.id,
          crop:           parsed.crop_identified ?? "Unknown plant",
          scan_type:      parsed.is_weed ? "weed" : "disease",
          result:         parsed.diagnosis,
          confidence:     parsed.confidence,
          severity:       parsed.severity,
          treatment_plan: JSON.stringify({ ...parsed, imageDataUrl: thumbnailBase64 }),
          image_url:      imageUrl,
        }).select().single();
        if (savedScan) setScanId(savedScan.id);
      }

      toast.dismiss(tid);
      toast.success(parsed.is_healthy ? "Plant looks healthy!" : `Detected: ${parsed.diagnosis}`);
      setMode("result");
    } catch(e) { toast.dismiss(tid); toast.error(e.message); setMode("preview"); }
  };

  const submitFeedback = async (verdict) => {
    setFeedbackVerdict(verdict);
    if (verdict==="wrong") { setShowWrongInput(true); return; }
    await recordFeedback(scanId, "correct", null, result);
    setFeedbackGiven(true); toast.success("Thanks! Feedback saved.");
  };

  const submitWrongFeedback = async () => {
    await recordFeedback(scanId, "wrong", wrongCropInput, result);
    setFeedbackGiven(true); setShowWrongInput(false);
    toast.success("Correction saved — AI will learn from this for all users!");
  };

  const reset = () => {
    setMode("idle"); setCaptures([]); setResult(null);
    setScanId(null); setError(null); setFeedbackGiven(false);
  };

  if (mode==="camera") return (
    <CameraScanner
      onCapture={handleCaptures}
      onClose={() => setMode("idle")}
      multiAngle={false}
    />
  );

  const sev = result ? SEV_STYLE[result.severity] ?? SEV_STYLE.low : null;
  const firstPreview = captures[0]?.preview;

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-ink dark:text-white text-3xl font-black mb-1">{t("scanner.title")}</h1>
        <p className="text-ink-500 dark:text-gray-400 mb-6">{t("scanner.subtitle")}</p>


        {mode === "idle" && (
          <div className="space-y-4">

            {/* Community learning banner */}
            {corrections.length > 0 && (
              <div className="bg-terra/10 border border-terra/20 rounded-2xl p-4 flex gap-3 items-start">
                <div className="w-7 h-7 rounded-xl bg-terra flex items-center justify-center text-white text-xs font-black shrink-0">AI</div>
                <div>
                  <p className="text-ink dark:text-white text-sm font-semibold">Community-trained AI</p>
                  <p className="text-ink-500 dark:text-gray-400 text-xs mt-0.5">
                    {corrections.length} farmer correction{corrections.length !== 1 ? "s" : ""} active · AI learns from every approved and disapproved result
                  </p>
                </div>
              </div>
            )}

            {/* What it can detect */}
            <div className="grid grid-cols-4 gap-2">
               {[["🦠","Disease"],["🌿","Weeds"],["🐛","Pests"],["🔬","Nutrients"]].map(([icon,label]) => (
                <div key={label} className="bg-white dark:bg-dark-surface rounded-2xl p-3 text-center border border-deep-light dark:border-dark-light shadow-card">
                  <div className="text-terra text-xl mb-1">{icon}</div>
                  <p className="text-ink-500 dark:text-gray-400 text-xs font-medium">{label}</p>
                </div>
              ))}
            </div>

            {/* One-shot tip */}
            <div className="bg-sky/10 border border-sky/20 rounded-2xl p-4">
              <p className="text-sky font-semibold text-sm mb-2">📷 One Clear Photo is All You Need</p>
              <p className="text-ink-500 dark:text-gray-400 text-sm">
                Take a clear, close-up photo of the sick leaf or plant part.
                The AI can identify crop disease, pests, and nutrient problems from a single good photo.
              </p>
            </div>

            {/* Main buttons */}
            <button
              onClick={() => setMode("camera")}
              className="w-full bg-terra text-white h-16 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 hover:bg-terra-dark transition-colors shadow-md"
            >
              <span className="text-2xl">📷</span> Open Vision Scanner
            </button>

            <button
              onClick={() => fileRef.current.click()}
              className="w-full bg-white dark:bg-dark-surface border border-deep-light dark:border-dark-light text-ink dark:text-white h-14 rounded-2xl font-semibold flex items-center justify-center gap-3 hover:border-terra transition-colors shadow-card"
            >
              <span className="text-xl">🖼</span> Upload a Photo
            </button>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />

            {/* Tips */}
            <div className="bg-terra-light dark:bg-terra/10 rounded-2xl p-4 border border-green-200 dark:border-terra/20">
              <p className="text-terra font-semibold text-sm mb-2">{t("scanner.tips")}</p>
              <ul className="text-ink-500 dark:text-gray-400 text-sm space-y-1">
                <li>• Take photo in good natural light, avoid harsh shadows</li>
                <li>• Hold steady and close enough to see leaf details clearly</li>
                <li>• For disease — show the affected leaf up close</li>
                <li>• Only plant images will be accepted — not food, people, or objects</li>
              </ul>
            </div>

          </div>
        )}
        {/* PREVIEW */}
        {mode==="preview" && (
          <div className="space-y-4">
            {/* Single photo preview */}
            <div className="relative rounded-2xl overflow-hidden border-2 border-terra/30">
              <img src={captures[0]?.preview} alt="Plant" className="w-full max-h-72 object-cover" />
              <button onClick={reset}
                className="absolute top-3 right-3 w-8 h-8 bg-black/60 rounded-full text-white text-sm flex items-center justify-center">✕</button>
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4">
                <p className="text-red-700 dark:text-red-400 font-bold text-sm">No plant found</p>
                <p className="text-red-600 dark:text-red-300 text-sm mt-1">{error}</p>
              </div>
            )}

            <button onClick={handleAnalyse}
              className="w-full bg-terra text-white h-14 rounded-2xl font-bold hover:bg-terra-dark transition-colors shadow-md">
              ◈ Scan Photo
            </button>
            <button onClick={reset} className="w-full text-ink-500 dark:text-gray-400 h-10 text-sm">{t("scanner.startOver")}</button>
          </div>
        )}

        {/* ANALYSING */}
        {mode==="analysing" && firstPreview && (
          <div className="relative rounded-3xl overflow-hidden">
            <img src={firstPreview} alt="Plant" className="w-full max-h-80 object-cover opacity-50" />
            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center">
              <div className="relative w-20 h-20 mb-4">
                {[80,56,32].map((sz,i) => (
                  <div key={i} style={{ position:"absolute",top:"50%",left:"50%",
                    width:sz,height:sz,borderRadius:"50%",border:"1.5px solid #00FF8840",
                    borderTopColor:"#00FF88",transform:"translate(-50%,-50%)",
                    animation:`ss${i} ${1+i*0.4}s linear infinite` }} />
                ))}
                <style>{`@keyframes ss0{to{transform:translate(-50%,-50%)rotate(360deg);}}@keyframes ss1{to{transform:translate(-50%,-50%)rotate(-360deg);}}@keyframes ss2{to{transform:translate(-50%,-50%)rotate(360deg);}}`}</style>
              </div>
              <p className="text-white font-bold" style={{ fontFamily:"'Courier New',monospace",letterSpacing:2 }}>
                  ANALYSING PLANT...
              </p>
              <p className="text-gray-400 text-sm mt-1">{processStep}</p>
            </div>
          </div>
        )}

        {/* RESULT */}
        {mode==="result" && result && (
          <div className="space-y-4">
            {/* Header */}
            <div className="relative rounded-3xl overflow-hidden">
              <img src={firstPreview} alt="Plant" className="w-full max-h-56 object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-transparent flex items-end p-5">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded font-bold uppercase ${
                      result.is_weed ? "bg-orange-500 text-white" :
                      result.plant_type==="tree" ? "bg-blue-600 text-white" : "bg-terra text-white"
                    }`}>{result.plant_type ?? "plant"}</span>
                    {result.identification_confidence < 65 && (
                      <span className="text-xs px-2 py-0.5 rounded font-bold bg-amber/80 text-black">{t("scanner.lowConfidence")}</span>
                    )}
                  </div>
                  <p className="text-white font-black text-xl">{result.crop_identified}</p>
                  {result.scientific_name && <p className="text-gray-300 text-xs italic">{result.scientific_name}</p>}
                  <p className="text-gray-400 text-sm mt-1">{result.diagnosis}</p>
                </div>
                {result.severity && (
                  <div className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize border ${sev} shrink-0`}>{result.severity}</div>
                )}
              </div>
            </div>

            {/* Low confidence warning */}
            {result.identification_confidence < 65 && (
              <div className="bg-amber/10 border border-amber/30 rounded-2xl p-4">
                <p className="text-amber font-semibold text-sm mb-1">{t("scanner.confidenceWarning", { percent: result.identification_confidence })}</p>
                <p className="text-ink-500 dark:text-gray-300 text-sm">{result.identification_notes}</p>
                <p className="text-amber text-xs mt-2">{t("scanner.confidenceTip")}</p>
              </div>
            )}

            {/* Weed action */}
            {result.is_weed && result.weed_action && (
              <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-2xl p-4">
                <p className="text-orange-700 dark:text-orange-400 font-bold text-sm mb-1">{t("scanner.weedDetectedTitle")}</p>
                <p className="text-ink dark:text-white text-sm">{result.weed_action}</p>
              </div>
            )}

            {/* Healthy */}
            {result.is_healthy && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl p-4 flex items-center gap-3">
                <span className="text-2xl">✅</span>
                <p className="text-green-700 dark:text-green-400 font-semibold">{t("scanner.plantHealthy")}</p>
              </div>
            )}

            {/* Confidence */}
            <div className="bg-white dark:bg-dark-surface rounded-2xl border border-deep-light dark:border-dark-light p-4 shadow-card">
              <div className="flex justify-between mb-2">
                <p className="text-ink-500 dark:text-gray-400 text-sm">{t("scanner.scanConfidence")}</p>
                <p className="text-ink dark:text-white font-bold">{result.confidence}%</p>
              </div>
              <div className="h-2 bg-deep-light dark:bg-dark-light rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-terra" style={{ width:`${result.confidence}%` }} />
              </div>
              <p className="text-ink-500 dark:text-gray-500 text-xs mt-2">{result.identification_notes}</p>
            </div>

            {/* Immediate action */}
            {!result.is_healthy && result.immediate_action && (
              <div className={`rounded-2xl p-4 border ${sev}`}>
                <p className="font-bold text-sm mb-1">{t("scanner.immediateAction")}</p>
                <p className="text-sm">{result.immediate_action}</p>
              </div>
            )}

            {/* Steps */}
            {result.steps?.length > 0 && (
              <div className="bg-white dark:bg-dark-surface rounded-2xl p-5 border border-deep-light dark:border-dark-light shadow-card">
                <p className="text-ink dark:text-white font-bold mb-4">{t("scanner.steps")}</p>
                <ol className="space-y-3">
                  {result.steps.map((s,i) => (
                    <li key={i} className="flex gap-3">
                      <div className="w-6 h-6 rounded-full bg-terra text-white text-xs font-black flex items-center justify-center shrink-0">{i+1}</div>
                      <p className="text-ink-500 dark:text-gray-300 text-sm leading-relaxed">{s}</p>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* Products */}
            {result.local_products?.length > 0 && (
              <div className="bg-white dark:bg-dark-surface rounded-2xl p-5 border border-deep-light dark:border-dark-light shadow-card">
                <p className="text-ink dark:text-white font-bold mb-3">{t("scanner.localProducts")}</p>
                {result.local_products.map((p,i) => (
                  <div key={i} className="bg-deep-mid dark:bg-dark-mid rounded-xl p-3 flex justify-between items-start mb-2 last:mb-0">
                    <div>
                      <p className="text-ink dark:text-white text-sm font-semibold">{p.name}</p>
                      <p className="text-ink-500 dark:text-gray-500 text-xs">{p.where}</p>
                    </div>
                    <p className="text-terra font-bold text-sm shrink-0 ml-3">₦{p.price_naira?.toLocaleString()}</p>
                  </div>
                ))}
              </div>
            )}

            {result.organic_option && (
              <div className="bg-terra-light dark:bg-terra/10 border border-green-200 dark:border-terra/20 rounded-2xl p-4">
                <p className="text-terra font-semibold text-sm mb-1">🌿 Organic Option</p>
                <p className="text-ink-500 dark:text-gray-300 text-sm">{result.organic_option}</p>
              </div>
            )}

            {/* Feedback */}
            <div className="bg-white dark:bg-dark-surface rounded-2xl p-5 border border-deep-light dark:border-dark-light shadow-card">
              <p className="text-ink dark:text-white font-bold mb-1">Was this correct?</p>
              <p className="text-ink-500 dark:text-gray-400 text-xs mb-4">Your feedback trains the AI for all farmers.</p>
              {!feedbackGiven ? (
                !showWrongInput ? (
                  <div className="flex gap-3">
                    <button onClick={() => submitFeedback("correct")}
                      className="flex-1 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800 rounded-xl py-3 text-sm font-bold hover:bg-green-100 transition-colors">
                      ✓ Correct
                    </button>
                    <button onClick={() => submitFeedback("wrong")}
                      className="flex-1 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-xl py-3 text-sm font-bold hover:bg-red-100 transition-colors">
                      ✗ Wrong
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <input value={wrongCropInput} onChange={e=>setWrongCropInput(e.target.value)}
                      placeholder="What plant is it actually? e.g. Neem (Dongoyaro)"
                      className="w-full bg-deep-mid dark:bg-dark-mid rounded-xl px-4 h-11 text-ink dark:text-white border border-deep-light dark:border-dark-light focus:border-terra outline-none text-sm" />
                    <div className="flex gap-2">
                      <button onClick={() => setShowWrongInput(false)} className="flex-1 bg-deep-light dark:bg-dark-light text-ink-500 dark:text-gray-400 rounded-xl py-2.5 text-sm font-semibold">Cancel</button>
                      <button onClick={submitWrongFeedback} className="flex-1 bg-terra text-white rounded-xl py-2.5 text-sm font-bold hover:bg-terra-dark transition-colors">Submit Correction</button>
                    </div>
                  </div>
                )
              ) : (
                <div className="flex items-center gap-3 py-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${feedbackVerdict==="correct" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                    {feedbackVerdict==="correct" ? "✓" : "✗"}
                  </div>
                  <p className="text-ink-500 dark:text-gray-400 text-sm">
                    {feedbackVerdict==="wrong" ? "Correction saved — AI will avoid this mistake for all future scans." : "Confirmed. Thank you!"}
                  </p>
                </div>
              )}
            </div>


            {/* Share Report Button */}
            <ShareReportButton
              type="scan"
              result={result}
              farmerName={profile?.full_name}
              location={`${city ? city + ", " : ""}${profile?.region ?? "Nigeria"}`}
              imageDataUrl={firstPreview}
              className="w-full"
            />

            <button onClick={reset} className="w-full bg-terra text-white h-14 rounded-2xl font-bold hover:bg-terra-dark transition-colors shadow-md">
              Scan Another Plant
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
}
