import { useState, useRef, useEffect } from "react";
import Layout from "@/components/Layout";
import { supabase } from "@/lib/supabase";
import { getSoilAnalysis } from "@/lib/api";
import { useFarmerLanguage } from "@/hooks/useFarmerLanguage";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import SoilParameterStatus from "@/components/SoilParameterStatus";
import ShareReportButton from "@/components/ShareReportButton"; 

// ── Soil image analysis via Groq vision ──────────────────────────────
async function analyseSoilImage(base64Image, region, lang) {
  const GROQ_KEY = import.meta.env.VITE_GROQ_KEY;
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type":"application/json", "Authorization":`Bearer ${GROQ_KEY}` },
    body: JSON.stringify({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      max_tokens: 600,
      messages: [
        {
          role: "system",
          content: `You are TerraIQ+, a soil scientist for Nigerian farmers.
Analyse this soil image and estimate soil properties based on colour, texture, and appearance.
Respond ONLY with valid JSON. No markdown. No backticks.
{
  "soil_color": "dark brown / red / light sandy / grey",
  "texture_estimate": "clay / loamy / sandy",
  "estimated_ph_range": "6.0-6.5",
  "nitrogen_level": "low / moderate / high",
  "drainage": "poor / moderate / good",
  "organic_matter": "low / moderate / high",
  "confidence": 65,
  "notes": "brief observation in the farmer's language",
  "estimated_values": {
    "nitrogen": 25,
    "phosphorus": 20,
    "potassium": 25,
    "ph": 6.2,
    "moisture": 45,
    "temperature": 28
  }
}
All text values should be in the farmer's language.`,
        },
        {
          role: "user",
          content: [
            { type:"image_url", image_url:{ url:`data:image/jpeg;base64,${base64Image}` } },
            { type:"text", text:`Analyse this soil sample from ${region}, Nigeria. Farmer language: ${lang}.` },
          ],
        },
      ],
    }),
  });
  if (!res.ok) throw new Error("Soil image analysis failed");
  const data = await res.json();
  const raw  = data.choices[0].message.content;
  try { return JSON.parse(raw.replace(/```json|```/g,"").trim()); }
  catch { return null; }
}

// ── Symptom questions ─────────────────────────────────────────────────
const QUESTIONS = [
  {
    id: "plant_look",
    question: "How do your crops look right now?",
    options: [
      { label:"Yellow or pale leaves",       value:"yellow_leaves",   n:-15, p:-5,  k:0,  ph:-0.5 },
      { label:"Stunted or slow growth",       value:"stunted",         n:-20, p:-10, k:-5, ph:0    },
      { label:"Purple or reddish leaves",     value:"purple_leaves",   n:0,   p:-15, k:0,  ph:0    },
      { label:"Brown leaf edges and tips",    value:"brown_edges",     n:0,   p:0,   k:-15,ph:0    },
      { label:"Healthy and growing well",     value:"healthy",         n:0,   p:0,   k:0,  ph:0    },
    ],
  },
  {
    id: "soil_color",
    question: "What colour is your soil?",
    options: [
      { label:"Very dark brown or black",     value:"dark",   n:15,  p:10, k:10, ph:0.3  },
      { label:"Medium brown",                 value:"medium", n:5,   p:5,  k:5,  ph:0    },
      { label:"Light brown or yellowish",     value:"light",  n:-10, p:-5, k:-5, ph:-0.3 },
      { label:"Reddish brown",                value:"red",    n:0,   p:-5, k:5,  ph:-0.5 },
      { label:"Sandy or whitish",             value:"sandy",  n:-15, p:-10,k:-10,ph:-0.5 },
    ],
  },
  {
    id: "water_drainage",
    question: "What happens after it rains heavily?",
    options: [
      { label:"Water stays for hours (waterlogged)", value:"waterlogged", n:5,   p:0,  k:0,  ph:-0.5, moisture:75 },
      { label:"Drains in about an hour",             value:"moderate",    n:0,   p:0,  k:0,  ph:0,    moisture:55 },
      { label:"Drains very quickly, stays dry",      value:"fast",        n:-10, p:-5, k:-5, ph:0,    moisture:30 },
    ],
  },
  {
    id: "previous_crops",
    question: "What did you last grow on this land?",
    options: [
      { label:"Legumes (beans, groundnut, soybean)",  value:"legumes",   n:15, p:5,  k:0, ph:0   },
      { label:"Maize or sorghum",                     value:"cereal",    n:-10,p:0,  k:-5,ph:0   },
      { label:"Cassava or yam",                       value:"roots",     n:-5, p:-5, k:-10,ph:0  },
      { label:"Nothing (fallow land)",                value:"fallow",    n:10, p:5,  k:5, ph:0.2 },
      { label:"Don't know",                           value:"unknown",   n:0,  p:0,  k:0, ph:0   },
    ],
  },
  {
    id: "fertilizer_history",
    question: "When did you last apply fertilizer or compost?",
    options: [
      { label:"This season",             value:"recent",    n:15, p:10, k:10, ph:0   },
      { label:"Last season",             value:"last",      n:5,  p:5,  k:5,  ph:0   },
      { label:"More than 2 seasons ago", value:"long_ago",  n:-10,p:-5, k:-5, ph:0   },
      { label:"Never",                   value:"never",     n:-20,p:-15,k:-10,ph:-0.3 },
    ],
  },
];

