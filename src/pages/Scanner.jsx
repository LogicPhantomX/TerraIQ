import { useState, useEffect, useRef } from "react";
import Layout from "@/components/Layout";
import CameraScanner from "@/components/CameraScanner";
import { supabase } from "@/lib/supabase";
import { useFarmerLanguage } from "@/hooks/useFarmerLanguage";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";

const GROQ_KEY = () => import.meta.env.VITE_GROQ_KEY;

const LANG_NAME = { en:"English", yo:"Yoruba", ha:"Hausa", ig:"Igbo" };
const LANG_INSTR = {
  en: "Respond in clear, simple English easy for a Nigerian farmer.",
  yo: "Dahun ni ede Yoruba pẹlu gbogbo alaye.",
  ha: "Amsa cikin harshen Hausa tare da cikakken bayani.",
  ig: "Zaghachi n'asụsụ Igbo nke ọma.",
};

const SEV_STYLE = {
  low:      "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800",
  moderate: "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800",
  high:     "bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800",
  critical: "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800",
};

// ── Load community corrections from Supabase ────────────────────────
async function loadCorrections() {
  const { data } = await supabase
    .from("ai_corrections")
    .select("wrong_id, correct_id, visual_clue, wrong_count")
    .eq("active", true)
    .order("wrong_count", { ascending: false })
    .limit(20);
  return data ?? [];
}

