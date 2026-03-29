import Layout from "@/components/Layout";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { getShelfLifePrediction } from "@/lib/api";
import { useFarmerLanguage } from "@/hooks/useFarmerLanguage";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";

// ── Calculate LIVE days remaining from stored dates ───────────────────
// This is the key fix — never rely on a stored days_remaining column
// Always compute from (harvested_at + shelf_life_days) vs today
function computeDaysRemaining(harvestedAt, shelfLifeDays) {
  if (!harvestedAt || !shelfLifeDays) return null;
  const expiryDate = new Date(harvestedAt);
  expiryDate.setDate(expiryDate.getDate() + shelfLifeDays);
  const today = new Date();
  today.setHours(0,0,0,0);
  expiryDate.setHours(0,0,0,0);
  return Math.max(-1, Math.floor((expiryDate - today) / (1000*60*60*24)));
}

function getUrgency(days) {
  if (days === null || days === undefined) return "moderate";
  if (days <= 0)  return "expired";
  if (days <= 2)  return "critical";
  if (days <= 5)  return "urgent";
  if (days <= 10) return "moderate";
  return "good";
}

const URG = {
  expired:  { bar:"bg-gray-400",   text:"text-gray-500 dark:text-gray-400",           bg:"bg-gray-50 dark:bg-gray-800/30",     border:"border-gray-200 dark:border-gray-700",   label:"Expired"   },
  critical: { bar:"bg-red-500",    text:"text-red-700 dark:text-red-400",              bg:"bg-red-50 dark:bg-red-900/20",       border:"border-red-200 dark:border-red-800",     label:"Critical"  },
  urgent:   { bar:"bg-orange-500", text:"text-orange-700 dark:text-orange-400",        bg:"bg-orange-50 dark:bg-orange-900/20", border:"border-orange-200 dark:border-orange-800",label:"Urgent"   },
  moderate: { bar:"bg-yellow-500", text:"text-yellow-700 dark:text-yellow-400",        bg:"bg-yellow-50 dark:bg-yellow-900/20", border:"border-yellow-200 dark:border-yellow-800",label:"Moderate" },
  good:     { bar:"bg-green-500",  text:"text-green-700 dark:text-green-400",          bg:"bg-green-50 dark:bg-green-900/20",   border:"border-green-200 dark:border-green-800",  label:"Good"     },
};

function CountdownBar({ harvestedAt, shelfLifeDays }) {
  const days    = computeDaysRemaining(harvestedAt, shelfLifeDays);
  const urgency = getUrgency(days);
  const style   = URG[urgency];
  const pct     = days === null ? 0 : Math.max(0, Math.min(100, (days / (shelfLifeDays || 30)) * 100));

  const expiryDate = harvestedAt && shelfLifeDays
    ? new Date(new Date(harvestedAt).setDate(new Date(harvestedAt).getDate() + shelfLifeDays))
    : null;

  return (
    <div className={`rounded-2xl border p-4 ${style.bg} ${style.border}`}>
      <div className="flex justify-between items-center mb-2">
        <p className={`text-xs font-bold uppercase tracking-wide ${style.text}`}>Shelf Life</p>
        <span className={`text-xs px-2 py-0.5 rounded-lg font-bold border ${style.bg} ${style.text} ${style.border}`}>
          {style.label}
        </span>
      </div>

      {days !== null && days <= 0 ? (
        <p className={`text-2xl font-black ${style.text}`}>Expired</p>
      ) : (
        <>
          <div className="flex items-end gap-1 mb-2">
            <span className={`text-4xl font-black ${style.text}`}>{days ?? "–"}</span>
            <span className={`text-sm font-semibold mb-1.5 ${style.text}`}>
              {days === 1 ? "day left" : "days left"}
            </span>
          </div>
          <div className="h-2 bg-white/50 dark:bg-black/20 rounded-full overflow-hidden mb-2">
            <div className={`h-full rounded-full transition-all duration-700 ${style.bar}`} style={{ width:`${pct}%` }} />
          </div>
          {expiryDate && (
            <p className={`text-xs ${style.text} opacity-75`}>
              Expires {expiryDate.toLocaleDateString("en-NG", { day:"numeric", month:"short", year:"numeric" })}
            </p>
          )}
        </>
      )}
    </div>
  );
}

