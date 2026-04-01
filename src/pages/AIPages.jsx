// ─── Pages that pass farmer language to AI calls ──────────────────────
// Import useFarmerLanguage and pass lang to every API call.
// The AI then responds in Yoruba, Hausa, Igbo, or English automatically.

import Layout from "@/components/Layout";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { getSoilAnalysis, getMarketAdvice, getShelfLifePrediction, getWeatherForecast, getIrrigationPlan } from "@/lib/api";
import { useFarmerLanguage } from "@/hooks/useFarmerLanguage";
import { ListSkeleton, SkeletonCard } from "@/components/Skeleton";
import { EmptyHarvests } from "@/components/EmptyState";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import IrrigationPage from "@/pages/IrrigationPage";

// ─── SOIL ─────────────────────────────────────────────────────────────
export function SoilPage() {
  const { t } = useTranslation();
  const lang  = useFarmerLanguage();
  const [form, setForm] = useState({ nitrogen:"",phosphorus:"",potassium:"",ph:"",moisture:"",temperature:"",crop:"" });
  const [result,  setResult]  = useState(null);
  const [loading, setLoading] = useState(false);
  const set = (k) => (e) => setForm(p => ({ ...p, [k]:e.target.value }));

  const analyse = async () => {
    if (!form.nitrogen || !form.ph) { toast.error("Enter at least Nitrogen and pH"); return; }
    setLoading(true);
    const tid = toast.loading("Analysing your soil...");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile }  = await supabase.from("profiles").select("region").eq("id", user.id).maybeSingle();
      // Pass lang — soil advice comes back in farmer's language
      const data = await getSoilAnalysis({
        nitrogen:+form.nitrogen||30, phosphorus:+form.phosphorus||25,
        potassium:+form.potassium||30, ph:+form.ph||6.5,
        moisture:+form.moisture||50, temperature:+form.temperature||28,
        region: profile?.region??"Nigeria", crop: form.crop||undefined,
        lang,
      });
      setResult(data);
      await supabase.from("soil_tests").insert({ user_id:user.id, nitrogen:+form.nitrogen, phosphorus:+form.phosphorus, potassium:+form.potassium, ph:+form.ph, moisture:+form.moisture, temperature:+form.temperature, weed_risk:data.weed_risk, rating:data.rating, analysis:JSON.stringify(data) });
      toast.dismiss(tid);
      toast.success(`Soil rating: ${data.rating?.toUpperCase()}`);
    } catch(e) { toast.dismiss(tid); toast.error(e.message); }
    setLoading(false);
  };

  const RATING_COLOR = { poor:"text-red-600", fair:"text-yellow-600", good:"text-terra", excellent:"text-green-600" };
  const iClass = "w-full bg-white dark:bg-dark-mid rounded-xl px-3 h-11 text-ink dark:text-white border border-deep-light dark:border-dark-light focus:border-terra outline-none text-sm shadow-sm";
  const lClass = "text-ink-500 dark:text-gray-400 text-xs mb-1.5 block";

  return (
    <Layout>
      <h1 className="text-ink dark:text-white text-3xl font-black mb-2">{t("soil.title")}</h1>
      <p className="text-ink-500 dark:text-gray-400 mb-6">{t("soil.subtitle")}</p>
      <div className="bg-white dark:bg-dark-surface rounded-2xl border border-deep-light dark:border-dark-light p-6 mb-5 shadow-card">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
          {[["nitrogen",t("soil.nitrogen")],["phosphorus",t("soil.phosphorus")],["potassium",t("soil.potassium")],["ph",t("soil.ph")],["moisture",t("soil.moisture")],["temperature",t("soil.temperature")]].map(([k,label]) => (
            <div key={k}><label className={lClass}>{label}</label><input type="number" value={form[k]} onChange={set(k)} className={iClass} placeholder="0" /></div>
          ))}
        </div>
        <div className="mb-4"><label className={lClass}>{t("soil.targetCrop")}</label><input value={form.crop} onChange={set("crop")} className={iClass} placeholder="e.g. Maize" /></div>
        <button onClick={analyse} disabled={loading} className="w-full bg-terra text-white h-12 rounded-xl font-bold hover:bg-terra-dark disabled:opacity-50 transition-colors shadow-sm">
          {loading ? t("soil.analysing") : t("soil.analyse")}
        </button>
      </div>

      {result && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-dark-surface rounded-2xl border border-deep-light dark:border-dark-light p-6 shadow-card">
            <div className="flex justify-between mb-2">
              <h3 className="text-ink dark:text-white font-bold text-lg">{t("soil.rating")}</h3>
              <span className={`font-black text-xl uppercase ${RATING_COLOR[result.rating]}`}>{result.rating}</span>
            </div>
            <p className="text-ink-500 dark:text-gray-300 text-sm">{result.summary}</p>
            <div className="flex flex-wrap gap-2 mt-4">{result.best_crops?.map(c => <span key={c} className="bg-terra-light dark:bg-terra/20 text-terra text-sm px-3 py-1 rounded-lg font-semibold">{c}</span>)}</div>
          </div>

          {result.fertilizer_recommendation && (
            <div className="bg-white dark:bg-dark-surface rounded-2xl border border-deep-light dark:border-dark-light p-6 shadow-card space-y-5">
              <h3 className="text-ink dark:text-white font-bold text-lg">{t("soil.fertilizer")}</h3>
              <div className="bg-deep-mid dark:bg-dark-mid rounded-2xl p-4 border border-sky/20">
                <p className="text-sky font-semibold mb-3 text-sm">⚗ {t("soil.synthetic")}</p>
                <p className="text-ink dark:text-white font-bold">{result.fertilizer_recommendation.synthetic?.name}</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-sm">
                  <span className="text-ink-500 dark:text-gray-500">Rate</span><span className="text-ink-400 dark:text-gray-300">{result.fertilizer_recommendation.synthetic?.rate}</span>
                  <span className="text-ink-500 dark:text-gray-500">Price</span><span className="text-terra font-semibold">₦{result.fertilizer_recommendation.synthetic?.price_naira?.toLocaleString()}</span>
                  <span className="text-ink-500 dark:text-gray-500">Where</span><span className="text-ink-400 dark:text-gray-300">{result.fertilizer_recommendation.synthetic?.where_to_buy}</span>
                </div>
              </div>
              <div className="bg-deep-mid dark:bg-dark-mid rounded-2xl p-4 border border-terra/30">
                <div className="flex justify-between items-center mb-2">
                  <p className="text-terra font-semibold text-sm">🌿 {t("soil.compost")}</p>
                  <span className="bg-amber/10 text-amber text-xs px-2 py-0.5 rounded-lg font-semibold border border-amber/20">Recommended</span>
                </div>
                <p className="text-ink dark:text-white font-bold">{result.fertilizer_recommendation.compost?.name}</p>
                <p className="text-ink-500 dark:text-gray-400 text-sm mt-1">{result.fertilizer_recommendation.compost?.description}</p>
                <p className="text-ink-400 dark:text-gray-300 text-sm mt-2">{result.fertilizer_recommendation.compost?.benefit}</p>
              </div>
              <div className="bg-deep-mid dark:bg-dark-mid rounded-2xl p-4 border border-amber/20">
                <p className="text-amber font-semibold text-sm mb-2">🔥 {t("soil.biochar")}</p>
                <p className="text-ink dark:text-white font-bold">{result.fertilizer_recommendation.biochar?.name}</p>
                <p className="text-ink-500 dark:text-gray-400 text-sm mt-1">{result.fertilizer_recommendation.biochar?.description}</p>
                <p className="text-ink-400 dark:text-gray-300 text-sm mt-1">{result.fertilizer_recommendation.biochar?.benefit_for_this_soil}</p>
              </div>
              {result.fertilizer_recommendation.supplements && (
                <div className="bg-deep-mid dark:bg-dark-mid rounded-2xl p-4 border border-danger/20">
                  <p className="text-danger font-semibold text-sm mb-2">+ {t("soil.supplement")}</p>
                  <p className="text-ink dark:text-white font-bold">{result.fertilizer_recommendation.supplements?.name}</p>
                  <p className="text-ink-500 dark:text-gray-400 text-sm mt-1">{result.fertilizer_recommendation.supplements?.description}</p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {result.fertilizer_recommendation.supplements?.targeted_deficiencies?.map((d,i) => (
                      <span key={i} className="bg-red-50 dark:bg-danger/10 text-danger text-xs px-2 py-0.5 rounded-lg border border-red-200 dark:border-danger/20">{d}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          {result.improvement_steps?.length > 0 && (
            <div className="bg-white dark:bg-dark-surface rounded-2xl p-5 border border-deep-light dark:border-dark-light shadow-card">
              <p className="text-ink dark:text-white font-bold mb-3">{t("soil.improvement")}</p>
              <ol className="space-y-2">{result.improvement_steps.map((s,i) => (
                <li key={i} className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-terra text-white text-xs font-black flex items-center justify-center shrink-0">{i+1}</div>
                  <p className="text-ink-500 dark:text-gray-300 text-sm">{s}</p>
                </li>
              ))}</ol>
            </div>
          )}
          {result.season_advice && (
            <div className="bg-white dark:bg-dark-surface rounded-2xl p-4 border border-deep-light dark:border-dark-light shadow-card">
              <p className="text-ink dark:text-white font-semibold text-sm mb-1">🌱 {t("soil.season")}</p>
              <p className="text-ink-500 dark:text-gray-400 text-sm">{result.season_advice}</p>
            </div>
          )}
        </div>
      )}
    </Layout>
  );
}

// ─── IRRIGATION ───────────────────────────────────────────────────────
// export function IrrigationPage() {
//   const { t } = useTranslation();
//   const lang  = useFarmerLanguage();
//   const [form, setForm] = useState({ crop:"", farmSize:"", soilType:"loamy" });
//   const [plan,    setPlan]    = useState(null);
//   const [loading, setLoading] = useState(false);

//   const generate = async () => {
//     if (!form.crop) { toast.error("Enter your crop"); return; }
//     setLoading(true);
//     const tid = toast.loading("Building your irrigation plan...");
//     try {
//       const { data: { user } } = await supabase.auth.getUser();
//       const { data: profile }  = await supabase.from("profiles").select("region").eq("id", user.id).maybeSingle();
//       const weather = await getWeatherForecast(9.0820, 8.6753);
//       // Pass lang — irrigation advice in farmer's language
//       const data = await getIrrigationPlan(form.crop, +form.farmSize||500, weather, profile?.region??"Nigeria", lang);
//       setPlan(data);
//       toast.dismiss(tid);
//       toast.success("7-day irrigation plan ready!");
//     } catch(e) { toast.dismiss(tid); toast.error(e.message); }
//     setLoading(false);
//   };

//   const iClass = "w-full bg-white dark:bg-dark-mid rounded-xl px-4 h-12 text-ink dark:text-white border border-deep-light dark:border-dark-light focus:border-terra outline-none shadow-sm";

//   return (
//     <Layout>
//       <h1 className="text-ink dark:text-white text-3xl font-black mb-2">{t("irrigation.title")}</h1>
//       <p className="text-ink-500 dark:text-gray-400 mb-6">{t("irrigation.subtitle")}</p>
//       <div className="bg-white dark:bg-dark-surface rounded-2xl border border-deep-light dark:border-dark-light p-6 mb-5 grid md:grid-cols-3 gap-4 shadow-card">
//         {[["crop",t("irrigation.crop"),"e.g. Maize"],["farmSize",t("irrigation.farmSize"),"e.g. 500"],["soilType",t("irrigation.soilType"),"e.g. loamy"]].map(([k,label,ph]) => (
//           <div key={k}><label className="text-ink-500 dark:text-gray-400 text-sm mb-1.5 block">{label}</label><input value={form[k]} onChange={e=>setForm(p=>({...p,[k]:e.target.value}))} placeholder={ph} className={iClass} /></div>
//         ))}
//       </div>
//       <button onClick={generate} disabled={loading} className="w-full bg-terra text-white h-12 rounded-xl font-bold hover:bg-terra-dark disabled:opacity-50 mb-6 transition-colors shadow-sm">
//         {loading ? t("irrigation.generating") : t("irrigation.generate")}
//       </button>
//       {plan && (
//         <div className="space-y-3">
//           <div className="bg-sky/10 dark:bg-sky/5 rounded-2xl p-4 border border-sky/20"><p className="text-sky">{plan.summary}</p></div>
//           {plan.daily_plan?.map((d,i) => (
//             <div key={i} className={`rounded-2xl p-4 border shadow-card ${d.action==="water"?"bg-sky/5 border-sky/20":"bg-white dark:bg-dark-surface border-deep-light dark:border-dark-light"}`}>
//               <div className="flex justify-between items-center">
//                 <p className="text-ink dark:text-white font-semibold">{d.day}</p>
//                 <span className={`text-sm font-bold ${d.action==="water"?"text-sky":"text-ink-500 dark:text-gray-500"}`}>
//                   {d.action==="water" ? `💧 ${t("irrigation.water")}` : `⏭ ${t("irrigation.skip")}`}
//                 </span>
//               </div>
//               {d.action==="water" && <p className="text-sky text-sm mt-1">{d.litres_per_sqm} L/m² · {d.best_time}</p>}
//               <p className="text-ink-500 dark:text-gray-400 text-sm mt-1">{d.reason}</p>
//             </div>
//           ))}
//           {plan.tips?.length > 0 && (
//             <div className="bg-terra-light dark:bg-terra/10 rounded-2xl p-4 border border-green-200 dark:border-terra/20">
//               <p className="text-terra font-semibold text-sm mb-2">💡 Tips</p>
//               <ul className="space-y-1">{plan.tips.map((tip,i) => <li key={i} className="text-ink-500 dark:text-gray-300 text-sm">• {tip}</li>)}</ul>
//             </div>
//           )}
//         </div>
//       )}
//     </Layout>
//   );
// }

// ─── HARVEST ──────────────────────────────────────────────────────────
export function HarvestPage() {
  const { t } = useTranslation();
  const lang  = useFarmerLanguage();
  const [form, setForm] = useState({ crop:"", quantity:"", storage:"room_temp", temp:"28", humidity:"60" });
  const [result,   setResult]   = useState(null);
  const [harvests, setHarvests] = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data } = await supabase.from("harvests").select("*").eq("user_id",user.id).order("harvested_at",{ascending:false}).limit(10);
      setHarvests(data??[]);
      setFetching(false);
    })();
  }, []);

  const logHarvest = async () => {
    if (!form.crop||!form.quantity) { toast.error("Enter crop and quantity"); return; }
    setLoading(true);
    const tid = toast.loading("Predicting shelf life...");
    try {
      // Pass lang — shelf life advice in farmer's language
      const data = await getShelfLifePrediction(form.crop, +form.quantity, form.storage, +form.temp, +form.humidity, lang);
      setResult(data);
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("harvests").insert({ user_id:user.id, crop:form.crop, quantity_kg:+form.quantity, storage_method:form.storage, temperature:+form.temp, humidity:+form.humidity, shelf_life_days:data.shelf_life_days, days_remaining:data.shelf_life_days, urgency:data.urgency, harvested_at:new Date().toISOString() });
      setHarvests(prev => [{ crop:form.crop, quantity_kg:+form.quantity, storage_method:form.storage, days_remaining:data.shelf_life_days, urgency:data.urgency },...prev]);
      toast.dismiss(tid);
      toast.success(`${data.shelf_life_days} days shelf life predicted`);
    } catch(e) { toast.dismiss(tid); toast.error(e.message); }
    setLoading(false);
  };

  const URG = {
    good:    "text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20",
    moderate:"text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20",
    urgent:  "text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20",
    expired: "text-gray-500 bg-gray-100 dark:bg-gray-800",
  };
  const iClass = "w-full bg-white dark:bg-dark-mid rounded-xl px-4 h-12 text-ink dark:text-white border border-deep-light dark:border-dark-light focus:border-terra outline-none shadow-sm";

  return (
    <Layout>
      <h1 className="text-ink dark:text-white text-3xl font-black mb-2">{t("harvest.title")}</h1>
      <p className="text-ink-500 dark:text-gray-400 mb-6">{t("harvest.subtitle")}</p>
      <div className="bg-white dark:bg-dark-surface rounded-2xl border border-deep-light dark:border-dark-light p-6 mb-5 grid md:grid-cols-2 gap-4 shadow-card">
        {[["crop",t("harvest.crop"),"e.g. Yam"],["quantity",t("harvest.quantity"),"e.g. 200"],["temp",t("harvest.temperature"),"e.g. 28"],["humidity",t("harvest.humidity"),"e.g. 60"]].map(([k,l,ph]) => (
          <div key={k}><label className="text-ink-500 dark:text-gray-400 text-sm mb-1.5 block">{l}</label><input value={form[k]} onChange={e=>setForm(p=>({...p,[k]:e.target.value}))} placeholder={ph} className={iClass} /></div>
        ))}
        <div><label className="text-ink-500 dark:text-gray-400 text-sm mb-1.5 block">{t("harvest.storage")}</label>
        <select value={form.storage} onChange={e=>setForm(p=>({...p,storage:e.target.value}))} className={iClass}>
          {["room_temp","cool_dry","refrigerated","barn","silo","underground"].map(s => <option key={s} value={s}>{s.replace("_"," ")}</option>)}
        </select></div>
      </div>
      <button onClick={logHarvest} disabled={loading} className="w-full bg-terra text-white h-12 rounded-xl font-bold hover:bg-terra-dark disabled:opacity-50 mb-6 transition-colors shadow-sm">
        {loading ? t("harvest.logging") : t("harvest.log")}
      </button>
      {result && (
        <div className={`rounded-2xl p-5 mb-5 border border-deep-light dark:border-dark-light shadow-card ${URG[result.urgency]}`}>
          <div className="flex justify-between mb-2">
            <h3 className="font-bold text-ink dark:text-white">Shelf Life</h3>
            <span className={`font-bold capitalize ${URG[result.urgency]?.split(" ")[0]}`}>{result.urgency}</span>
          </div>
          <p className="text-3xl font-black text-ink dark:text-white mb-1">{result.shelf_life_days} {t("harvest.daysLeft")}</p>
          <p className="text-ink-500 dark:text-gray-300 text-sm">{result.summary}</p>
          {result.storage_tips?.length > 0 && (
            <ul className="mt-3 space-y-1">{result.storage_tips.map((tip,i) => <li key={i} className="text-sm text-ink-500 dark:text-gray-300">• {tip}</li>)}</ul>
          )}
        </div>
      )}
      <div className="bg-white dark:bg-dark-surface rounded-2xl border border-deep-light dark:border-dark-light shadow-card">
        <div className="px-5 py-4 border-b border-deep-light dark:border-dark-light"><h2 className="text-ink dark:text-white font-bold">{t("harvest.history")}</h2></div>
        {fetching ? <ListSkeleton rows={3} /> : harvests.length===0 ? <EmptyHarvests /> : harvests.map((h,i) => (
          <div key={i} className="px-5 py-4 border-b border-deep-light dark:border-dark-light last:border-0 flex justify-between items-center">
            <div><p className="text-ink dark:text-white font-medium">{h.crop}</p><p className="text-ink-500 dark:text-gray-500 text-sm">{h.quantity_kg}kg · {h.storage_method?.replace("_"," ")}</p></div>
            <div className="text-right"><p className="text-ink dark:text-white font-bold">{h.days_remaining}d</p><span className={`text-xs px-2 py-0.5 rounded-lg font-semibold capitalize ${URG[h.urgency]??""}`}>{h.urgency}</span></div>
          </div>
        ))}
      </div>
    </Layout>
  );
}

