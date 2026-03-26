import { useState, useEffect, useRef } from "react";
import Layout from "@/components/Layout";
import CameraScanner from "@/components/CameraScanner";
import { supabase } from "@/lib/supabase";
import { analyseImageWithGroq } from "@/lib/api";
import { useFarmerLanguage } from "@/hooks/useFarmerLanguage";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";

const SEV = {
  low:      { bg:"bg-green-50 dark:bg-green-900/20",  border:"border-green-200 dark:border-green-800",  text:"text-green-700 dark:text-green-400"  },
  moderate: { bg:"bg-yellow-50 dark:bg-yellow-900/20",border:"border-yellow-200 dark:border-yellow-800",text:"text-yellow-700 dark:text-yellow-400" },
  high:     { bg:"bg-orange-50 dark:bg-orange-900/20",border:"border-orange-200 dark:border-orange-800",text:"text-orange-700 dark:text-orange-400" },
  critical: { bg:"bg-red-50 dark:bg-red-900/20",      border:"border-red-200 dark:border-red-800",      text:"text-red-700 dark:text-red-400"      },
};

export default function ScannerPage() {
  const { t }   = useTranslation();
  const lang    = useFarmerLanguage();   // ← farmer's language
  const fileRef = useRef(null);

  const [mode,    setMode]    = useState("idle");
  const [preview, setPreview] = useState(null);
  const [base64,  setBase64]  = useState(null);
  const [result,  setResult]  = useState(null);
  const [error,   setError]   = useState(null);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from("profiles").select("region,full_name").eq("id", user.id).single();
        setProfile(data);
      }
    })();
  }, []);

  const handleCapture = (b64, previewUrl) => {
    setBase64(b64); setPreview(previewUrl); setError(null); setMode("preview");
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setPreview(ev.target.result);
      setBase64(ev.target.result.split(",")[1]);
      setError(null);
      setMode("preview");
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyse = async () => {
    if (!base64) return;
    setMode("analysing");
    setError(null);
    const tid = toast.loading("Analysing your crop...");
    try {
      const region = profile?.region ?? "Nigeria";
      // Pass lang — AI responds in farmer's language
      const parsed = await analyseImageWithGroq(base64, region, lang);

      if (parsed.not_a_plant) {
        toast.dismiss(tid);
        toast.error("Not a crop image");
        setError(parsed.message ?? "Please upload a photo of a crop or plant.");
        setMode("preview");
        return;
      }

      setResult(parsed);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("scans").insert({
          user_id:        user.id,
          crop:           parsed.crop_identified ?? "Unknown",
          scan_type:      parsed.weed_detected ? "weed" : "disease",
          result:         parsed.diagnosis,
          confidence:     parsed.confidence,
          severity:       parsed.severity,
          treatment_plan: JSON.stringify(parsed),
          created_at:     new Date().toISOString(),
        });
      }
      toast.dismiss(tid);
      toast.success(parsed.is_healthy ? "Crop looks healthy! ✓" : `Detected: ${parsed.diagnosis}`);
      setMode("result");
    } catch (e) {
      toast.dismiss(tid);
      toast.error(e.message);
      setMode("preview");
    }
  };

  const reset = () => { setMode("idle"); setPreview(null); setBase64(null); setResult(null); setError(null); };
  if (mode === "camera") return <CameraScanner onCapture={handleCapture} onClose={() => setMode("idle")} />;

  const sev = result ? (SEV[result.severity] ?? SEV.low) : null;

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-ink dark:text-white text-3xl font-black mb-1">{t("scanner.title")}</h1>
        <p className="text-ink-500 dark:text-gray-400 mb-8">{t("scanner.subtitle")}</p>

        {mode === "idle" && (
          <div className="space-y-4">
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

        {mode === "preview" && preview && (
          <div className="space-y-4">
            <div className="relative rounded-3xl overflow-hidden border-2 border-terra/40">
              <img src={preview} alt="Crop" className="w-full max-h-80 object-cover" />
              <button onClick={reset} className="absolute top-3 right-3 w-9 h-9 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-black/80">✕</button>
            </div>
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4 flex gap-3 items-start">
                <span className="text-2xl shrink-0">🚫</span>
                <div>
                  <p className="text-red-700 dark:text-red-400 font-bold text-sm">Not a crop image</p>
                  <p className="text-red-600 dark:text-red-300 text-sm mt-0.5">{error}</p>
                </div>
              </div>
            )}
            <button onClick={handleAnalyse} className="w-full bg-terra text-white h-14 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-terra-dark transition-colors shadow-md">
              🔍 {t("scanner.analyse")}
            </button>
            <button onClick={reset} className="w-full bg-white dark:bg-dark-surface border border-deep-light dark:border-dark-light text-ink-500 h-12 rounded-2xl font-medium hover:text-ink dark:hover:text-white transition-colors">
              {t("scanner.retake")}
            </button>
          </div>
        )}

        {mode === "analysing" && (
          <div className="space-y-4">
            <div className="relative rounded-3xl overflow-hidden border-2 border-terra/20">
              <img src={preview} alt="Crop" className="w-full max-h-80 object-cover opacity-60" />
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50">
                <div className="w-16 h-16 border-2 border-terra border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-white font-semibold">{t("scanner.analysing")}</p>
              </div>
            </div>
          </div>
        )}

        {mode === "result" && result && (
          <div className="space-y-4">
            <div className="relative rounded-3xl overflow-hidden">
              <img src={preview} alt="Crop" className="w-full max-h-56 object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-5">
                <div className="flex-1">
                  <p className="text-gray-300 text-sm">{result.crop_identified}</p>
                  <h2 className="text-white text-xl font-black">{result.diagnosis}</h2>
                </div>
                {!result.is_healthy && sev && (
                  <div className={`px-3 py-1.5 rounded-xl text-sm font-bold capitalize border ${sev.bg} ${sev.text} ${sev.border}`}>{result.severity}</div>
                )}
              </div>
            </div>

            {result.is_healthy && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl p-4 flex items-center gap-3">
                <span className="text-3xl">✅</span>
                <div>
                  <p className="text-green-700 dark:text-green-400 font-bold">{t("scanner.healthy")}</p>
                  <p className="text-ink-500 dark:text-gray-400 text-sm">{t("scanner.noIssues")}</p>
                </div>
              </div>
            )}

            <div className="bg-white dark:bg-dark-surface rounded-2xl border border-deep-light dark:border-dark-light p-4 shadow-card">
              <div className="flex justify-between mb-2">
                <p className="text-ink-500 dark:text-gray-400 text-sm">{t("scanner.confidence")}</p>
                <p className="text-ink dark:text-white font-bold">{result.confidence}%</p>
              </div>
              <div className="h-2 bg-deep-light dark:bg-dark-light rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-terra" style={{ width:`${result.confidence}%` }} />
              </div>
            </div>

            {!result.is_healthy && result.immediate_action && sev && (
              <div className={`rounded-2xl p-4 border ${sev.bg} ${sev.border}`}>
                <p className={`font-bold text-sm mb-1 ${sev.text}`}>⚡ {t("scanner.actNow")}</p>
                <p className="text-ink dark:text-white text-sm">{result.immediate_action}</p>
              </div>
            )}

            {result.steps?.length > 0 && (
              <div className="bg-white dark:bg-dark-surface rounded-2xl p-5 border border-deep-light dark:border-dark-light shadow-card">
                <p className="text-ink dark:text-white font-bold mb-4">{t("scanner.steps")}</p>
                <ol className="space-y-3">
                  {result.steps.map((step, i) => (
                    <li key={i} className="flex gap-3">
                      <div className="w-6 h-6 rounded-full bg-terra text-white text-xs font-black flex items-center justify-center shrink-0 mt-0.5">{i+1}</div>
                      <p className="text-ink-500 dark:text-gray-300 text-sm leading-relaxed">{step}</p>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {result.local_products?.length > 0 && (
              <div className="bg-white dark:bg-dark-surface rounded-2xl p-5 border border-deep-light dark:border-dark-light shadow-card">
                <p className="text-ink dark:text-white font-bold mb-3">{t("scanner.localProducts")}</p>
                <div className="space-y-3">
                  {result.local_products.map((p, i) => (
                    <div key={i} className="bg-deep-mid dark:bg-dark-mid rounded-xl p-3 flex justify-between items-start">
                      <div>
                        <p className="text-ink dark:text-white text-sm font-semibold">{p.name}</p>
                        <p className="text-ink-500 dark:text-gray-500 text-xs mt-0.5">{p.where}</p>
                      </div>
                      <p className="text-terra font-bold text-sm shrink-0 ml-3">₦{p.price_naira?.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.organic_option && (
              <div className="bg-terra-light dark:bg-terra/10 border border-green-200 dark:border-terra/20 rounded-2xl p-4">
                <p className="text-terra font-semibold text-sm mb-1">🌿 {t("scanner.organic")}</p>
                <p className="text-ink-500 dark:text-gray-300 text-sm">{result.organic_option}</p>
              </div>
            )}

            {result.prevention && (
              <div className="bg-white dark:bg-dark-surface rounded-2xl p-4 border border-deep-light dark:border-dark-light shadow-card">
                <p className="text-ink dark:text-white font-semibold text-sm mb-1">🛡 {t("scanner.prevention")}</p>
                <p className="text-ink-500 dark:text-gray-400 text-sm">{result.prevention}</p>
              </div>
            )}

            <button onClick={reset} className="w-full bg-terra text-white h-14 rounded-2xl font-bold hover:bg-terra-dark transition-colors shadow-md">
              {t("scanner.scanAnother")}
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
}