const RATING_COLOR = {
  poor:"text-red-600", fair:"text-yellow-600",
  good:"text-terra",   excellent:"text-green-600"
};

export default function SmartSoilPage() {
  const { t }  = useTranslation();
  const lang   = useFarmerLanguage();
  const fileRef = useRef(null);

  // ── All state at top level — never inside conditionals ──────────────
  const [mode,        setMode]        = useState("choose");
  const [answers,     setAnswers]     = useState({});
  const [question,    setQuestion]    = useState(0);
  const [imageB64,    setImageB64]    = useState(null);
  const [imgPreview,  setImgPreview]  = useState(null);
  const [imgAnalysis, setImgAnalysis] = useState(null);
  const [result,      setResult]      = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [region,      setRegion]      = useState("");
  const [crop,        setCrop]        = useState("");

  // Manual form state — must be at top level
  const [manualForm, setManualForm] = useState({
    organic_carbon:"", nitrogen:"", phosphorus:"",
    potassium:"", ph:"", moisture:"", temperature:""
  });

  // ── Load farmer region ──────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const { data: { session: _sess } } = await supabase.auth.getSession();
      const user = _sess?.user;
      if (user) {
        const { data } = await supabase.from("profiles").select("region").eq("id", user.id).single();
        if (data?.region) setRegion(data.region);
      }
    })();
  }, []);

  // ── Helpers ─────────────────────────────────────────────────────────
  const saveTest = async (values, analysis) => {
    const { data: { session: _sess } } = await supabase.auth.getSession();
      const user = _sess?.user;
    if (user) {
      await supabase.from("soil_tests").insert({
        user_id:  user.id,
        ...values,
        weed_risk: analysis.weed_risk,
        rating:    analysis.rating,
        analysis:  JSON.stringify(analysis),
      });
    }
  };

  const reset = () => {
    setMode("choose"); setAnswers({}); setQuestion(0);
    setResult(null); setImageB64(null); setImgPreview(null);
    setImgAnalysis(null);
    setManualForm({ organic_carbon:"", nitrogen:"", phosphorus:"", potassium:"", ph:"", moisture:"", temperature:"" });
  };

  // ── Image handlers ───────────────────────────────────────────────────
  const handleSoilImage = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImgPreview(ev.target.result);
      setImageB64(ev.target.result.split(",")[1]);
    };
    reader.readAsDataURL(file);
  };

  const analyseImage = async () => {
    if (!imageB64) return;
    setLoading(true);
    const tid = toast.loading(t("common.analysingSoilImage"));
    try {
      const analysis = await analyseSoilImage(imageB64, region || "Nigeria", lang);
      if (!analysis) throw new Error("Could not read soil image");
      setImgAnalysis(analysis);
      const fullResult = await getSoilAnalysis({
        ...analysis.estimated_values,
        region: region || "Nigeria",
        crop:   crop || undefined,
        lang,
      });
      setResult({ ...fullResult, soil_image_analysis: analysis });
      await saveTest(analysis.estimated_values, fullResult);
      toast.dismiss(tid);
      toast.success(`${t("soil.ratingToast")} ${fullResult.rating?.toUpperCase()}`);
      setMode("result");
    } catch(e) { toast.dismiss(tid); toast.error(e.message); }
    setLoading(false);
  };

  // ── Questionnaire handlers ───────────────────────────────────────────
  const handleAnswer = (answer) => {
    const updated = { ...answers, [QUESTIONS[question].id]: answer };
    setAnswers(updated);
    if (question < QUESTIONS.length - 1) {
      setQuestion(q => q + 1);
    } else {
      runQuestionnaireAnalysis(updated);
    }
  };

  const runQuestionnaireAnalysis = async (finalAnswers) => {
    setLoading(true);
    const tid = toast.loading(t("common.analysingFarmConditions"));
    try {
      let n=30, p=25, k=25, ph=6.5, moisture=50;
      Object.values(finalAnswers).forEach(ans => {
        const q   = QUESTIONS.find(q => q.options.some(o => o.value === ans));
        const opt = q?.options.find(o => o.value === ans);
        if (opt) {
          n += opt.n; p += opt.p; k += opt.k; ph += opt.ph;
          if (opt.moisture) moisture = opt.moisture;
        }
      });
      n  = Math.max(5,  Math.min(60, n));
      p  = Math.max(5,  Math.min(50, p));
      k  = Math.max(5,  Math.min(55, k));
      ph = Math.max(4.5,Math.min(8.5, Math.round(ph * 10) / 10));

      const fullResult = await getSoilAnalysis({
        nitrogen:n, phosphorus:p, potassium:k, ph, moisture,
        temperature:28, region:region||"Nigeria",
        crop:crop||undefined, lang,
      });
      setResult(fullResult);
      await saveTest({ nitrogen:n, phosphorus:p, potassium:k, ph, moisture, temperature:28 }, fullResult);
      toast.dismiss(tid);
      toast.success(`${t("soil.ratingToast")} ${fullResult.rating?.toUpperCase()}`);
      setMode("result");
    } catch(e) { toast.dismiss(tid); toast.error(e.message); }
    setLoading(false);
  };

  // ── Manual analysis ──────────────────────────────────────────────────
  const setF = (k) => (e) => setManualForm(p => ({...p, [k]: e.target.value}));

  const runManual = async () => {
    if (!manualForm.nitrogen && !manualForm.organic_carbon) {
      toast.error(t("common.enterAtLeastNitrogen"));
      return;
    }
    setLoading(true);
    const tid = toast.loading(t("soil.analysingToast"));
    try {
      const n = +manualForm.nitrogen || (+manualForm.organic_carbon * 14) || 25;
      const p = +manualForm.phosphorus || 20;
      const k = +manualForm.potassium  || 25;
      const data = await getSoilAnalysis({
        nitrogen:n, phosphorus:p, potassium:k,
        ph:          +manualForm.ph          || 6.5,
        moisture:    +manualForm.moisture    || 50,
        temperature: +manualForm.temperature || 28,
        organic_carbon: +manualForm.organic_carbon || 0,
        region: region || "Nigeria",
        crop:   crop   || undefined,
        lang,
      });
      setResult(data);
      await saveTest({
        nitrogen:n, phosphorus:p, potassium:k,
        ph:          +manualForm.ph          || 6.5,
        moisture:    +manualForm.moisture    || 50,
        temperature: +manualForm.temperature || 28,
      }, data);
      toast.dismiss(tid);
      toast.success(`${t("soil.ratingToast")} ${data.rating?.toUpperCase()}`);
      setMode("result");
    } catch(e) { toast.dismiss(tid); toast.error(e.message); }
    setLoading(false);
  };

  // ── Shared styles ────────────────────────────────────────────────────
  const iClass = "w-full bg-white dark:bg-dark-mid rounded-xl px-3 h-11 text-ink dark:text-white border border-deep-light dark:border-dark-light focus:border-terra outline-none text-sm shadow-sm";

  // ════════════════════════════════════════════════════════════════════
  // CHOOSE MODE
  // ════════════════════════════════════════════════════════════════════
  if (mode === "choose") return (
    <Layout>
      <h1 className="text-ink dark:text-white text-3xl font-black mb-2">{t("soil.title")}</h1>
      <p className="text-ink-500 dark:text-gray-400 mb-6">No soil test kit needed. Choose how you want to analyse your soil.</p>

      <div className="bg-white dark:bg-dark-surface rounded-2xl border border-deep-light dark:border-dark-light p-5 mb-5 shadow-card">
        <label className="text-ink-500 dark:text-gray-400 text-sm mb-1.5 block">Target crop (optional)</label>
        <input value={crop} onChange={e => setCrop(e.target.value)} placeholder="e.g. Maize, Cassava, Tomato"
          className="w-full bg-deep-mid dark:bg-dark-mid rounded-xl px-4 h-11 text-ink dark:text-white border border-deep-light dark:border-dark-light focus:border-terra outline-none text-sm" />
      </div>

      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <button onClick={() => setMode("image")}
          className="bg-white dark:bg-dark-surface rounded-2xl border-2 border-deep-light dark:border-dark-light p-6 text-left hover:border-terra transition-all shadow-card group"
        >
          <div className="w-10 h-10 rounded-xl bg-terra-light dark:bg-terra/20 flex items-center justify-center mb-3 text-terra font-black">◈</div>
          <h3 className="text-ink dark:text-white font-bold mb-2">Take a Soil Photo</h3>
          <p className="text-ink-500 dark:text-gray-400 text-sm">Snap your soil and AI estimates properties from colour and texture.</p>
          <p className="text-terra text-xs font-semibold mt-3 group-hover:underline">Fastest option →</p>
        </button>

        <button onClick={() => setMode("questionnaire")}
          className="bg-white dark:bg-dark-surface rounded-2xl border-2 border-deep-light dark:border-dark-light p-6 text-left hover:border-terra transition-all shadow-card group"
        >
          <div className="w-10 h-10 rounded-xl bg-terra-light dark:bg-terra/20 flex items-center justify-center mb-3 text-terra font-black">◧</div>
          <h3 className="text-ink dark:text-white font-bold mb-2">Answer 5 Questions</h3>
          <p className="text-ink-500 dark:text-gray-400 text-sm">Tell us what you see on your farm. AI maps your answers to soil conditions.</p>
          <p className="text-terra text-xs font-semibold mt-3 group-hover:underline">No equipment needed →</p>
        </button>

        <button onClick={() => setMode("manual")}
          className="bg-white dark:bg-dark-surface rounded-2xl border-2 border-deep-light dark:border-dark-light p-6 text-left hover:border-terra transition-all shadow-card group"
        >
          <div className="w-10 h-10 rounded-xl bg-terra-light dark:bg-terra/20 flex items-center justify-center mb-3 text-terra font-black">▦</div>
          <h3 className="text-ink dark:text-white font-bold mb-2">Enter Lab Values</h3>
          <p className="text-ink-500 dark:text-gray-400 text-sm">Have NPK, Organic Carbon, or pH readings? Enter them for the most precise analysis.</p>
          <p className="text-terra text-xs font-semibold mt-3 group-hover:underline">Most accurate →</p>
        </button>
      </div>

      <div className="bg-amber/5 dark:bg-amber/10 rounded-2xl border border-amber/20 p-5 flex gap-4 items-start">
        <div className="w-12 h-12 rounded-xl bg-amber/20 flex items-center justify-center shrink-0 text-xl font-black text-amber">A</div>
        <div className="flex-1">
          <p className="text-ink dark:text-white font-bold mb-1">Get a Professional Soil Test</p>
          <p className="text-ink-500 dark:text-gray-400 text-sm mb-3">Allamanda Innovations offers affordable soil testing kits and on-site soil analysis services across Nigeria. Get precise NPK and pH readings for the most accurate recommendations.</p>
          <div className="flex flex-wrap gap-2">
            <span className="bg-amber/20 text-amber text-xs px-3 py-1.5 rounded-lg font-semibold">Allamanda Compost</span>
            <span className="bg-amber/20 text-amber text-xs px-3 py-1.5 rounded-lg font-semibold">Allamanda Biochar</span>
            <span className="bg-amber/20 text-amber text-xs px-3 py-1.5 rounded-lg font-semibold">Allamanda Soil Supplement</span>
          </div>
          <p className="text-ink-500 dark:text-gray-500 text-xs mt-2">Contact Allamanda Innovations through their agro-dealer network across Nigeria</p>
        </div>
      </div>
    </Layout>
  );

  // ════════════════════════════════════════════════════════════════════
  // IMAGE MODE
  // ════════════════════════════════════════════════════════════════════
  if (mode === "image") return (
    <Layout>
      <button onClick={reset} className="flex items-center gap-2 text-terra text-sm font-semibold mb-6 hover:underline">← Back</button>
      <h1 className="text-ink dark:text-white text-2xl font-black mb-2">Soil Photo Analysis</h1>
      <p className="text-ink-500 dark:text-gray-400 mb-6">Take a clear photo of your soil in good natural lighting.</p>

      <div className="bg-white dark:bg-dark-surface rounded-2xl border border-deep-light dark:border-dark-light p-6 mb-5 shadow-card space-y-4">
        <div onClick={() => fileRef.current.click()}
          className="border-2 border-dashed border-deep-light dark:border-dark-light rounded-2xl h-52 flex flex-col items-center justify-center cursor-pointer hover:border-terra transition-colors overflow-hidden"
        >
          {imgPreview ? (
            <img src={imgPreview} alt="Soil" className="w-full h-full object-cover" />
          ) : (
            <>
              <div className="w-14 h-14 rounded-2xl bg-terra-light dark:bg-terra/20 flex items-center justify-center mb-3 text-2xl text-terra">◈</div>
              <p className="text-ink-500 dark:text-gray-400 font-medium">Tap to upload soil photo</p>
              <p className="text-ink-500 dark:text-gray-500 text-sm mt-1">Take a close-up of your soil</p>
            </>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" onChange={handleSoilImage} className="hidden" />
        {imgPreview && (
         <button onClick={analyseImage} disabled={loading}
          className="w-full bg-terra text-white h-12 rounded-xl font-bold hover:bg-terra-dark disabled:opacity-50 transition-colors shadow-sm"
        >
          {loading ? t("soil.analysing") : t("soil.analyse")}
        </button>
        )}
      </div>

      {imgAnalysis && !result && (
        <div className="bg-white dark:bg-dark-surface rounded-2xl border border-deep-light dark:border-dark-light p-5 shadow-card space-y-2">
          <p className="text-terra font-semibold">Initial Observations</p>
          <p className="text-ink-500 dark:text-gray-300 text-sm">{imgAnalysis.notes}</p>
          <div className="grid grid-cols-2 gap-3 mt-3">
            {[["Colour",imgAnalysis.soil_color],["Texture",imgAnalysis.texture_estimate],["Drainage",imgAnalysis.drainage],["Organic matter",imgAnalysis.organic_matter]].map(([l,v]) => (
              <div key={l} className="bg-deep-mid dark:bg-dark-mid rounded-xl p-3">
                <p className="text-ink-500 dark:text-gray-500 text-xs">{l}</p>
                <p className="text-ink dark:text-white text-sm font-semibold capitalize">{v}</p>
              </div>
            ))}
          </div>
          <p className="text-ink-500 dark:text-gray-500 text-xs pt-2">Confidence: {imgAnalysis.confidence}% — Based on visual analysis</p>
        </div>
      )}
    </Layout>
  );

  // ════════════════════════════════════════════════════════════════════
  // QUESTIONNAIRE MODE
  // ════════════════════════════════════════════════════════════════════
  if (mode === "questionnaire") {
    const q        = QUESTIONS[question];
    const progress = (question / QUESTIONS.length) * 100;
    return (
      <Layout>
        <button onClick={reset} className="flex items-center gap-2 text-terra text-sm font-semibold mb-6 hover:underline">← Back</button>
        <h1 className="text-ink dark:text-white text-2xl font-black mb-2">Farm Assessment</h1>
        <div className="h-2 bg-deep-light dark:bg-dark-light rounded-full mb-3 overflow-hidden">
          <div className="h-full bg-terra rounded-full transition-all duration-500" style={{ width:`${progress}%` }} />
        </div>
        <p className="text-ink-500 dark:text-gray-400 text-sm mb-6">Question {question+1} of {QUESTIONS.length}</p>
        <div className="bg-white dark:bg-dark-surface rounded-2xl border border-deep-light dark:border-dark-light p-6 shadow-card">
          <h2 className="text-ink dark:text-white text-xl font-bold mb-5">{q.question}</h2>
          <div className="space-y-3">
            {q.options.map(opt => (
              <button key={opt.value} onClick={() => handleAnswer(opt.value)}
                className="w-full text-left bg-deep-mid dark:bg-dark-mid hover:bg-terra-light dark:hover:bg-terra/10 hover:border-terra border border-deep-light dark:border-dark-light rounded-xl p-4 text-ink dark:text-white text-sm font-medium transition-all"
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  // ════════════════════════════════════════════════════════════════════
  // MANUAL MODE
  // ════════════════════════════════════════════════════════════════════
  if (mode === "manual") return (
    <Layout>
      <button onClick={reset} className="flex items-center gap-2 text-terra text-sm font-semibold mb-6 hover:underline">← Back</button>
      <h1 className="text-ink dark:text-white text-2xl font-black mb-1">Enter Lab Values</h1>
      <p className="text-ink-500 dark:text-gray-400 mb-6 text-sm">
        Enter the values from your soil test kit or laboratory report.
      </p>

      <div className="bg-white dark:bg-dark-surface rounded-2xl border border-deep-light dark:border-dark-light p-6 shadow-card space-y-5">

        {/* Primary lab values */}
        <div>
          <p className="text-ink dark:text-white font-semibold text-sm mb-3 uppercase tracking-wide">Primary Lab Results</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-ink-500 dark:text-gray-400 text-xs mb-1.5 block">Organic Carbon (%)</label>
              <input type="number" step="0.01" value={manualForm.organic_carbon} onChange={setF("organic_carbon")} placeholder="e.g. 1.8" className={iClass} />
              <p className="text-ink-500 dark:text-gray-500 text-xs mt-1">From lab report — typical range 0.5–3.0%</p>
            </div>
            <div>
              <label className="text-ink-500 dark:text-gray-400 text-xs mb-1.5 block">Total Nitrogen (%)</label>
              <input type="number" step="0.001" value={manualForm.nitrogen} onChange={setF("nitrogen")} placeholder="e.g. 0.15" className={iClass} />
              <p className="text-ink-500 dark:text-gray-500 text-xs mt-1">Typical range 0.05–0.5%</p>
            </div>
            <div>
              <label className="text-ink-500 dark:text-gray-400 text-xs mb-1.5 block">Available Phosphorus (mg/kg)</label>
              <input type="number" value={manualForm.phosphorus} onChange={setF("phosphorus")} placeholder="e.g. 18" className={iClass} />
              <p className="text-ink-500 dark:text-gray-500 text-xs mt-1">Typical range 5–50 mg/kg</p>
            </div>
          </div>
        </div>

        {/* Additional values */}
        <div className="border-t border-deep-light dark:border-dark-light pt-4">
          <p className="text-ink dark:text-white font-semibold text-sm mb-3 uppercase tracking-wide">Additional Values (optional)</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="text-ink-500 dark:text-gray-400 text-xs mb-1.5 block">Potassium (mg/kg)</label>
              <input type="number" value={manualForm.potassium} onChange={setF("potassium")} placeholder="e.g. 120" className={iClass} />
            </div>
            <div>
              <label className="text-ink-500 dark:text-gray-400 text-xs mb-1.5 block">pH Level</label>
              <input type="number" step="0.1" value={manualForm.ph} onChange={setF("ph")} placeholder="e.g. 6.2" className={iClass} />
            </div>
            <div>
              <label className="text-ink-500 dark:text-gray-400 text-xs mb-1.5 block">Moisture (%)</label>
              <input type="number" value={manualForm.moisture} onChange={setF("moisture")} placeholder="e.g. 45" className={iClass} />
            </div>
            <div>
              <label className="text-ink-500 dark:text-gray-400 text-xs mb-1.5 block">Temperature (°C)</label>
              <input type="number" value={manualForm.temperature} onChange={setF("temperature")} placeholder="e.g. 28" className={iClass} />
            </div>
          </div>
        </div>

        {/* Allamanda note */}
        <div className="bg-amber/5 dark:bg-amber/10 rounded-xl border border-amber/20 p-4 flex gap-3 items-start">
          <div className="w-7 h-7 rounded-lg bg-amber/20 flex items-center justify-center shrink-0 text-amber font-black text-sm">A</div>
          <p className="text-ink-500 dark:text-gray-400 text-sm">
            Don't have lab values? Allamanda Innovations offers affordable soil testing services across Nigeria that give you all these readings.
          </p>
        </div>

        <button onClick={runManual} disabled={loading}
          className="w-full bg-terra text-white h-12 rounded-xl font-bold hover:bg-terra-dark disabled:opacity-50 transition-colors shadow-sm"
        >
          {loading ? "Analysing..." : "Analyse Soil"}
        </button>
      </div>
    </Layout>
  );

  // ════════════════════════════════════════════════════════════════════
  // RESULT MODE
  // ════════════════════════════════════════════════════════════════════
  if (mode === "result" && result) return (
    <Layout>
      <button onClick={reset} className="flex items-center gap-2 text-terra text-sm font-semibold mb-6 hover:underline">← New Analysis</button>
      <h1 className="text-ink dark:text-white text-2xl font-black mb-5">Soil Analysis Results</h1>
      
      <div className="space-y-4">
        <div className="bg-white dark:bg-dark-surface rounded-2xl border border-deep-light dark:border-dark-light p-6 shadow-card">
          <div className="flex justify-between mb-2">
            <h3 className="text-ink dark:text-white font-bold text-lg">Soil Health Rating</h3>
            <span className={`font-black text-xl uppercase ${RATING_COLOR[result.rating] ?? "text-terra"}`}>{result.rating}</span>
          </div>
          <p className="text-ink-500 dark:text-gray-300 text-sm">{result.summary}</p>
          <div className="flex flex-wrap gap-2 mt-4">
            {result.best_crops?.map(c => (
              <span key={c} className="bg-terra-light dark:bg-terra/20 text-terra text-sm px-3 py-1 rounded-lg font-semibold">{c}</span>
            ))}
          </div>
        </div>
        
        <SoilParameterStatus classifications={result.classifications} />

        {result.fertilizer_recommendation && (
          <div className="bg-white dark:bg-dark-surface rounded-2xl border border-deep-light dark:border-dark-light p-6 shadow-card space-y-4">
            <h3 className="text-ink dark:text-white font-bold text-lg">Recommendations</h3>
            {[
              { key:"compost",     icon:"🌿", label:"Allamanda Compost",        color:"border-terra/30",  text:"text-terra"  },
              { key:"biochar",     icon:"🔥", label:"Allamanda Biochar",         color:"border-amber/20",  text:"text-amber"  },
              { key:"supplements", icon:"+",  label:"Allamanda Soil Supplement", color:"border-danger/20", text:"text-danger" },
              { key:"synthetic",   icon:"⚗",  label:"Synthetic Fertilizer",      color:"border-sky/20",    text:"text-sky"    },
            ].map(({ key, icon, label, color, text }) => {
              const item = result.fertilizer_recommendation[key];
              if (!item) return null;
              return (
                <div key={key} className={`bg-deep-mid dark:bg-dark-mid rounded-2xl p-4 border ${color}`}>
                  <p className={`${text} font-semibold text-sm mb-2`}>{icon} {item.name ?? label}</p>
                  <p className="text-ink-500 dark:text-gray-400 text-sm">{item.description ?? item.benefit ?? ""}</p>
                  {item.rate && <p className="text-ink-400 dark:text-gray-300 text-xs mt-2">Rate: {item.rate}</p>}
                </div>
              );
            })}
          </div>
        )}

        {result.improvement_steps?.length > 0 && (
          <div className="bg-white dark:bg-dark-surface rounded-2xl p-5 border border-deep-light dark:border-dark-light shadow-card">
            <p className="text-ink dark:text-white font-bold mb-3">Improvement Steps</p>
            <ol className="space-y-2">
              {result.improvement_steps.map((s,i) => (
                <li key={i} className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-terra text-white text-xs font-black flex items-center justify-center shrink-0">{i+1}</div>
                  <p className="text-ink-500 dark:text-gray-300 text-sm">{s}</p>
                </li>
              ))}
            </ol>
          </div>
        )}

        {result.season_advice && (
          <div className="bg-white dark:bg-dark-surface rounded-2xl p-4 border border-deep-light dark:border-dark-light shadow-card">
            <p className="text-ink dark:text-white font-semibold text-sm mb-1">Season Advice</p>
            <p className="text-ink-500 dark:text-gray-400 text-sm">{result.season_advice}</p>
          </div>
        )}


        <ShareReportButton
          type="soil"
          result={result}
          params={manualForm}
          farmerName={undefined}
          location={region}
        />
        <div className="bg-amber/5 dark:bg-amber/10 rounded-2xl border border-amber/20 p-5">
          <p className="text-ink dark:text-white font-bold mb-1">Get even better results</p>
          <p className="text-ink-500 dark:text-gray-400 text-sm">Contact Allamanda Innovations for a professional soil test kit and their full product range — Compost, Biochar, and Soil Supplement — available through agro-dealers across Nigeria.</p>
        </div>
      </div>
    </Layout>
  );

  return null;
}