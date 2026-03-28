import Layout from "@/components/Layout";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { getShelfLifePrediction } from "@/lib/api";
import { useFarmerLanguage } from "@/hooks/useFarmerLanguage";
import { ListSkeleton } from "@/components/Skeleton";
import { EmptyHarvests } from "@/components/EmptyState";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { formatDistanceToNow, addDays } from "date-fns";

// ── Normalise severity/urgency so colors always work ──────────────────
function normalise(val) {
  if (!val) return "moderate";
  return val.toString().toLowerCase().trim();
}

const URG_STYLE = {
  good:     { bar:"bg-green-500",  text:"text-green-700 dark:text-green-400",  bg:"bg-green-50 dark:bg-green-900/20",  border:"border-green-200 dark:border-green-800",  label:"Good"     },
  moderate: { bar:"bg-yellow-500", text:"text-yellow-700 dark:text-yellow-400",bg:"bg-yellow-50 dark:bg-yellow-900/20",border:"border-yellow-200 dark:border-yellow-800",label:"Moderate" },
  urgent:   { bar:"bg-red-500",    text:"text-red-700 dark:text-red-400",      bg:"bg-red-50 dark:bg-red-900/20",      border:"border-red-200 dark:border-red-800",      label:"Urgent"   },
  expired:  { bar:"bg-gray-400",   text:"text-gray-500",                       bg:"bg-gray-100 dark:bg-gray-800",      border:"border-gray-200 dark:border-gray-700",    label:"Expired"  },
};

function getUrgStyle(val) {
  return URG_STYLE[normalise(val)] ?? URG_STYLE.moderate;
}

// ── Countdown component ───────────────────────────────────────────────
function SpoilageCountdown({ daysRemaining, harvestedAt }) {
  const urg = daysRemaining <= 0 ? "expired" : daysRemaining <= 3 ? "urgent" : daysRemaining <= 7 ? "moderate" : "good";
  const style = URG_STYLE[urg];
  const pct   = Math.max(0, Math.min(100, (daysRemaining / 30) * 100));

  // Calculate exact expiry date
  const expiryDate = harvestedAt ? addDays(new Date(harvestedAt), daysRemaining + (30 - daysRemaining)) : null;

  return (
    <div className={`rounded-2xl border p-4 ${style.bg} ${style.border}`}>
      <div className="flex justify-between items-center mb-2">
        <p className={`text-xs font-semibold uppercase tracking-wide ${style.text}`}>Shelf Life</p>
        <span className={`text-xs px-2 py-0.5 rounded-lg font-bold border ${style.bg} ${style.text} ${style.border}`}>
          {style.label}
        </span>
      </div>

      {daysRemaining <= 0 ? (
        <p className={`text-2xl font-black ${style.text}`}>Expired</p>
      ) : (
        <>
          <div className="flex items-end gap-1 mb-2">
            <span className={`text-4xl font-black ${style.text}`}>{daysRemaining}</span>
            <span className={`text-base font-semibold mb-1 ${style.text}`}>days left</span>
          </div>

          {/* Progress bar — full = good, empty = expired */}
          <div className="h-2 bg-white/50 dark:bg-black/20 rounded-full overflow-hidden mb-2">
            <div
              className={`h-full rounded-full transition-all duration-700 ${style.bar}`}
              style={{ width:`${pct}%` }}
            />
          </div>

          {/* Exact expiry */}
          {harvestedAt && (
            <p className={`text-xs ${style.text} opacity-75`}>
              Expires {formatDistanceToNow(addDays(new Date(harvestedAt), daysRemaining), { addSuffix:true })}
            </p>
          )}
        </>
      )}
    </div>
  );
}

const iClass = "w-full bg-white dark:bg-dark-mid rounded-xl px-4 h-12 text-ink dark:text-white border border-deep-light dark:border-dark-light focus:border-terra outline-none shadow-sm";