const iClass = "w-full bg-white dark:bg-dark-mid rounded-xl px-4 h-12 text-ink dark:text-white border border-deep-light dark:border-dark-light focus:border-terra outline-none text-sm shadow-sm";

export function HarvestPage() {
  const { t }  = useTranslation();
  const lang   = useFarmerLanguage();
  const [form, setForm]    = useState({ crop:"", quantity:"", storage:"room_temp", temp:"28", humidity:"60" });
  const [result,   setResult]   = useState(null);
  const [harvests, setHarvests] = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [fetching, setFetching] = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data } = await supabase
        .from("harvests").select("*")
        .eq("user_id", user.id)
        .order("harvested_at", { ascending:false })
        .limit(30);
      setHarvests(data ?? []);
      setFetching(false);
    })();
  }, []);

  const logHarvest = async () => {
    if (!form.crop || !form.quantity) { toast.error("Enter crop and quantity"); return; }
    setLoading(true);
    const tid = toast.loading("Predicting shelf life...");
    try {
      const prediction = await getShelfLifePrediction(
        form.crop, +form.quantity, form.storage,
        +form.temp, +form.humidity, lang
      );
      setResult(prediction);

      const { data: { user } } = await supabase.auth.getUser();

      // Store harvested_at and shelf_life_days — NOT days_remaining
      // days_remaining is computed dynamically from these two values
      const { data: newHarvest } = await supabase.from("harvests").insert({
        user_id:         user.id,
        crop:            form.crop,
        quantity_kg:     +form.quantity,
        storage_method:  form.storage,
        temperature:     +form.temp,
        humidity:        +form.humidity,
        shelf_life_days: prediction.shelf_life_days,
        urgency:         getUrgency(prediction.shelf_life_days),
        harvested_at:    new Date().toISOString(),
        // days_remaining column is intentionally NOT set here
        // it is always computed live from harvested_at + shelf_life_days
      }).select().single();

      // Auto-notify if shelf life is short
      if (prediction.shelf_life_days <= 3) {
        await supabase.from("notifications").insert({
          user_id: user.id,
          type:    "harvest",
          title:   `${form.crop} has only ${prediction.shelf_life_days} day${prediction.shelf_life_days===1?"":"s"} shelf life`,
          body:    `Your ${form.quantity}kg of ${form.crop} stored as ${form.storage.replace("_"," ")} needs to be sold or processed quickly. ${prediction.summary ?? ""}`,
          read:    false,
        });
      }

      if (newHarvest) setHarvests(prev => [newHarvest, ...prev]);
      toast.dismiss(tid);
      toast.success(`${prediction.shelf_life_days} days shelf life`);
    } catch(e) { toast.dismiss(tid); toast.error(e.message); }
    setLoading(false);
  };

  return (
    <Layout>
      <h1 className="text-ink dark:text-white text-3xl font-black mb-2">Harvest Tracker</h1>
      <p className="text-ink-500 dark:text-gray-400 mb-6">Log your harvest to track shelf life and get spoilage alerts.</p>

      {/* Form */}
      <div className="bg-white dark:bg-dark-surface rounded-2xl border border-deep-light dark:border-dark-light p-6 mb-5 shadow-card space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="text-ink-500 dark:text-gray-400 text-sm mb-1.5 block">Crop *</label>
            <input value={form.crop} onChange={e=>setForm(p=>({...p,crop:e.target.value}))}
              placeholder="e.g. Yam, Tomato, Maize" className={iClass} />
          </div>
          <div>
            <label className="text-ink-500 dark:text-gray-400 text-sm mb-1.5 block">Quantity (kg) *</label>
            <input type="number" value={form.quantity} onChange={e=>setForm(p=>({...p,quantity:e.target.value}))}
              placeholder="e.g. 200" className={iClass} />
          </div>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="text-ink-500 dark:text-gray-400 text-sm mb-1.5 block">Storage method</label>
            <select value={form.storage} onChange={e=>setForm(p=>({...p,storage:e.target.value}))} className={iClass}>
              {["room_temp","cool_dry","refrigerated","barn","silo","underground"].map(s =>
                <option key={s} value={s}>{s.replace("_"," ")}</option>)}
            </select>
          </div>
          <div>
            <label className="text-ink-500 dark:text-gray-400 text-sm mb-1.5 block">Temperature (°C)</label>
            <input type="number" value={form.temp} onChange={e=>setForm(p=>({...p,temp:e.target.value}))}
              placeholder="28" className={iClass} />
          </div>
          <div>
            <label className="text-ink-500 dark:text-gray-400 text-sm mb-1.5 block">Humidity (%)</label>
            <input type="number" value={form.humidity} onChange={e=>setForm(p=>({...p,humidity:e.target.value}))}
              placeholder="60" className={iClass} />
          </div>
        </div>
        <button onClick={logHarvest} disabled={loading}
          className="w-full bg-terra text-white h-12 rounded-xl font-bold hover:bg-terra-dark disabled:opacity-50 transition-colors shadow-sm">
          {loading ? "Predicting..." : "Log Harvest & Predict Shelf Life"}
        </button>
      </div>

      {/* Latest result */}
      {result && (
        <div className="mb-5 space-y-3">
          <CountdownBar harvestedAt={new Date().toISOString()} shelfLifeDays={result.shelf_life_days} />
          {result.summary && <p className="text-ink-500 dark:text-gray-400 text-sm px-1">{result.summary}</p>}
          {result.storage_tips?.length > 0 && (
            <div className="bg-white dark:bg-dark-surface rounded-2xl border border-deep-light dark:border-dark-light p-4 shadow-card">
              <p className="text-ink dark:text-white font-semibold text-sm mb-2">Storage Tips</p>
              <ul className="space-y-1">{result.storage_tips.map((tip,i) =>
                <li key={i} className="text-ink-500 dark:text-gray-400 text-sm">• {tip}</li>)}</ul>
            </div>
          )}
        </div>
      )}

      {/* Harvest history */}
      <div className="bg-white dark:bg-dark-surface rounded-2xl border border-deep-light dark:border-dark-light shadow-card">
        <div className="px-5 py-4 border-b border-deep-light dark:border-dark-light">
          <h2 className="text-ink dark:text-white font-bold">Harvest History</h2>
          <p className="text-ink-500 dark:text-gray-500 text-xs mt-0.5">Countdown updates automatically each day</p>
        </div>
        {fetching ? (
          <div className="p-8 flex justify-center"><div className="w-6 h-6 border-2 border-terra border-t-transparent rounded-full animate-spin" /></div>
        ) : harvests.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-ink-500 dark:text-gray-400 text-sm">No harvests logged yet.</p>
          </div>
        ) : harvests.map(h => {
          // Compute live days remaining — this is the key fix
          const liveDays = computeDaysRemaining(h.harvested_at, h.shelf_life_days);
          const urgency  = getUrgency(liveDays);
          const style    = URG[urgency];
          const isOpen   = expanded === h.id;

          return (
            <div key={h.id} className="border-b border-deep-light dark:border-dark-light last:border-0">
              <button onClick={() => setExpanded(isOpen ? null : h.id)}
                className="w-full px-5 py-4 flex items-center justify-between hover:bg-deep-mid dark:hover:bg-dark-mid transition-colors text-left">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-ink dark:text-white font-semibold">{h.crop}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-lg font-semibold border ${style.bg} ${style.text} ${style.border}`}>
                      {style.label}
                    </span>
                  </div>
                  <p className="text-ink-500 dark:text-gray-500 text-sm">
                    {h.quantity_kg}kg · {h.storage_method?.replace("_"," ")} · logged {new Date(h.harvested_at).toLocaleDateString("en-NG",{month:"short",day:"numeric"})}
                  </p>
                </div>
                {/* Live countdown number */}
                <div className="text-right ml-4 shrink-0">
                  {liveDays !== null && liveDays <= 0 ? (
                    <p className={`text-base font-bold ${style.text}`}>Expired</p>
                  ) : (
                    <>
                      <p className={`text-2xl font-black ${style.text}`}>{liveDays ?? "–"}</p>
                      <p className="text-ink-500 dark:text-gray-500 text-xs">days</p>
                    </>
                  )}
                </div>
              </button>

              {isOpen && (
                <div className="px-5 pb-4">
                  <CountdownBar harvestedAt={h.harvested_at} shelfLifeDays={h.shelf_life_days} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Layout>
  );
}

export default HarvestPage;