// ── Main scan function ───────────────────────────────────────────────
async function scanPlant(base64, region, lang, corrections) {
  const langInstr = LANG_INSTR[lang]  ?? LANG_INSTR.en;
  const langName  = LANG_NAME[lang]   ?? "English";

  // Build corrections block from community learning
  const correctionBlock = corrections.length > 0 ? `
COMMUNITY CORRECTIONS — COMMON MISTAKES TO AVOID:
${corrections.map(c =>
  `⚠ Do NOT call it "${c.wrong_id}" when it is actually "${c.correct_id ?? "something else"}". ${c.visual_clue ?? ""} (${c.wrong_count} farmers flagged this error)`
).join("\n")}

` : "";

  const system = `You are TerraIQ+, an expert botanist and agronomist for Nigerian farmers.
LANGUAGE RULE: ${langInstr}. ALL advice text must be in ${langName}. Scientific names stay in Latin.

${correctionBlock}

YOUR JOB: Identify ANY plant in the image accurately.
You are a PLANT SCANNER — not just a food crop scanner.
You must identify:
- Crops (maize, tomato, cassava, ewedu, tatashe, etc.)
- Weeds (spear grass, siam weed, water hyacinth, tridax, striga, etc.)
- Trees (neem/dongoyaro, moringa, mango, cashew, palm, etc.)
- Grasses and bush plants
- Diseased or stressed plants
- Seedlings that look similar to weeds

NIGERIAN LOCAL NAMES TO KNOW:
- Neem tree = Dongoyaro (Hausa/Yoruba) = Igo (Igbo) — Azadirachta indica — compound pinnate leaves, many small serrated leaflets
- Ewedu = Jute mallow = Corchorus olitorius — heart-shaped serrated leaves
- Tete = Amaranthus hybridus — broad oval leaves with reddish stems
- Ewuro = Bitter leaf = Vernonia amygdalina — dark green, bitter taste
- Ugu = Fluted pumpkin = Telfairia occidentalis — large lobed leaves, climbing vine
- Gbure = Waterleaf = Talinum triangulare — succulent, fleshy leaves
- Siam weed = Chromolaena odorata — triangle-shaped leaves, strong smell
- Spear grass = Imperata cylindrica — long thin grass, white fluffy tips
- Striga = Witchweed — parasitic plant on cereal roots
- Tridax daisy = Tridax procumbens — weed with small yellow-white flowers

CRITICAL IDENTIFICATION RULES:
1. If not a plant at all: return not_a_plant = true
2. If you can see it IS a plant but are unsure of species: set confidence below 50%, say what you see honestly
3. NEVER force an identification — it is better to say "Unknown weed with triangular leaves" than to say "Rice" for a weed
4. Neem/Dongoyaro has compound pinnate leaves (many small leaflets on one stem). Cashew has single smooth oval leaves. NEVER confuse them.
5. Weeds look like weeds — do not call a weed "rice" or "cassava" just because you see green leaves
6. If you see multiple plant types, identify the most prominent one

Respond ONLY with valid JSON. No markdown. No backticks.
{
  "not_a_plant": false,
  "plant_type": "crop / weed / tree / grass / unknown",
  "crop_identified": "Common name + local name if applicable e.g. Neem (Dongoyaro)",
  "scientific_name": "scientific name",
  "identification_confidence": 85,
  "identification_notes": "visual features that helped identify this plant",
  "diagnosis": "disease/pest/weed issue name in ${langName}, or Healthy, or name of weed",
  "is_healthy": false,
  "is_weed": false,
  "confidence": 85,
  "severity": "low / moderate / high / critical",
  "severity_explanation": "string in ${langName}",
  "immediate_action": "what to do now in ${langName}",
  "steps": ["step in ${langName}", "step", "step"],
  "local_products": [{"name":"product","price_naira":4500,"where":"available in Nigeria"}],
  "organic_option": "organic treatment in ${langName}",
  "prevention": "how to prevent this in ${langName}"
}`;

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type":"application/json", "Authorization":`Bearer ${GROQ_KEY()}` },
    body: JSON.stringify({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      max_tokens: 1400,
      messages: [
        { role:"system", content:system },
        {
          role:"user",
          content:[
            { type:"image_url", image_url:{ url:`data:image/jpeg;base64,${base64}` } },
            { type:"text", text:`Carefully identify this plant. Farmer is in ${region}, Nigeria. Be honest if unsure — do not guess a food crop if it looks like a weed or tree. Language: ${langName}.` },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error?.message ?? "Scan failed. Please try again.");
  }
  const data  = await res.json();
  const raw   = data.choices[0].message.content;
  return JSON.parse(raw.replace(/```json|```/g,"").trim());
}

// ── Auto-record correction when enough users disapprove ─────────────
async function recordFeedback(scanId, verdict, wrongCrop, result) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // Save individual feedback
  await supabase.from("scan_feedback").insert({
    user_id:    user.id,
    scan_id:    scanId,
    verdict,
    wrong_crop: wrongCrop || null,
  });

  // If wrong, check how many times AI made this same mistake
  if (verdict === "wrong" && wrongCrop && result?.crop_identified) {
    const wrongId   = result.crop_identified;
    const correctId = wrongCrop;

    // Upsert into ai_corrections — increment wrong_count
    const { data: existing } = await supabase
      .from("ai_corrections")
      .select("id, wrong_count")
      .eq("wrong_id", wrongId)
      .eq("correct_id", correctId)
      .maybeSingle();

    if (existing) {
      await supabase.from("ai_corrections").update({
        wrong_count: existing.wrong_count + 1,
        updated_at:  new Date().toISOString(),
      }).eq("id", existing.id);
    } else {
      await supabase.from("ai_corrections").insert({
        wrong_id:   wrongId,
        correct_id: correctId,
        wrong_count: 1,
        visual_clue: `Community correction: farmers reported "${wrongId}" was actually "${correctId}"`,
        active:     true,
      });
    }
  }
}

// ══════════════════════════════════════════════════════════════════════
export default function ScannerPage() {
  const { t }   = useTranslation();
  const lang    = useFarmerLanguage();
  const fileRef = useRef(null);

  const [mode,        setMode]        = useState("idle");
  const [preview,     setPreview]     = useState(null);
  const [base64,      setBase64]      = useState(null);
  const [result,      setResult]      = useState(null);
  const [scanId,      setScanId]      = useState(null);
  const [error,       setError]       = useState(null);
  const [profile,     setProfile]     = useState(null);
  const [corrections, setCorrections] = useState([]);

  // Feedback state
  const [feedbackGiven,    setFeedbackGiven]    = useState(false);
  const [feedbackVerdict,  setFeedbackVerdict]  = useState(null);
  const [wrongCropInput,   setWrongCropInput]   = useState("");
  const [showWrongInput,   setShowWrongInput]   = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from("profiles").select("region,full_name").eq("id",user.id).single();
        setProfile(data);
      }
      const c = await loadCorrections();
      setCorrections(c);
    })();
  }, []);

  const handleCapture = (b64, previewUrl) => {
    setBase64(b64); setPreview(previewUrl); setError(null); setMode("preview");
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => { setPreview(ev.target.result); setBase64(ev.target.result.split(",")[1]); setError(null); setMode("preview"); };
    reader.readAsDataURL(file);
  };

  const handleAnalyse = async () => {
    if (!base64) return;
    setMode("analysing"); setError(null);
    const tid = toast.loading("Scanning plant...");
    try {
      const region = profile?.region ?? "Nigeria";
      const parsed = await scanPlant(base64, region, lang, corrections);

      if (parsed.not_a_plant) {
        toast.dismiss(tid); toast.error("No plant detected");
        setError("No plant or crop found in this image. Please take a clear photo of a leaf, stem, fruit, or any part of a plant.");
        setMode("preview");
        return;
      }

      setResult(parsed);
      setFeedbackGiven(false);
      setFeedbackVerdict(null);
      setWrongCropInput("");
      setShowWrongInput(false);

      // Save scan to database
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: savedScan } = await supabase.from("scans").insert({
          user_id:        user.id,
          crop:           parsed.crop_identified ?? "Unknown plant",
          scan_type:      parsed.is_weed ? "weed" : "disease",
          result:         parsed.diagnosis,
          confidence:     parsed.confidence,
          severity:       parsed.severity,
          treatment_plan: JSON.stringify(parsed),
          image_url:      `data:image/jpeg;base64,${base64}`,
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
    if (verdict === "wrong") { setShowWrongInput(true); return; }
    await recordFeedback(scanId, "correct", null, result);
    setFeedbackGiven(true);
    toast.success("Thanks! Your feedback helps all farmers.");
  };

  const submitWrongFeedback = async () => {
    await recordFeedback(scanId, "wrong", wrongCropInput, result);
    setFeedbackGiven(true);
    setShowWrongInput(false);
    toast.success("Correction saved. The AI will learn from this!");
  };

  const reset = () => {
    setMode("idle"); setPreview(null); setBase64(null);
    setResult(null); setScanId(null); setError(null);
    setFeedbackGiven(false); setFeedbackVerdict(null);
  };

  if (mode === "camera") return (
    <CameraScanner onCapture={handleCapture} onClose={() => setMode("idle")} />
  );

  const sev = result ? (SEV_STYLE[result.severity] ?? SEV_STYLE.low) : null;

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-ink dark:text-white text-3xl font-black mb-1">Plant Scanner</h1>
        <p className="text-ink-500 dark:text-gray-400 mb-6">Scan any plant — crops, weeds, trees, grasses</p>

        {/* IDLE */}
        {mode === "idle" && (
          <div className="space-y-4">
            {corrections.length > 0 && (
              <div className="bg-terra/10 border border-terra/20 rounded-2xl p-4 flex gap-3 items-start">
                <div className="w-7 h-7 rounded-xl bg-terra flex items-center justify-center text-white text-xs font-black shrink-0">AI</div>
                <div>
                  <p className="text-ink dark:text-white text-sm font-semibold">Community-trained AI</p>
                  <p className="text-ink-500 dark:text-gray-400 text-xs mt-0.5">{corrections.length} farmer correction{corrections.length !== 1 ? "s" : ""} loaded into this scan session. The AI learns from every approved and disapproved result.</p>
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {[["🦠","Disease"],["🌿","Weeds"],["🐛","Pests"],["🔬","Nutrients"]].map(([icon,label]) => (
                <div key={label} className="bg-white dark:bg-dark-surface rounded-2xl p-4 text-center border border-deep-light dark:border-dark-light shadow-card">
                  <div className="text-2xl mb-2">{icon}</div>
                  <p className="text-ink-500 dark:text-gray-400 text-xs font-medium">{label}</p>
                </div>
              ))}
            </div>
            <button onClick={() => setMode("camera")} className="w-full bg-terra text-white h-16 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 hover:bg-terra-dark transition-colors shadow-md">
              <span className="text-2xl">📷</span> {t("scanner.useCamera")}
            </button>
            <button onClick={() => fileRef.current.click()} className="w-full bg-white dark:bg-dark-surface border border-deep-light dark:border-dark-light text-ink dark:text-white h-14 rounded-2xl font-semibold flex items-center justify-center gap-3 hover:border-terra transition-colors shadow-card">
              <span className="text-xl">🖼</span> {t("scanner.uploadPhoto")}
            </button>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
            <div className="bg-terra-light dark:bg-terra/10 rounded-2xl p-4 border border-green-200 dark:border-terra/20">
              <p className="text-terra font-semibold text-sm mb-2">📸 {t("scanner.tips")}</p>
              <ul className="text-ink-500 dark:text-gray-400 text-sm space-y-1">
                <li>• {t("scanner.tip1")}</li>
                <li>• {t("scanner.tip2")}</li>
                <li>• {t("scanner.tip3")}</li>
                <li>• Only crop or plant images will be accepted</li>
              </ul>
            </div>
          </div>
        )}

        {/* PREVIEW */}
        {mode === "preview" && preview && (
          <div className="space-y-4">
            <div className="relative rounded-3xl overflow-hidden border-2 border-terra/30">
              <img src={preview} alt="Plant" className="w-full max-h-80 object-cover" />
              <button onClick={reset} className="absolute top-3 right-3 w-9 h-9 bg-black/60 rounded-full flex items-center justify-center text-white text-sm">✕</button>
            </div>
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4">
                <p className="text-red-700 dark:text-red-400 font-bold text-sm">No plant found</p>
                <p className="text-red-600 dark:text-red-300 text-sm mt-1">{error}</p>
              </div>
            )}
            <button onClick={handleAnalyse} className="w-full bg-terra text-white h-14 rounded-2xl font-bold hover:bg-terra-dark transition-colors shadow-md">
              ◈ Scan This Plant
            </button>
            <button onClick={reset} className="w-full text-ink-500 dark:text-gray-400 h-10 text-sm">
              Try another photo
            </button>
          </div>
        )}

        {/* ANALYSING */}
        {mode === "analysing" && preview && (
          <div className="relative rounded-3xl overflow-hidden">
            <img src={preview} alt="Plant" className="w-full max-h-80 object-cover opacity-50" />
            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center">
              <div className="relative w-20 h-20 mb-4">
                {[80,56,32].map((sz,i) => (
                  <div key={i} style={{
                    position:"absolute", top:"50%", left:"50%",
                    width:sz, height:sz, borderRadius:"50%",
                    border:"1.5px solid #00FF8840",
                    borderTopColor:"#00FF88",
                    transform:"translate(-50%,-50%)",
                    animation:`scanSpin${i} ${1+i*0.4}s linear infinite`,
                  }} />
                ))}
                <style>{`
                  @keyframes scanSpin0{to{transform:translate(-50%,-50%) rotate(360deg);}}
                  @keyframes scanSpin1{to{transform:translate(-50%,-50%) rotate(-360deg);}}
                  @keyframes scanSpin2{to{transform:translate(-50%,-50%) rotate(360deg);}}
                `}</style>
              </div>
              <p className="text-white font-bold" style={{ fontFamily:"'Courier New', monospace", letterSpacing:2 }}>SCANNING PLANT</p>
              <p className="text-gray-400 text-sm mt-1" style={{ fontFamily:"'Courier New', monospace", letterSpacing:1 }}>checking {corrections.length} corrections</p>
            </div>
          </div>
        )}

        {/* RESULT */}
        {mode === "result" && result && (
          <div className="space-y-4">
            {/* Header image */}
            <div className="relative rounded-3xl overflow-hidden">
              <img src={preview} alt="Plant" className="w-full max-h-56 object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-transparent flex items-end p-5">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded font-bold uppercase ${
                      result.is_weed ? "bg-orange-500 text-white" :
                      result.plant_type === "tree" ? "bg-blue-600 text-white" :
                      "bg-terra text-white"
                    }`}>{result.plant_type ?? "plant"}</span>
                    {result.identification_confidence < 70 && (
                      <span className="text-xs px-2 py-0.5 rounded font-bold bg-amber/80 text-black">LOW CONFIDENCE</span>
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
            {result.identification_confidence < 70 && (
              <div className="bg-amber/10 border border-amber/30 rounded-2xl p-4">
                <p className="text-amber font-semibold text-sm mb-1">⚠ {result.identification_confidence}% confidence — verify this result</p>
                <p className="text-ink-500 dark:text-gray-300 text-sm">{result.identification_notes}</p>
              </div>
            )}

            {/* Confidence bar */}
            <div className="bg-white dark:bg-dark-surface rounded-2xl border border-deep-light dark:border-dark-light p-4 shadow-card">
              <div className="flex justify-between mb-2">
                <p className="text-ink-500 dark:text-gray-400 text-sm">Scan confidence</p>
                <p className="text-ink dark:text-white font-bold">{result.confidence}%</p>
              </div>
              <div className="h-2 bg-deep-light dark:bg-dark-light rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-terra transition-all" style={{ width:`${result.confidence}%` }} />
              </div>
            </div>

            {/* Action */}
            {result.immediate_action && !result.is_healthy && (
              <div className={`rounded-2xl p-4 border ${sev}`}>
                <p className="font-bold text-sm mb-1">⚡ Immediate Action</p>
                <p className="text-sm">{result.immediate_action}</p>
              </div>
            )}

            {result.is_healthy && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl p-4 flex items-center gap-3">
                <span className="text-2xl">✅</span>
                <p className="text-green-700 dark:text-green-400 font-semibold">Plant looks healthy. No disease or pest detected.</p>
              </div>
            )}

            {/* Treatment steps */}
            {result.steps?.length > 0 && (
              <div className="bg-white dark:bg-dark-surface rounded-2xl p-5 border border-deep-light dark:border-dark-light shadow-card">
                <p className="text-ink dark:text-white font-bold mb-4">Treatment Steps</p>
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
                <p className="text-ink dark:text-white font-bold mb-3">Recommended Products</p>
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

            {/* ── FEEDBACK SECTION — AI LEARNING ─────────────────── */}
            <div className="bg-white dark:bg-dark-surface rounded-2xl p-5 border border-deep-light dark:border-dark-light shadow-card">
              <p className="text-ink dark:text-white font-bold mb-1">Was this identification correct?</p>
              <p className="text-ink-500 dark:text-gray-400 text-xs mb-4">
                Your feedback trains the AI for all {corrections.length > 0 ? "farmers" : "future scans"}. Corrections are shared across all accounts.
              </p>

              {!feedbackGiven ? (
                <>
                  {!showWrongInput ? (
                    <div className="flex gap-3">
                      <button onClick={() => submitFeedback("correct")}
                        className="flex-1 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800 rounded-xl py-3 text-sm font-bold hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors flex items-center justify-center gap-2"
                      >
                        ✓ Correct
                      </button>
                      <button onClick={() => submitFeedback("wrong")}
                        className="flex-1 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-xl py-3 text-sm font-bold hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors flex items-center justify-center gap-2"
                      >
                        ✗ Wrong ID
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-ink-500 dark:text-gray-400 text-sm">What plant is it actually? (optional but helpful)</p>
                      <input
                        value={wrongCropInput}
                        onChange={e => setWrongCropInput(e.target.value)}
                        placeholder="e.g. Neem / Dongoyaro, Siam weed, Ewedu..."
                        className="w-full bg-deep-mid dark:bg-dark-mid rounded-xl px-4 h-11 text-ink dark:text-white border border-deep-light dark:border-dark-light focus:border-terra outline-none text-sm"
                      />
                      <div className="flex gap-2">
                        <button onClick={() => setShowWrongInput(false)}
                          className="flex-1 bg-deep-light dark:bg-dark-light text-ink-500 dark:text-gray-400 rounded-xl py-2.5 text-sm font-semibold">
                          Cancel
                        </button>
                        <button onClick={submitWrongFeedback}
                          className="flex-1 bg-terra text-white rounded-xl py-2.5 text-sm font-bold hover:bg-terra-dark transition-colors">
                          Submit Correction
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-center gap-3 py-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                    feedbackVerdict === "correct" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                  }`}>
                    {feedbackVerdict === "correct" ? "✓" : "✗"}
                  </div>
                  <div>
                    <p className="text-ink dark:text-white font-semibold text-sm">
                      {feedbackVerdict === "correct" ? "Marked as correct" : "Correction submitted"}
                    </p>
                    <p className="text-ink-500 dark:text-gray-400 text-xs">
                      {feedbackVerdict === "wrong"
                        ? "The AI will avoid this mistake for all future scans."
                        : "This helps confirm the AI's accuracy."}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <button onClick={reset} className="w-full bg-terra text-white h-14 rounded-2xl font-bold hover:bg-terra-dark transition-colors shadow-md">
              Scan Another Plant
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
}