export function HarvestPage() {
  const { t } = useTranslation();
  const lang  = useFarmerLanguage();
  const [form, setForm] = useState({ crop:"", quantity:"", storage:"room_temp", temp:"28", humidity:"60" });
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
        .limit(20);
      setHarvests(data ?? []);
      setFetching(false);
    })();
  }, []);

  const logHarvest = async () => {
    if (!form.crop || !form.quantity) { toast.error("Enter crop and quantity"); return; }
    setLoading(true);
    const tid = toast.loading("Predicting shelf life...");
    try {
      const data = await getShelfLifePrediction(form.crop, +form.quantity, form.storage, +form.temp, +form.humidity, lang);
      setResult(data);

      const { data: { user } } = await supabase.auth.getUser();
      const { data: newHarvest } = await supabase.from("harvests").insert({
        user_id:        user.id,
        crop:           form.crop,
        quantity_kg:    +form.quantity,
        storage_method: form.storage,
        temperature:    +form.temp,
        humidity:       +form.humidity,
        shelf_life_days:data.shelf_life_days,
        days_remaining: data.shelf_life_days,
        urgency:        normalise(data.urgency),
        harvested_at:   new Date().toISOString(),
      }).select().single();

      // Auto-notify if urgent
      if (normalise(data.urgency) === "urgent" || data.shelf_life_days <= 3) {
        await supabase.from("notifications").insert({
          user_id: user.id,
          type:    "harvest",
          title:   `${form.crop} has only ${data.shelf_life_days} days shelf life`,
          body:    `Your ${form.quantity}kg of ${form.crop} stored in ${form.storage.replace("_"," ")} has a short shelf life. ${data.summary}`,
          read:    false,
        });
      }

      if (newHarvest) setHarvests(prev => [newHarvest, ...prev]);
      toast.dismiss(tid);
      toast.success(`${data.shelf_life_days} days shelf life predicted`);
    } catch(e) { toast.dismiss(tid); toast.error(e.message); }
    setLoading(false);
  };

  return (
    <Layout>
      <h1 className="text-ink dark:text-white text-3xl font-black mb-2">{t("harvest.title")}</h1>
      <p className="text-ink-500 dark:text-gray-400 mb-6">{t("harvest.subtitle")}</p>

      {/* Form */}
      <div className="bg-white dark:bg-dark-surface rounded-2xl border border-deep-light dark:border-dark-light p-6 mb-5 shadow-card">
        <div className="grid md:grid-cols-2 gap-4 mb-4">
          {[["crop",t("harvest.crop"),"e.g. Yam"],["quantity",t("harvest.quantity"),"e.g. 200"],["temp",t("harvest.temperature"),"e.g. 28"],["humidity",t("harvest.humidity"),"e.g. 60"]].map(([k,l,ph]) => (
            <div key={k}>
              <label className="text-ink-500 dark:text-gray-400 text-sm mb-1.5 block">{l}</label>
              <input value={form[k]} onChange={e=>setForm(p=>({...p,[k]:e.target.value}))} placeholder={ph} className={iClass} type="number" />
            </div>
          ))}
          <div className="md:col-span-2">
            <label className="text-ink-500 dark:text-gray-400 text-sm mb-1.5 block">{t("harvest.crop")}</label>
            <input value={form.crop} onChange={e=>setForm(p=>({...p,crop:e.target.value}))} placeholder="e.g. Yam, Maize, Tomato" className={iClass} type="text" />
          </div>
          <div>
            <label className="text-ink-500 dark:text-gray-400 text-sm mb-1.5 block">{t("harvest.storage")}</label>
            <select value={form.storage} onChange={e=>setForm(p=>({...p,storage:e.target.value}))} className={iClass}>
              {["room_temp","cool_dry","refrigerated","barn","silo","underground"].map(s => <option key={s} value={s}>{s.replace("_"," ")}</option>)}
            </select>
          </div>
        </div>
        <button onClick={logHarvest} disabled={loading}
          className="w-full bg-terra text-white h-12 rounded-xl font-bold hover:bg-terra-dark disabled:opacity-50 transition-colors shadow-sm"
        >
          {loading ? t("harvest.logging") : t("harvest.log")}
        </button>
      </div>

      {/* Result */}
      {result && (
        <div className="mb-5">
          <SpoilageCountdown daysRemaining={result.shelf_life_days} harvestedAt={new Date().toISOString()} />
          {result.summary && <p className="text-ink-500 dark:text-gray-400 text-sm mt-3 px-1">{result.summary}</p>}
          {result.storage_tips?.length > 0 && (
            <div className="mt-3 bg-white dark:bg-dark-surface rounded-2xl border border-deep-light dark:border-dark-light p-4 shadow-card">
              <p className="text-ink dark:text-white font-semibold text-sm mb-2">Storage Tips</p>
              <ul className="space-y-1">{result.storage_tips.map((tip,i)=><li key={i} className="text-ink-500 dark:text-gray-400 text-sm">• {tip}</li>)}</ul>
            </div>
          )}
        </div>
      )}

      {/* History */}
      <div className="bg-white dark:bg-dark-surface rounded-2xl border border-deep-light dark:border-dark-light shadow-card">
        <div className="px-5 py-4 border-b border-deep-light dark:border-dark-light">
          <h2 className="text-ink dark:text-white font-bold">{t("harvest.history")}</h2>
        </div>
        {fetching ? <ListSkeleton rows={3} /> : harvests.length === 0 ? <EmptyHarvests /> : (
          harvests.map(h => {
            const s = getUrgStyle(h.urgency);
            const isOpen = expanded === h.id;
            return (
              <div key={h.id} className="border-b border-deep-light dark:border-dark-light last:border-0">
                <button
                  onClick={() => setExpanded(isOpen ? null : h.id)}
                  className="w-full px-5 py-4 flex items-center justify-between hover:bg-deep-mid dark:hover:bg-dark-mid transition-colors text-left"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-ink dark:text-white font-semibold">{h.crop}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-lg font-semibold border ${s.bg} ${s.text} ${s.border}`}>
                        {s.label}
                      </span>
                    </div>
                    <p className="text-ink-500 dark:text-gray-500 text-sm">{h.quantity_kg}kg · {h.storage_method?.replace("_"," ")}</p>
                  </div>

                  {/* Mini countdown */}
                  <div className="text-right ml-4 shrink-0">
                    {(h.days_remaining ?? 0) <= 0 ? (
                      <p className={`font-black text-lg ${s.text}`}>—</p>
                    ) : (
                      <>
                        <p className={`font-black text-2xl ${s.text}`}>{h.days_remaining}</p>
                        <p className="text-ink-500 dark:text-gray-500 text-xs">days</p>
                      </>
                    )}
                  </div>
                </button>

                {/* Expanded countdown */}
                {isOpen && (
                  <div className="px-5 pb-4">
                    <SpoilageCountdown
                      daysRemaining={h.days_remaining ?? 0}
                      harvestedAt={h.harvested_at}
                    />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </Layout>
  );
}

export default HarvestPage;
