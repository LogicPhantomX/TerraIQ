import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";

function norm(v) { return (v ?? "").toString().toLowerCase().trim(); }

const SEV = {
  low:      "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
  moderate: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400",
  high:     "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400",
  critical: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
};
const TYPE = {
  disease:  "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400",
  weed:     "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400",
  pest:     "bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400",
  nutrient: "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400",
};

export default function ScanHistoryPage() {
  const [scans,    setScans]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [filter,   setFilter]   = useState("all");
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    loadScans();
  }, []);

  const loadScans = async () => {
    setLoading(true);
    setError(null);
    try {
      // Get user explicitly — don't assume session
      const { data: { user }, error: authErr } = supabase.auth.getSession();
      if (authErr || !user) {
        setError("Session expired. Please sign in again.");
        setLoading(false);
        return;
      }

      const { data, error: fetchErr } = await supabase
        .from("scans")
        .select("id, crop, scan_type, result, severity, confidence, created_at, image_url, treatment_plan")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (fetchErr) {
        setError(`Could not load scans: ${fetchErr.message}`);
        setLoading(false);
        return;
      }

      setScans(data ?? []);
    } catch (e) {
      setError(`Unexpected error: ${e.message}`);
    }
    setLoading(false);
  };

  const filtered = scans.filter(s => {
    if (filter === "all")     return true;
    if (filter === "healthy") return (s.confidence ?? 0) < 20;
    return norm(s.scan_type) === filter;
  });

  const getImageUrl = (scan) => {
    if (scan.image_url) return scan.image_url;
    try {
      const plan = JSON.parse(scan.treatment_plan);
      if (plan.imageDataUrl) return "data:image/jpeg;base64," + plan.imageDataUrl;
    } catch {
      return null;
    }
    return null;
  };

  const plan = selected?.treatment_plan ? (() => {
    try { return JSON.parse(selected.treatment_plan); } catch { return null; }
  })() : null;

  const TABS = [
    { key:"all",     short:"All"     },
    { key:"disease", short:"Disease" },
    { key:"weed",    short:"Weed"    },
    { key:"healthy", short:"Healthy" },
  ];

  if (loading) return (
    <Layout>
      <h1 className="text-ink dark:text-white text-2xl font-black mb-4">Scan History</h1>
      <div className="space-y-3">
        {[1,2,3,4].map(i => (
          <div key={i} className="bg-white dark:bg-dark-surface rounded-2xl border border-deep-light dark:border-dark-light p-4 animate-pulse">
            <div className="flex gap-3">
              <div className="w-14 h-14 rounded-xl bg-deep-light dark:bg-dark-light shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-deep-light dark:bg-dark-light rounded w-24" />
                <div className="h-4 bg-deep-light dark:bg-dark-light rounded w-48" />
                <div className="h-3 bg-deep-light dark:bg-dark-light rounded w-32" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </Layout>
  );

  return (
    <Layout>
      <div className="mb-4 flex justify-between items-start">
        <div>
          <h1 className="text-ink dark:text-white text-2xl font-black">Scan History</h1>
          <p className="text-ink-500 dark:text-gray-400 text-sm mt-0.5">{scans.length} scan{scans.length !== 1 ? "s" : ""} recorded</p>
        </div>
        <button onClick={loadScans} className="text-terra text-sm font-semibold hover:underline">Refresh</button>
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4 mb-4">
          <p className="text-red-700 dark:text-red-400 font-semibold text-sm">{error}</p>
          <button onClick={loadScans} className="text-red-600 text-sm underline mt-1">Try again</button>
        </div>
      )}

      {/* Filter tabs */}
      <div style={{ display:"flex", gap:6, overflowX:"auto", paddingBottom:4,
        WebkitOverflowScrolling:"touch", marginBottom:14 }}>
        {TABS.map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            style={{ flexShrink:0, padding:"6px 14px", borderRadius:10, fontSize:12,
              fontWeight:600, border:"1px solid", cursor:"pointer", whiteSpace:"nowrap",
              backgroundColor: filter===f.key ? "#1E8A4C" : "transparent",
              color: filter===f.key ? "white" : "#5A6B62",
              borderColor: filter===f.key ? "#1E8A4C" : "#D1D9D4" }}>
            {f.short}
          </button>
        ))}
      </div>

      {!error && filtered.length === 0 && (
        <div className="bg-white dark:bg-dark-surface rounded-2xl border border-deep-light dark:border-dark-light p-12 text-center shadow-card">
          <div className="w-14 h-14 rounded-2xl bg-deep-mid dark:bg-dark-mid flex items-center justify-center mx-auto mb-3">
            <span className="text-2xl text-ink-500 dark:text-gray-400">◈</span>
          </div>
          <p className="text-ink dark:text-white font-bold">No scans yet</p>
          <p className="text-ink-500 dark:text-gray-400 text-sm mt-1">Use the Scanner to scan a crop, weed, or tree.</p>
        </div>
      )}

      <div className="space-y-2">
        {filtered.map(scan => (
          <div key={scan.id}
            onClick={() => setSelected(selected?.id === scan.id ? null : scan)}
            className="bg-white dark:bg-dark-surface rounded-2xl border border-deep-light dark:border-dark-light shadow-card cursor-pointer hover:border-terra transition-colors overflow-hidden"
          >
            <div style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 14px", minWidth:0 }}>
              {/* Thumbnail */}
              <div style={{ width:52, height:52, borderRadius:10, overflow:"hidden",
                flexShrink:0, backgroundColor:"#E8F0ED" }}>
                {getImageUrl(scan) ? (
                  <img src={getImageUrl(scan)} alt={scan.crop}
                    style={{ width:"100%", height:"100%", objectFit:"cover" }}
                    onError={e => { e.target.style.display="none"; }} />
                ) : (
                  <div style={{ width:"100%", height:"100%", display:"flex",
                    alignItems:"center", justifyContent:"center", color:"#9CA3AF", fontSize:18 }}>◈</div>
                )}
              </div>

              {/* Text */}
              <div style={{ flex:1, minWidth:0, overflow:"hidden" }}>
                <div style={{ display:"flex", flexWrap:"wrap", gap:4, marginBottom:3 }}>
                  <span style={{ fontSize:10, padding:"2px 7px", borderRadius:6, fontWeight:700, whiteSpace:"nowrap" }}
                    className={TYPE[norm(scan.scan_type)] ?? TYPE.disease}>
                    {scan.scan_type ?? "scan"}
                  </span>
                  <span style={{ fontSize:10, padding:"2px 7px", borderRadius:6, fontWeight:700, whiteSpace:"nowrap" }}
                    className={SEV[norm(scan.severity)] ?? SEV.low}>
                    {scan.severity ?? "low"}
                  </span>
                </div>
                <p style={{ fontSize:13, fontWeight:600, overflow:"hidden",
                  textOverflow:"ellipsis", whiteSpace:"nowrap" }}
                  className="text-ink dark:text-white">
                  {scan.result ?? "Unknown"}
                </p>
                <p style={{ fontSize:11, marginTop:2, overflow:"hidden",
                  textOverflow:"ellipsis", whiteSpace:"nowrap" }}
                  className="text-ink-500 dark:text-gray-400">
                  {scan.crop ?? "Unknown crop"} · {format(new Date(scan.created_at), "MMM d, yyyy")}
                </p>
              </div>

              {/* Confidence */}
              <div style={{ textAlign:"right", flexShrink:0, width:36 }}>
                <p style={{ fontSize:13, fontWeight:800 }} className="text-terra">{scan.confidence ?? 0}%</p>
                <p style={{ fontSize:9 }} className="text-ink-500 dark:text-gray-500">conf</p>
              </div>
            </div>

            {/* Expanded */}
            {selected?.id === scan.id && plan && (
              <div className="border-t border-deep-light dark:border-dark-light bg-deep-mid dark:bg-dark-mid"
                style={{ padding:"12px 14px" }}
                onClick={e => e.stopPropagation()}>
                {plan.immediate_action && (
                  <div className="bg-white dark:bg-dark-surface rounded-xl p-3 border border-red-200 dark:border-red-800 mb-3">
                    <p className="text-red-600 dark:text-red-400 font-bold text-xs mb-1 uppercase tracking-wide">Immediate Action</p>
                    <p className="text-ink dark:text-white text-sm">{plan.immediate_action}</p>
                  </div>
                )}
                {plan.steps?.length > 0 && (
                  <div className="bg-white dark:bg-dark-surface rounded-xl p-3 border border-deep-light dark:border-dark-light mb-3">
                    <p className="text-ink dark:text-white font-bold text-xs mb-2 uppercase tracking-wide">Treatment Steps</p>
                    <ol className="space-y-1.5">
                      {plan.steps.map((step,i) => (
                        <li key={i} className="flex gap-2 text-sm text-ink-500 dark:text-gray-300">
                          <span className="text-terra font-bold shrink-0">{i+1}.</span>
                          <span style={{ wordBreak:"break-word" }}>{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
                {plan.prevention && (
                  <p className="text-ink-500 dark:text-gray-400 text-xs mb-3">Prevention: {plan.prevention}</p>
                )}
                <button onClick={() => {
                  const text = `TerraIQ+ Scan\nCrop: ${scan.crop}\nDiagnosis: ${scan.result}\nSeverity: ${scan.severity}\n\n${plan.immediate_action ?? ""}\n\nScanned with TerraIQ+`;
                  if (navigator.share) navigator.share({ title:"TerraIQ+ Scan", text });
                  else navigator.clipboard?.writeText(text);
                }} className="w-full bg-terra text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-terra-dark transition-colors">
                  Share Result
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </Layout>
  );
}