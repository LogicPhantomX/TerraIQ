// ─── TerraIQ_WEB/src/pages/HistoryPage.jsx ───────────────────────────
// Combined history page — Scan History + Soil Test History
// Add route: <Route path="/history" element={<Protected><HistoryPage /></Protected>} />
// Update Layout.jsx NAV: { to:"/history", icon:"◧", label:"History" }

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
const SOIL_RATING = {
  excellent: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
  good:      "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-500",
  fair:      "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400",
  poor:      "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
};

// ── Scan History segment ──────────────────────────────────────────────
function ScanHistory() {
  const [scans,    setScans]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [selected, setSelected] = useState(null);
  const [filter,   setFilter]   = useState("all");

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { setLoading(false); return; }
      const { data } = await supabase.from("scans")
        .select("id,crop,scan_type,result,severity,confidence,created_at,image_url,treatment_plan")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending:false }).limit(50);
      setScans(data ?? []); setLoading(false);
    })();
  }, []);

  const filtered = scans.filter(s => {
    if (filter === "all") return true;
    if (filter === "healthy") return (s.confidence ?? 0) < 20;
    return norm(s.scan_type) === filter;
  });

  const plan = (scan) => {
    try { return JSON.parse(scan.treatment_plan); } catch { return null; }
  };

  const share = (scan) => {
    const p = plan(scan);
    const text = `TerraIQ+ Scan\nCrop: ${scan.crop}\nDiagnosis: ${scan.result}\nSeverity: ${scan.severity}\n\n${p?.immediate_action ?? ""}\n\nScanned with TerraIQ+`;
    if (navigator.share) navigator.share({ title:"TerraIQ+ Scan", text });
    else navigator.clipboard?.writeText(text);
  };

  if (loading) return (
    <div className="space-y-2">
      {[1,2,3].map(i => (
        <div key={i} className="bg-white dark:bg-dark-surface rounded-2xl p-4 border border-deep-light dark:border-dark-light animate-pulse">
          <div className="flex gap-3"><div className="w-12 h-12 rounded-xl bg-deep-light dark:bg-dark-light shrink-0" /><div className="flex-1 space-y-2"><div className="h-3 bg-deep-light dark:bg-dark-light rounded w-24" /><div className="h-4 bg-deep-light dark:bg-dark-light rounded w-48" /></div></div>
        </div>
      ))}
    </div>
  );

  return (
    <div>
      <div style={{ display:"flex", gap:6, overflowX:"auto", paddingBottom:8, marginBottom:12 }}>
        {[["all","All"],["disease","Disease"],["weed","Weed"],["healthy","Healthy"]].map(([k,l]) => (
          <button key={k} onClick={() => setFilter(k)} style={{
            flexShrink:0, padding:"5px 12px", borderRadius:9, fontSize:12,
            fontWeight:600, border:"1px solid", cursor:"pointer", whiteSpace:"nowrap",
            backgroundColor: filter===k ? "#1E8A4C" : "transparent",
            color: filter===k ? "white" : "#5A6B62",
            borderColor: filter===k ? "#1E8A4C" : "#D1D9D4",
          }}>{l} {k==="all" ? `(${scans.length})` : ""}</button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-dark-surface rounded-2xl border border-deep-light dark:border-dark-light p-10 text-center shadow-card">
          <p className="text-ink dark:text-white font-bold">No scans yet</p>
          <p className="text-ink-500 dark:text-gray-400 text-sm mt-1">Use the Scanner to scan a crop, weed, or tree.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(scan => {
            const p = plan(scan);
            const isOpen = selected === scan.id;
            return (
              <div key={scan.id} onClick={() => setSelected(isOpen ? null : scan.id)}
                className="bg-white dark:bg-dark-surface rounded-2xl border border-deep-light dark:border-dark-light shadow-card cursor-pointer hover:border-terra transition-colors overflow-hidden">
                <div style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 14px", minWidth:0 }}>
                  <div style={{ width:50, height:50, borderRadius:10, overflow:"hidden", flexShrink:0, backgroundColor:"#E8F0ED" }}>
                    {scan.image_url ? <img src={scan.image_url} alt={scan.crop} style={{ width:"100%", height:"100%", objectFit:"cover" }} onError={e=>e.target.style.display="none"} />
                      : <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center", color:"#9CA3AF", fontSize:16 }}>◈</div>}
                  </div>
                  <div style={{ flex:1, minWidth:0, overflow:"hidden" }}>
                    <div style={{ display:"flex", flexWrap:"wrap", gap:4, marginBottom:3 }}>
                      <span style={{ fontSize:10, padding:"2px 7px", borderRadius:6, fontWeight:700 }} className={SEV[norm(scan.severity)] ?? SEV.low}>{scan.severity ?? "low"}</span>
                      <span style={{ fontSize:10, padding:"2px 7px", borderRadius:6, fontWeight:700 }} className="bg-deep-mid dark:bg-dark-mid text-ink-500 dark:text-gray-400">{scan.scan_type}</span>
                    </div>
                    <p style={{ fontSize:13, fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }} className="text-ink dark:text-white">{scan.result ?? "Unknown"}</p>
                    <p style={{ fontSize:11, marginTop:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }} className="text-ink-500 dark:text-gray-400">
                      {scan.crop} · {format(new Date(scan.created_at), "MMM d, yyyy")} · {scan.confidence}% conf
                    </p>
                  </div>
                </div>

                {isOpen && p && (
                  <div className="border-t border-deep-light dark:border-dark-light bg-deep-mid dark:bg-dark-mid p-4 space-y-3" onClick={e=>e.stopPropagation()}>
                    {p.immediate_action && (
                      <div className="bg-white dark:bg-dark-surface rounded-xl p-3 border border-red-200 dark:border-red-800">
                        <p className="text-red-600 dark:text-red-400 font-bold text-xs mb-1 uppercase">Immediate Action</p>
                        <p className="text-ink dark:text-white text-sm">{p.immediate_action}</p>
                      </div>
                    )}
                    {p.steps?.length > 0 && (
                      <div className="bg-white dark:bg-dark-surface rounded-xl p-3 border border-deep-light dark:border-dark-light">
                        <p className="text-ink dark:text-white font-bold text-xs mb-2 uppercase">Treatment Steps</p>
                        <ol className="space-y-1.5">
                          {p.steps.map((s,i) => <li key={i} className="flex gap-2 text-sm text-ink-500 dark:text-gray-300"><span className="text-terra font-bold shrink-0">{i+1}.</span><span>{s}</span></li>)}
                        </ol>
                      </div>
                    )}
                    {p.prevention && <p className="text-ink-500 dark:text-gray-400 text-xs">Prevention: {p.prevention}</p>}
                    <button onClick={() => share(scan)} className="w-full bg-terra text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-terra-dark transition-colors">Share Result</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Soil Test History segment ─────────────────────────────────────────
function SoilHistory() {
  const [tests,    setTests]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { setLoading(false); return; }
      const { data } = await supabase.from("soil_tests")
        .select("*").eq("user_id", session.user.id)
        .order("created_at", { ascending:false }).limit(30);
      setTests(data ?? []); setLoading(false);
    })();
  }, []);

  const shareSoil = (test) => {
    const a = test.analysis ? (() => { try { return JSON.parse(test.analysis); } catch { return null; } })() : null;
    const text = `TerraIQ+ Soil Analysis\n\nDate: ${format(new Date(test.created_at),"MMM d, yyyy")}\nRating: ${test.rating?.toUpperCase()}\nN: ${test.nitrogen} P: ${test.phosphorus} K: ${test.potassium} pH: ${test.ph}\n\n${a?.summary ?? ""}\n\nAnalysed with TerraIQ+`;
    if (navigator.share) navigator.share({ title:"TerraIQ+ Soil Test", text });
    else navigator.clipboard?.writeText(text);
  };

  if (loading) return (
    <div className="space-y-2">
      {[1,2,3].map(i => <div key={i} className="bg-white dark:bg-dark-surface rounded-2xl p-4 border border-deep-light dark:border-dark-light animate-pulse h-20" />)}
    </div>
  );

  if (tests.length === 0) return (
    <div className="bg-white dark:bg-dark-surface rounded-2xl border border-deep-light dark:border-dark-light p-10 text-center shadow-card">
      <p className="text-ink dark:text-white font-bold">No soil tests yet</p>
      <p className="text-ink-500 dark:text-gray-400 text-sm mt-1">Analyse your soil from the Soil page to see results here.</p>
    </div>
  );

  return (
    <div className="space-y-3">
      {tests.map(test => {
        const a = test.analysis ? (() => { try { return JSON.parse(test.analysis); } catch { return null; } })() : null;
        const isOpen = selected === test.id;
        return (
          <div key={test.id} onClick={() => setSelected(isOpen ? null : test.id)}
            className="bg-white dark:bg-dark-surface rounded-2xl border border-deep-light dark:border-dark-light shadow-card cursor-pointer hover:border-terra transition-colors overflow-hidden">
            <div className="p-4 flex justify-between items-start">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className={`text-xs px-2.5 py-0.5 rounded-lg font-bold capitalize ${SOIL_RATING[norm(test.rating)] ?? SOIL_RATING.fair}`}>
                    {test.rating ?? "fair"}
                  </span>
                  <span className="text-ink-500 dark:text-gray-500 text-xs">{format(new Date(test.created_at), "MMM d, yyyy")}</span>
                </div>
                {/* NPK summary */}
                <div className="flex flex-wrap gap-3 mt-2">
                  {[["N", test.nitrogen, "mg/kg"],["P", test.phosphorus, "mg/kg"],["K", test.potassium, "mg/kg"],["pH", test.ph, ""]].map(([l,v,u]) => (
                    v != null && <div key={l} className="text-center">
                      <p className="text-terra font-black text-sm">{l}</p>
                      <p className="text-ink dark:text-white text-xs font-bold">{v}{u}</p>
                    </div>
                  ))}
                </div>
                {a?.summary && <p className="text-ink-500 dark:text-gray-400 text-xs mt-2 line-clamp-2">{a.summary}</p>}
              </div>
              <div className="text-right ml-3 shrink-0">
                <div className="text-2xl font-black" style={{ color: norm(test.rating)==="excellent"||norm(test.rating)==="good" ? "#1E8A4C" : norm(test.rating)==="poor" ? "#C0392B" : "#E07B00" }}>
                  {(norm(test.rating)==="excellent"||norm(test.rating)==="good") ? "◎" : norm(test.rating)==="poor" ? "!" : "~"}
                </div>
              </div>
            </div>

            {isOpen && a && (
              <div className="border-t border-deep-light dark:border-dark-light bg-deep-mid dark:bg-dark-mid p-4 space-y-3" onClick={e=>e.stopPropagation()}>
                {/* Best crops */}
                {a.best_crops?.length > 0 && (
                  <div>
                    <p className="text-ink dark:text-white font-bold text-xs mb-2 uppercase">Best Crops for this Soil</p>
                    <div className="flex flex-wrap gap-2">
                      {a.best_crops.map(c => <span key={c} className="bg-terra-light dark:bg-terra/20 text-terra text-xs px-2.5 py-1 rounded-lg font-semibold">{c}</span>)}
                    </div>
                  </div>
                )}

                {/* Improvement steps */}
                {a.improvement_steps?.length > 0 && (
                  <div className="bg-white dark:bg-dark-surface rounded-xl p-3 border border-deep-light dark:border-dark-light">
                    <p className="text-ink dark:text-white font-bold text-xs mb-2 uppercase">Improvement Steps</p>
                    <ol className="space-y-1.5">
                      {a.improvement_steps.map((s,i) => <li key={i} className="flex gap-2 text-sm text-ink-500 dark:text-gray-300"><span className="text-terra font-bold shrink-0">{i+1}.</span><span>{s}</span></li>)}
                    </ol>
                  </div>
                )}

                {/* Allamanda recommendations */}
                {a.fertilizer_recommendation && (
                  <div className="bg-amber/5 border border-amber/20 rounded-xl p-3">
                    <p className="text-amber font-bold text-xs mb-2 uppercase">Allamanda Recommendations</p>
                    {["compost","biochar","supplements"].map(k => {
                      const item = a.fertilizer_recommendation[k];
                      if (!item) return null;
                      return <p key={k} className="text-ink-500 dark:text-gray-300 text-xs mb-1">• {item.name ?? k}: {item.rate ?? ""}</p>;
                    })}
                  </div>
                )}

                <button onClick={() => shareSoil(test)} className="w-full bg-terra text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-terra-dark transition-colors">
                  Share Soil Result
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main History Page ─────────────────────────────────────────────────
export default function HistoryPage() {
  const [tab, setTab] = useState("scans");

  return (
    <Layout>
      <h1 className="text-ink dark:text-white text-2xl font-black mb-1">History</h1>
      <p className="text-ink-500 dark:text-gray-400 text-sm mb-4">All your scan and soil analysis records</p>

      {/* Segment tabs */}
      <div className="flex gap-2 mb-5 p-1 bg-deep-mid dark:bg-dark-mid rounded-2xl">
        <button onClick={() => setTab("scans")}
          className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${tab==="scans" ? "bg-white dark:bg-dark-surface text-ink dark:text-white shadow-sm" : "text-ink-500 dark:text-gray-400"}`}>
          Crop Scans
        </button>
        <button onClick={() => setTab("soil")}
          className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${tab==="soil" ? "bg-white dark:bg-dark-surface text-ink dark:text-white shadow-sm" : "text-ink-500 dark:text-gray-400"}`}>
          Soil Tests
        </button>
      </div>

      {tab === "scans" && <ScanHistory />}
      {tab === "soil"  && <SoilHistory />}
    </Layout>
  );
}