// ─── MARKET ───────────────────────────────────────────────────────────
// ─── Add this to TerraIQ_WEB/src/pages/AIPages.jsx ───────────────────
// Replace the existing MarketPage export with this version
// It loads city from profile and passes it to the AI for local advice

export function MarketPage() {
  const { t } = useTranslation();
  const lang  = useFarmerLanguage();
  const [crop,    setCrop]    = useState("");
  const [qty,     setQty]     = useState("");
  const [result,  setResult]  = useState(null);
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const { data } = await supabase.from("profiles")
        .select("region, city, full_name").eq("id", session.user.id).single();
      setProfile(data);
    })();
  }, []);

  const LANG_INSTR = {
    en:"Respond in clear, simple English.",
    yo:"Dahun ni ede Yoruba.",
    ha:"Amsa cikin harshen Hausa.",
    ig:"Zaghachi n'asụsụ Igbo.",
  };

  const analyse = async () => {
    if (!crop) { toast.error("Enter a crop name"); return; }
    setLoading(true);
    const tid = toast.loading("Analysing market...");
    try {
      const city    = profile?.city   ?? "";
      const region  = profile?.region ?? "Nigeria";
      const langName = { en:"English", yo:"Yoruba", ha:"Hausa", ig:"Igbo" }[lang] ?? "English";
      const langInstr = LANG_INSTR[lang] ?? LANG_INSTR.en;

      // Build location string — primary is the farmer's city
      const primaryLocation = city ? `${city}, ${region}` : region;

      const system = `You are TerraIQ+, an agricultural market advisor for Nigerian farmers.
LANGUAGE: ${langInstr}. ALL text in ${langName} except product names, prices, and place names.
FARMER LOCATION: ${primaryLocation}, Nigeria.

Give market advice that is SPECIFIC to ${primaryLocation}.
- Primary prices: give the current price in ${city || region} first
- Secondary: mention nearby bigger markets like Ibadan, Lagos, or Kano as reference
- Local buyers: name specific market types, agro-dealers, and buying agents in ${city || region}
- Transport: give practical advice for farmers in ${city || region}
- Seasonal tips: note if this is the right selling time in ${region}

Respond ONLY with valid JSON. No markdown.
{
  "current_price_per_kg": 380,
  "current_price_per_tonne": 380000,
  "price_trend": "rising / falling / stable",
  "trend_reason": "string in ${langName}",
  "primary_market": {
    "name": "specific market name in ${city || region}",
    "location": "${primaryLocation}",
    "price_per_kg": 380,
    "why_best": "string in ${langName}"
  },
  "secondary_markets": [
    { "name": "market name", "location": "city", "price_per_kg": 400, "distance_note": "string" },
    { "name": "market name", "location": "city", "price_per_kg": 350, "distance_note": "string" }
  ],
  "best_time_to_sell": "string in ${langName} — specific to current season",
  "negotiation_tips": ["tip in ${langName}", "tip", "tip"],
  "local_buyers": ["buyer type in ${primaryLocation}", "buyer type", "buyer type"],
  "transport_advice": "string in ${langName} for farmers in ${primaryLocation}",
  "processing_option": "string in ${langName} — can they add value to get a better price?",
  "price_forecast_30_days": "string in ${langName}"
}`;

      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method:"POST",
        headers:{ "Content-Type":"application/json", "Authorization":`Bearer ${import.meta.env.VITE_GROQ_KEY}` },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          max_tokens: 900,
          messages:[
            { role:"system", content:system },
            { role:"user",   content:`I have ${qty || "some"} kg of ${crop} to sell. I am in ${primaryLocation}. Give me city-specific market advice including where to sell in ${city || region} and nearby markets. Current date context: ${new Date().toLocaleDateString("en-NG", { month:"long", year:"numeric" })}. Language: ${langName}.` },
          ],
        }),
      });

      if (!res.ok) throw new Error("Market analysis failed");
      const data = await res.json();
      const raw  = data.choices[0].message.content;
      const parsed = JSON.parse(raw.replace(/```json|```/g,"").trim());
      setResult(parsed);
      toast.dismiss(tid);
      toast.success("Market analysis ready!");
    } catch(e) { toast.dismiss(tid); toast.error(e.message); }
    setLoading(false);
  };

  const iClass = "w-full bg-white dark:bg-dark-mid rounded-xl px-4 h-12 text-ink dark:text-white border border-deep-light dark:border-dark-light focus:border-terra outline-none shadow-sm text-sm";

  return (
    <Layout>
      <h1 className="text-ink dark:text-white text-3xl font-black mb-2">{t("market.title")}</h1>

      {/* Location indicator */}
      {profile?.city && (
        <div className="bg-terra-light dark:bg-terra/10 border border-green-200 dark:border-terra/20 rounded-xl px-4 py-2.5 mb-4 flex items-center gap-2">
          <span className="text-terra text-sm font-semibold">◈</span>
          <p className="text-terra text-sm font-semibold">{profile.city}, {profile.region}</p>
          <p className="text-ink-500 dark:text-gray-400 text-xs ml-1">— prices and advice for your city</p>
        </div>
      )}

      {/* Form */}
      <div className="bg-white dark:bg-dark-surface rounded-2xl border border-deep-light dark:border-dark-light p-6 mb-5 shadow-card space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-ink-500 dark:text-gray-400 text-sm mb-1.5 block">Crop *</label>
            <input value={crop} onChange={e=>setCrop(e.target.value)}
              placeholder="e.g. Maize, Tomato, Yam" className={iClass} />
          </div>
          <div>
            <label className="text-ink-500 dark:text-gray-400 text-sm mb-1.5 block">Quantity (kg)</label>
            <input type="number" value={qty} onChange={e=>setQty(e.target.value)}
              placeholder="e.g. 500" className={iClass} />
          </div>
        </div>
        <button onClick={analyse} disabled={loading}
          className="w-full bg-terra text-white h-12 rounded-xl font-bold hover:bg-terra-dark disabled:opacity-50 transition-colors shadow-sm">
          {loading ? "Analysing..." : `Get ${profile?.city ? profile.city + " " : ""}Market Advice`}
        </button>
      </div>

      {result && (
        <div className="space-y-4">
          {/* Price cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white dark:bg-dark-surface rounded-2xl border border-deep-light dark:border-dark-light p-4 shadow-card text-center">
              <p className="text-terra text-2xl font-black">₦{result.current_price_per_kg?.toLocaleString()}</p>
              <p className="text-ink-500 dark:text-gray-400 text-xs mt-1">per kg in {profile?.city || profile?.region}</p>
            </div>
            <div className="bg-white dark:bg-dark-surface rounded-2xl border border-deep-light dark:border-dark-light p-4 shadow-card text-center">
              <p className="text-terra text-2xl font-black">₦{result.current_price_per_tonne?.toLocaleString()}</p>
              <p className="text-ink-500 dark:text-gray-400 text-xs mt-1">per tonne</p>
            </div>
          </div>

          {/* Trend */}
          <div className="bg-white dark:bg-dark-surface rounded-2xl border border-deep-light dark:border-dark-light p-4 shadow-card">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-lg font-black ${result.price_trend==="rising"?"text-green-600":result.price_trend==="falling"?"text-red-500":"text-amber"}`}>
                {result.price_trend==="rising"?"↑":result.price_trend==="falling"?"↓":"→"}
              </span>
              <p className="text-ink dark:text-white font-semibold capitalize">{result.price_trend} market</p>
            </div>
            <p className="text-ink-500 dark:text-gray-400 text-sm">{result.trend_reason}</p>
          </div>

          {/* Primary market — your city */}
          {result.primary_market && (
            <div className="bg-terra-light dark:bg-terra/10 rounded-2xl border border-green-200 dark:border-terra/20 p-5 shadow-card">
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-terra text-white text-xs px-2.5 py-0.5 rounded-lg font-bold">Best for you</span>
                <span className="text-ink-500 dark:text-gray-400 text-xs">{result.primary_market.location}</span>
              </div>
              <p className="text-ink dark:text-white font-bold">{result.primary_market.name}</p>
              <p className="text-terra font-black text-xl mt-1">₦{result.primary_market.price_per_kg?.toLocaleString()}/kg</p>
              <p className="text-ink-500 dark:text-gray-400 text-sm mt-1">{result.primary_market.why_best}</p>
            </div>
          )}

          {/* Secondary markets */}
          {result.secondary_markets?.length > 0 && (
            <div className="bg-white dark:bg-dark-surface rounded-2xl border border-deep-light dark:border-dark-light shadow-card">
              <div className="px-5 py-3 border-b border-deep-light dark:border-dark-light">
                <p className="text-ink dark:text-white font-bold text-sm">Other Markets to Consider</p>
              </div>
              {result.secondary_markets.map((m,i) => (
                <div key={i} className="px-5 py-3 border-b border-deep-light dark:border-dark-light last:border-0 flex justify-between items-center">
                  <div>
                    <p className="text-ink dark:text-white font-semibold text-sm">{m.name}</p>
                    <p className="text-ink-500 dark:text-gray-500 text-xs">{m.location} · {m.distance_note}</p>
                  </div>
                  <p className="text-terra font-bold text-sm">₦{m.price_per_kg?.toLocaleString()}/kg</p>
                </div>
              ))}
            </div>
          )}

          {/* Local buyers */}
          {result.local_buyers?.length > 0 && (
            <div className="bg-white dark:bg-dark-surface rounded-2xl p-5 border border-deep-light dark:border-dark-light shadow-card">
              <p className="text-ink dark:text-white font-bold mb-3">Local Buyers in {profile?.city || profile?.region}</p>
              <div className="space-y-1">
                {result.local_buyers.map((b,i) => (
                  <div key={i} className="flex gap-2 text-sm">
                    <span className="text-terra shrink-0">◆</span>
                    <span className="text-ink-500 dark:text-gray-300">{b}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* When to sell */}
          {result.best_time_to_sell && (
            <div className="bg-amber/5 dark:bg-amber/10 rounded-2xl p-4 border border-amber/20">
              <p className="text-amber font-semibold text-sm mb-1">Best Time to Sell</p>
              <p className="text-ink-500 dark:text-gray-300 text-sm">{result.best_time_to_sell}</p>
            </div>
          )}

          {/* Negotiation tips */}
          {result.negotiation_tips?.length > 0 && (
            <div className="bg-white dark:bg-dark-surface rounded-2xl p-5 border border-deep-light dark:border-dark-light shadow-card">
              <p className="text-ink dark:text-white font-bold mb-3">Negotiation Tips</p>
              <ol className="space-y-2">
                {result.negotiation_tips.map((tip,i) => (
                  <li key={i} className="flex gap-2 text-sm">
                    <span className="text-terra font-bold shrink-0">{i+1}.</span>
                    <span className="text-ink-500 dark:text-gray-300">{tip}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Transport */}
          {result.transport_advice && (
            <div className="bg-white dark:bg-dark-surface rounded-2xl p-4 border border-deep-light dark:border-dark-light shadow-card">
              <p className="text-ink dark:text-white font-semibold text-sm mb-1">Transport Advice</p>
              <p className="text-ink-500 dark:text-gray-400 text-sm">{result.transport_advice}</p>
            </div>
          )}

          {/* Processing */}
          {result.processing_option && (
            <div className="bg-sky/10 border border-sky/20 rounded-2xl p-4">
              <p className="text-sky font-semibold text-sm mb-1">Value Addition Option</p>
              <p className="text-ink-500 dark:text-gray-300 text-sm">{result.processing_option}</p>
            </div>
          )}

          {/* Forecast */}
          {result.price_forecast_30_days && (
            <div className="bg-white dark:bg-dark-surface rounded-2xl p-4 border border-deep-light dark:border-dark-light shadow-card">
              <p className="text-ink dark:text-white font-semibold text-sm mb-1">30-Day Price Forecast</p>
              <p className="text-ink-500 dark:text-gray-400 text-sm">{result.price_forecast_30_days}</p>
            </div>
          )}

          <p className="text-ink-500 dark:text-gray-500 text-xs text-center">
            Prices are AI estimates · Not live market data · Use as a guide only
          </p>
        </div>
      )}
    </Layout>
  );
}
export default SoilPage;

// ─── ANALYTICS ────────────────────────────────────────────────────────
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { format, subDays, eachDayOfInterval } from "date-fns";
import { AnalyticsSkeleton } from "@/components/Skeleton";
import { EmptyAnalytics } from "@/components/EmptyState";

export function AnalyticsPage() {
  const { t } = useTranslation();
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const [scans, soils, harvests] = await Promise.all([
        supabase.from("scans").select("*").eq("user_id", user.id).order("created_at",{ascending:true}),
        supabase.from("soil_tests").select("*").eq("user_id", user.id).order("created_at",{ascending:true}),
        supabase.from("harvests").select("*").eq("user_id", user.id).order("harvested_at",{ascending:true}),
      ]);
      const s=scans.data??[], so=soils.data??[], h=harvests.data??[];
      const last14=eachDayOfInterval({start:subDays(new Date(),13),end:new Date()});
      const scanTrend=last14.map(d=>({date:format(d,"dd MMM"),scans:s.filter(x=>x.created_at?.startsWith(format(d,"yyyy-MM-dd"))).length}));
      const diseaseCounts={};
      s.filter(x=>x.confidence>=20).forEach(x=>{diseaseCounts[x.result]=(diseaseCounts[x.result]??0)+1;});
      const diseases=Object.entries(diseaseCounts).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([name,count])=>({name,count}));
      const phTrend=so.slice(-8).map(x=>({date:format(new Date(x.created_at),"dd MMM"),ph:x.ph}));
      setData({totalScans:s.length,soilTests:so.length,harvests:h.length,totalKg:h.reduce((a,b)=>a+(b.quantity_kg??0),0),scanTrend,diseases,phTrend});
      setLoading(false);
    })();
  },[]);

  if (loading) return <Layout><AnalyticsSkeleton /></Layout>;
  if (!data||(data.totalScans===0&&data.soilTests===0)) return <Layout><h1 className="text-ink dark:text-white text-3xl font-black mb-6">{t("analytics.title")}</h1><EmptyAnalytics /></Layout>;

  const tip={background:"#243B2C",border:"1px solid #1E4230",borderRadius:8,color:"#fff"};
  return (
    <Layout>
      <h1 className="text-ink dark:text-white text-3xl font-black mb-6">{t("analytics.title")}</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[[t("analytics.totalScans"),data.totalScans,"text-terra"],[t("analytics.soilTests"),data.soilTests,"text-sky"],[t("analytics.harvests"),data.harvests,"text-amber"],[t("analytics.totalHarvest"),`${data.totalKg}kg`,"text-green-600 dark:text-green-400"]].map(([l,v,c])=>(
          <div key={l} className="bg-white dark:bg-dark-surface rounded-2xl p-5 border border-deep-light dark:border-dark-light text-center shadow-card">
            <div className={`text-3xl font-black ${c}`}>{v}</div>
            <div className="text-ink-500 dark:text-gray-400 text-sm mt-1">{l}</div>
          </div>
        ))}
      </div>
      <div className="grid md:grid-cols-2 gap-5">
        <div className="bg-white dark:bg-dark-surface rounded-2xl border border-deep-light dark:border-dark-light p-5 shadow-card">
          <h3 className="text-ink dark:text-white font-bold mb-4">{t("analytics.scanActivity")}</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={data.scanTrend}><XAxis dataKey="date" tick={{fill:"#6B6B6B",fontSize:10}}/><YAxis tick={{fill:"#6B6B6B",fontSize:10}}/><Tooltip contentStyle={tip}/><Line type="monotone" dataKey="scans" stroke="#1E8A4C" strokeWidth={2} dot={false}/></LineChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white dark:bg-dark-surface rounded-2xl border border-deep-light dark:border-dark-light p-5 shadow-card">
          <h3 className="text-ink dark:text-white font-bold mb-4">{t("analytics.topDiseases")}</h3>
          {data.diseases.length===0?<p className="text-ink-500 dark:text-gray-500 text-sm">{t("analytics.noDisease")}</p>
            :data.diseases.map((d,i)=>(
              <div key={i} className="mb-3">
                <div className="flex justify-between text-sm mb-1"><span className="text-ink-400 dark:text-gray-300 truncate">{d.name}</span><span className="text-ink-500 ml-2">{d.count}x</span></div>
                <div className="h-2 bg-deep-light dark:bg-dark-light rounded-full"><div className="h-full bg-terra rounded-full" style={{width:`${(d.count/data.diseases[0].count)*100}%`}}/></div>
              </div>
            ))
          }
        </div>
        {data.phTrend.length>1&&(
          <div className="bg-white dark:bg-dark-surface rounded-2xl border border-deep-light dark:border-dark-light p-5 md:col-span-2 shadow-card">
            <h3 className="text-ink dark:text-white font-bold mb-4">{t("analytics.soilPH")}</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={data.phTrend}><XAxis dataKey="date" tick={{fill:"#6B6B6B",fontSize:10}}/><YAxis domain={[4,9]} tick={{fill:"#6B6B6B",fontSize:10}}/><Tooltip contentStyle={tip}/><Line type="monotone" dataKey="ph" stroke="#0D7EA8" strokeWidth={2}/></LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </Layout>
  );
}

// ─── COOPERATIVE ──────────────────────────────────────────────────────
export function CoopPage() {
  const { t } = useTranslation();
  const [coop,    setCoop]     = useState(null);
  const [alerts,  setAlerts]   = useState([]);
  const [loading, setLoading]  = useState(true);
  const [name,    setName]     = useState("");
  const [region,  setRegion]   = useState("");
  const [code,    setCode]     = useState("");
  const [creating,setCreating] = useState(false);

  useEffect(()=>{loadCoop();},[]);

  const loadCoop = async () => {
    const {data:{user}}=await supabase.auth.getUser();
    const {data:mem}=await supabase.from("cooperative_members").select("cooperative_id,role").eq("user_id",user.id).maybeSingle();
    if(mem){
      const {data:c}=await supabase.from("cooperatives").select("*").eq("id",mem.cooperative_id).maybeSingle();
      const {data:a}=await supabase.from("cooperative_alerts").select("*").eq("cooperative_id",mem.cooperative_id).order("created_at",{ascending:false}).limit(10);
      setCoop(c);setAlerts(a??[]);
    }
    setLoading(false);
  };

  const handleCreate=async()=>{
    if(!name){toast.error("Enter cooperative name");return;}
    setCreating(true);  
    const tid=toast.loading("Creating cooperative...");
    const {data:{user}}=await supabase.auth.getUser();
    const {data:c}=await supabase.from("cooperatives").insert({name,region,admin_id:user.id}).select().maybeSingle();
    if(c){await supabase.from("cooperative_members").insert({cooperative_id:c.id,user_id:user.id,role:"admin"});await loadCoop();}
    toast.dismiss(tid);toast.success("Cooperative created!");setCreating(false);
  };

  const handleJoin=async()=>{
    if(!code){toast.error("Enter invite code");return;}
    const tid=toast.loading("Joining cooperative...");
    const {data:c}=await supabase.from("cooperatives").select("*").eq("invite_code",code.trim().toLowerCase()).maybeSingle();
    if(!c){toast.dismiss(tid);toast.error("Invalid invite code");return;}
    const {data:{user}}=await supabase.auth.getUser();
    const {error}=await supabase.from("cooperative_members").insert({cooperative_id:c.id,user_id:user.id,role:"member"});
    if(error?.code==="23505"){toast.dismiss(tid);toast.error("Already a member");return;}
    toast.dismiss(tid);toast.success(`Joined ${c.name}!`);await loadCoop();
  };

  const iClass="w-full bg-white dark:bg-dark-mid rounded-xl px-4 h-12 text-ink dark:text-white border border-deep-light dark:border-dark-light focus:border-terra outline-none shadow-sm";
  const TYPE_COLOR={disease:"text-red-600 dark:text-red-400",weather:"text-sky",market:"text-purple-600 dark:text-purple-400",general:"text-terra"};

  if(loading)return<Layout><div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-terra border-t-transparent rounded-full animate-spin"/></div></Layout>;

  if(!coop)return(
    <Layout>
      <h1 className="text-ink dark:text-white text-3xl font-black mb-6">{t("cooperative.title")}</h1>
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-dark-surface rounded-2xl border border-deep-light dark:border-dark-light p-6 space-y-4 shadow-card">
          <h2 className="text-ink dark:text-white font-bold">{t("cooperative.create")}</h2>
          <input value={name} onChange={e=>setName(e.target.value)} placeholder={t("cooperative.name")} className={iClass}/>
          <input value={region} onChange={e=>setRegion(e.target.value)} placeholder={t("cooperative.region")} className={iClass}/>
          <button onClick={handleCreate} disabled={creating} className="w-full bg-terra text-white h-12 rounded-xl font-bold hover:bg-terra-dark disabled:opacity-50 shadow-sm">{creating?"Creating...":t("cooperative.createBtn")}</button>
        </div>
        <div className="bg-white dark:bg-dark-surface rounded-2xl border border-deep-light dark:border-dark-light p-6 space-y-4 shadow-card">
          <h2 className="text-ink dark:text-white font-bold">{t("cooperative.join")}</h2>
          <input value={code} onChange={e=>setCode(e.target.value)} placeholder={t("cooperative.inviteCode")} className={`${iClass} uppercase tracking-widest`}/>
          <button onClick={handleJoin} className="w-full bg-white dark:bg-dark-mid border-2 border-terra text-terra h-12 rounded-xl font-bold hover:bg-terra hover:text-white transition-colors shadow-sm">{t("cooperative.joinBtn")}</button>
        </div>
      </div>
    </Layout>
  );

  return(
    <Layout>
      <div className="flex justify-between items-start mb-6">
        <div>
          <p className="text-terra text-sm font-semibold">{t("cooperative.title")}</p>
          <h1 className="text-ink dark:text-white text-3xl font-black">{coop.name}</h1>
          <p className="text-ink-500 dark:text-gray-400">{coop.region} · {coop.member_count} {t("cooperative.members")}</p>
        </div>
       <div className="bg-white dark:bg-dark-surface border border-deep-light dark:border-dark-light rounded-xl px-4 py-3 text-center shadow-card space-y-2">
  <p className="text-ink-500 dark:text-gray-400 text-xs">Invite Code</p>
  <p className="text-terra font-black tracking-widest uppercase text-xl">{coop.invite_code}</p>
  <button
    onClick={() => {
      const msg = `Join our farming cooperative on TerraIQ+!\n\nCooperative: ${coop.name}\nRegion: ${coop.region}\n\nUse this invite code when joining:\n*${coop.invite_code}*\n\nDownload TerraIQ+ and go to Cooperative → Join with Invite Code.`;
      const url = `https://wa.me/?text=${encodeURIComponent(msg)}`;
      window.open(url, "_blank");
    }}
    className="w-full bg-green-500 text-white rounded-xl py-2 text-xs font-bold hover:bg-green-600 transition-colors"
  >
    Share on WhatsApp
  </button>
  <button
    onClick={() => {
      navigator.clipboard.writeText(coop.invite_code);
    }}
    className="w-full bg-deep-mid dark:bg-dark-mid text-ink-500 dark:text-gray-400 rounded-xl py-2 text-xs font-semibold hover:text-ink dark:hover:text-white transition-colors"
  >
    Copy Code
  </button>
</div>
      </div>
      <div className="bg-white dark:bg-dark-surface rounded-2xl border border-deep-light dark:border-dark-light shadow-card">
        <div className="px-5 py-4 border-b border-deep-light dark:border-dark-light"><h2 className="text-ink dark:text-white font-bold">{t("cooperative.alerts")}</h2></div>
        {alerts.length===0?<div className="py-12 text-center text-ink-500 dark:text-gray-500">{t("cooperative.noAlerts")}</div>
          :alerts.map(a=>(
            <div key={a.id} className="px-5 py-4 border-b border-deep-light dark:border-dark-light last:border-0">
              <div className="flex justify-between mb-1">
                <p className={`text-sm font-bold uppercase ${TYPE_COLOR[a.type]??TYPE_COLOR.general}`}>{a.type}</p>
                <p className="text-ink-500 dark:text-gray-500 text-xs">{format(new Date(a.created_at),"MMM d")}</p>
              </div>
              <p className="text-ink dark:text-white font-semibold">{a.title}</p>
              <p className="text-ink-500 dark:text-gray-400 text-sm mt-0.5">{a.body}</p>
            </div>
          ))
        }
      </div>
    </Layout>
  );
}