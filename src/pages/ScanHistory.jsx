import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import { ListSkeleton } from "@/components/Skeleton";

const SEV_STYLE = {
  low:      "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800",
  moderate: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800",
  high:     "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800",
  critical: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800",
};

const TYPE_STYLE = {
  disease:  "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800",
  weed:     "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800",
  pest:     "bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800",
  nutrient: "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800",
};

function norm(v) { return (v ?? "").toString().toLowerCase().trim(); }

export default function ScanHistoryPage() {
  const { t }   = useTranslation();
  const [scans,    setScans]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState("all");
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data } = await supabase
        .from("scans")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending:false })
        .limit(50);
      setScans(data ?? []);
      setLoading(false);
    })();
  }, []);

  const filtered = scans.filter(s => {
    if (filter === "all")     return true;
    if (filter === "healthy") return (s.confidence ?? 0) < 20;
    return s.scan_type === filter;
  });

  const plan = selected?.treatment_plan ? (() => {
    try { return JSON.parse(selected.treatment_plan); } catch { return null; }
  })() : null;

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-ink dark:text-white text-3xl font-black">Scan History</h1>
        <p className="text-ink-500 dark:text-gray-400 mt-1">{scans.length} total scans recorded</p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {[
          { key:"all",     label:`All (${scans.length})`                                        },
          { key:"disease", label:`Disease (${scans.filter(s=>s.scan_type==="disease").length})` },
          { key:"weed",    label:`Weed (${scans.filter(s=>s.scan_type==="weed").length})`       },
          { key:"healthy", label:`Healthy (${scans.filter(s=>(s.confidence??0)<20).length})`    },
        ].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all border ${
              filter === f.key
                ? "bg-terra text-white border-terra"
                : "bg-white dark:bg-dark-surface text-ink-500 dark:text-gray-400 border-deep-light dark:border-dark-light hover:border-terra"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? <ListSkeleton rows={5} /> : filtered.length === 0 ? (
        <div className="bg-white dark:bg-dark-surface rounded-2xl border border-deep-light dark:border-dark-light p-16 text-center shadow-card">
          <div className="w-16 h-16 rounded-2xl bg-deep-mid dark:bg-dark-mid flex items-center justify-center mx-auto mb-4">
            <span className="text-ink-500 dark:text-gray-400 text-2xl font-black">◎</span>
          </div>
          <p className="text-ink dark:text-white font-bold">No scans found</p>
          <p className="text-ink-500 dark:text-gray-400 text-sm mt-2">Use the Crop Scanner to start detecting diseases and weeds.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(scan => (
            <div key={scan.id}
              onClick={() => setSelected(selected?.id === scan.id ? null : scan)}
              className="bg-white dark:bg-dark-surface rounded-2xl border border-deep-light dark:border-dark-light shadow-card cursor-pointer hover:border-terra transition-colors overflow-hidden"
            >
              {/* ── Main row ─────────────────────────────────────────── */}
              <div className="p-4 flex items-center gap-4">

                {/* Thumbnail — shows saved image or placeholder */}
                <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-deep-light dark:border-dark-light bg-deep-mid dark:bg-dark-mid">
                  {scan.image_url ? (
                    <img
                      src={scan.image_url}
                      alt={scan.crop}
                      className="w-full h-full object-cover"
                      onError={(e) => { e.target.style.display="none"; }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-ink-500 dark:text-gray-500 text-2xl">◈</span>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`text-xs px-2.5 py-0.5 rounded-lg font-semibold capitalize ${TYPE_STYLE[norm(scan.scan_type)] ?? TYPE_STYLE.disease}`}>
                      {scan.scan_type}
                    </span>
                    <span className={`text-xs px-2.5 py-0.5 rounded-lg font-semibold capitalize border ${SEV_STYLE[norm(scan.severity)] ?? SEV_STYLE.low}`}>
                      {scan.severity}
                    </span>
                  </div>
                  <p className="text-ink dark:text-white font-semibold text-sm leading-snug truncate">{scan.result}</p>
                  <p className="text-ink-500 dark:text-gray-400 text-xs mt-0.5">{scan.crop} · {format(new Date(scan.created_at), "MMM d, yyyy")}</p>
                </div>

                {/* Confidence indicator */}
                <div className="text-right shrink-0 ml-2">
                  <div className="w-10 h-10 rounded-xl bg-deep-mid dark:bg-dark-mid flex items-center justify-center">
                    <div className="w-6 h-6 rounded-full border-2 border-terra flex items-center justify-center">
                      <div className="w-2.5 h-2.5 rounded-full bg-terra" style={{ opacity:(scan.confidence ?? 0) / 100 }} />
                    </div>
                  </div>
                  <p className="text-ink-500 dark:text-gray-500 text-xs mt-1">{scan.confidence}%</p>
                </div>
              </div>

              {/* ── Expanded treatment plan ───────────────────────────── */}
              {selected?.id === scan.id && plan && (
                <div
                  className="border-t border-deep-light dark:border-dark-light px-4 py-4 space-y-3 bg-deep-mid dark:bg-dark-mid"
                  onClick={e => e.stopPropagation()}
                >
                  {/* Identification notes if low confidence */}
                  {plan.identification_confidence < 70 && plan.identification_notes && (
                    <div className="bg-amber/10 border border-amber/30 rounded-xl p-3">
                      <p className="text-amber font-semibold text-xs mb-1">Low identification confidence ({plan.identification_confidence}%)</p>
                      <p className="text-ink-500 dark:text-gray-300 text-xs">{plan.identification_notes}</p>
                    </div>
                  )}

                  {plan.immediate_action && (
                    <div className="bg-white dark:bg-dark-surface rounded-xl p-3 border border-red-200 dark:border-red-800">
                      <p className="text-red-600 dark:text-red-400 font-semibold text-xs mb-1 uppercase tracking-wide">Immediate Action</p>
                      <p className="text-ink dark:text-white text-sm">{plan.immediate_action}</p>
                    </div>
                  )}

                  {plan.steps?.length > 0 && (
                    <div className="bg-white dark:bg-dark-surface rounded-xl p-3 border border-deep-light dark:border-dark-light">
                      <p className="text-ink dark:text-white font-semibold text-xs mb-2 uppercase tracking-wide">Treatment Steps</p>
                      <ol className="space-y-1.5">
                        {plan.steps.map((s, i) => (
                          <li key={i} className="flex gap-2 text-sm text-ink-500 dark:text-gray-300">
                            <span className="text-terra font-bold shrink-0">{i+1}.</span>{s}
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}

                  {plan.local_products?.length > 0 && (
                    <div className="bg-white dark:bg-dark-surface rounded-xl p-3 border border-deep-light dark:border-dark-light">
                      <p className="text-ink dark:text-white font-semibold text-xs mb-2 uppercase tracking-wide">Recommended Products</p>
                      {plan.local_products.map((p, i) => (
                        <div key={i} className="flex justify-between items-center py-1.5 border-b border-deep-light dark:border-dark-light last:border-0">
                          <p className="text-ink-500 dark:text-gray-300 text-sm">{p.name}</p>
                          <p className="text-terra font-bold text-sm">₦{p.price_naira?.toLocaleString()}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {plan.prevention && (
                    <p className="text-ink-500 dark:text-gray-400 text-xs px-1">Prevention: {plan.prevention}</p>
                  )}

                  <button
                    onClick={() => {
                      const text = `TerraIQ+ Scan Result\n\nCrop: ${scan.crop}\nDiagnosis: ${scan.result}\nSeverity: ${scan.severity}\n\nImmediate action: ${plan.immediate_action ?? "See app for details"}\n\nScanned with TerraIQ+`;
                      if (navigator.share) {
                        navigator.share({ title:"TerraIQ+ Scan Result", text });
                      } else {
                        navigator.clipboard.writeText(text);
                        toast?.success("Copied to clipboard");
                      }
                    }}
                    className="w-full bg-terra text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-terra-dark transition-colors"
                  >
                    Share Result
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}
