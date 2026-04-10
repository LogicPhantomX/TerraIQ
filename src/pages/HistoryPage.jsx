// ─── src/pages/HistoryPage.jsx ────────────────────────────────────────
// FAST: loads only 20 scans, no treatment_plan (too heavy), lazy-expands
// image_url shown from DB column (Supabase Storage public URL)

import { useState, useEffect, useCallback } from "react";
import Layout from "@/components/Layout";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import { generateScanReport, generateSoilReport } from "@/lib/generateReport";
import toast from "react-hot-toast";

function norm(v) { return (v ?? "").toString().toLowerCase().trim(); }

const SEV_COLOR = { none:"#22C55E", low:"#22C55E", moderate:"#EAB308", high:"#F97316", critical:"#EF4444" };
const SEV_LABEL = { none:"Healthy ✓", low:"Low", moderate:"Moderate", high:"High", critical:"Critical!" };
const SOIL_BG   = { excellent:"#16A34A22", good:"#22C55E22", fair:"#F59E0B22", poor:"#EF444422" };
const SOIL_COL  = { excellent:"#16A34A",   good:"#22C55E",   fair:"#F59E0B",   poor:"#EF4444"   };

// ── Tiny confidence bar ───────────────────────────────────────────────
function Bar({ pct, color }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:5 }}>
      <div style={{ flex:1, height:4, borderRadius:2, background:"#E5E7EB", overflow:"hidden" }}>
        <div style={{ width:`${Math.min(100,pct||0)}%`, height:"100%", background:color, borderRadius:2 }} />
      </div>
      <span style={{ fontSize:10, fontWeight:700, color, minWidth:26 }}>{Math.round(pct||0)}%</span>
    </div>
  );
}

// ── Severity badge ────────────────────────────────────────────────────
function SevBadge({ severity }) {
  const s = norm(severity) || "none";
  const c = SEV_COLOR[s] || SEV_COLOR.none;
  return (
    <span style={{ fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:20,
      background:c+"22", color:c, border:`1px solid ${c}44` }}>
      {SEV_LABEL[s] || s}
    </span>
  );
}

// ══════════════════════════════════════════════════════════════════════
// SCAN HISTORY — fast, lightweight
// ══════════════════════════════════════════════════════════════════════
function ScanHistory() {
  const { t }  = useTranslation();
  const [scans,    setScans]    = useState([]);
  const [profile,  setProfile]  = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState("all");
  const [selected, setSelected] = useState(null);
  const [detail,   setDetail]   = useState({});   // { [id]: parsedPlan }
  const [loadingDetail, setLoadingDetail] = useState(null);
  const [page,     setPage]     = useState(0);
  const PAGE = 15;

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { setLoading(false); return; }
      const uid = session.user.id;

      // Fetch LIGHT columns only — no treatment_plan (heavy JSON)
      // treatment_plan loaded on-demand when user taps a card
      const [{ data: scansData }, { data: profileData }] = await Promise.all([
        supabase.from("scans")
          .select("id,crop,scan_type,result,severity,confidence,created_at,image_url")
          .eq("user_id", uid)
          .order("created_at", { ascending: false })
          .limit(100),
        supabase.from("profiles")
          .select("full_name,region,city")
          .eq("id", uid)
          .single(),
      ]);

      setScans(scansData ?? []);
      setProfile(profileData);
      setLoading(false);
    })();
  }, []);

  // Load treatment_plan lazily — only when card is tapped
  const loadDetail = useCallback(async (scanId) => {
    if (detail[scanId] !== undefined) return; // already loaded
    setLoadingDetail(scanId);
    const { data } = await supabase.from("scans")
      .select("treatment_plan")
      .eq("id", scanId)
      .single();
    let plan = null;
    if (data?.treatment_plan) {
      try { plan = JSON.parse(data.treatment_plan); } catch {}
    }
    setDetail(prev => ({ ...prev, [scanId]: plan }));
    setLoadingDetail(null);
  }, [detail]);

  const handleTap = (scanId) => {
    if (selected === scanId) { setSelected(null); return; }
    setSelected(scanId);
    loadDetail(scanId);
  };

  // Client-side filter
  const filtered = scans.filter(s => {
    if (filter === "all")     return true;
    if (filter === "healthy") return norm(s.severity) === "none" || !s.severity;
    if (filter === "weed")    return norm(s.scan_type) === "weed";
    if (filter === "disease") return norm(s.scan_type) === "disease" || norm(s.scan_type) === "pest";
    return true;
  });

  const pageScans  = filtered.slice(page * PAGE, (page + 1) * PAGE);
  const totalPages = Math.ceil(filtered.length / PAGE);

  // Quick stats (from already-loaded light data)
  const total   = scans.length;
  const healthy = scans.filter(s => !s.severity || norm(s.severity) === "none").length;
  const disease = scans.filter(s => norm(s.scan_type) === "disease").length;
  const weed    = scans.filter(s => norm(s.scan_type) === "weed").length;
  const avgConf = total ? Math.round(scans.reduce((a,s)=>a+(+s.confidence||0),0)/total) : 0;

  if (loading) return (
    <div className="space-y-2">
      {[1,2,3,4].map(i=>(
        <div key={i} style={{ height:72, borderRadius:16, background:"#E5E7EB", animation:"pulse 1.5s ease-in-out infinite" }} />
      ))}
    </div>
  );

  return (
    <div>
      {/* Stats row — instant, no extra fetch */}
      {total > 0 && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8, marginBottom:12 }}>
          {[
            { label:"Total",   val:total,   color:"#1E8A4C" },
            { label:"Healthy", val:healthy, color:"#22C55E" },
            { label:"Disease", val:disease, color:"#F97316" },
            { label:"Avg Conf",val:`${avgConf}%`, color:"#8B5CF6" },
          ].map(({ label, val, color }) => (
            <div key={label} className="bg-white dark:bg-dark-surface rounded-xl border border-deep-light dark:border-dark-light p-3 text-center shadow-sm">
              <div style={{ fontSize:22, fontWeight:900, color }}>{val}</div>
              <div style={{ fontSize:10, color:"#9CA3AF", marginTop:2 }}>{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filter pills */}
      <div style={{ display:"flex", gap:6, marginBottom:12, overflowX:"auto" }}>
        {[["all",`All (${total})`],["healthy","Healthy"],["disease","Disease"],["weed","Weed"]].map(([k,l])=>(
          <button key={k} onClick={()=>{ setFilter(k); setPage(0); }} style={{
            flexShrink:0, padding:"5px 14px", borderRadius:20, fontSize:11, fontWeight:600,
            border:"1.5px solid", cursor:"pointer", whiteSpace:"nowrap",
            background: filter===k?"#1E8A4C":"transparent",
            color: filter===k?"white":"#5A6B62",
            borderColor: filter===k?"#1E8A4C":"#D1D9D4",
          }}>{l}</button>
        ))}
      </div>

      {pageScans.length === 0 ? (
        <div className="bg-white dark:bg-dark-surface rounded-2xl border border-deep-light dark:border-dark-light p-10 text-center">
          <div style={{ fontSize:36 }}>🌿</div>
          <p className="text-ink dark:text-white font-bold mt-2">No scans here</p>
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {pageScans.map(scan => {
            const sev     = norm(scan.severity) || "none";
            const isOpen  = selected === scan.id;
            const plan    = detail[scan.id];
            const loading = loadingDetail === scan.id;
            const typeIcon = sev==="none" ? "🌿" : norm(scan.scan_type)==="weed" ? "🌾" : "🔬";

            return (
              <div key={scan.id}
                onClick={() => handleTap(scan.id)}
                className="bg-white dark:bg-dark-surface rounded-2xl border border-deep-light dark:border-dark-light shadow-sm cursor-pointer hover:border-terra transition-colors overflow-hidden"
              >
                {/* Card header — always visible */}
                <div style={{ display:"flex", alignItems:"center", gap:10, padding:"11px 13px" }}>

                  {/* Plant image or icon */}
                  <div style={{ width:48, height:48, borderRadius:10, overflow:"hidden", flexShrink:0,
                    background:"#E8F0ED", display:"flex", alignItems:"center", justifyContent:"center" }}>
                    {scan.image_url
                      ? <img src={scan.image_url} alt={scan.crop}
                          loading="lazy"
                          style={{ width:"100%", height:"100%", objectFit:"cover" }}
                          onError={e=>{ e.target.style.display="none"; e.target.parentNode.querySelector("span").style.display="flex"; }}
                        />
                      : null
                    }
                    <span style={{ fontSize:20, display:scan.image_url?"none":"flex",
                      width:"100%", height:"100%", alignItems:"center", justifyContent:"center" }}>
                      {typeIcon}
                    </span>
                  </div>

                  {/* Info */}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:"flex", gap:4, marginBottom:4, flexWrap:"wrap", alignItems:"center" }}>
                      <SevBadge severity={scan.severity} />
                      <span style={{ fontSize:10, padding:"2px 7px", borderRadius:6, fontWeight:600,
                        background:"#F1F5F2", color:"#5A6B62" }}>
                        {norm(scan.scan_type) || "scan"}
                      </span>
                    </div>
                    <p style={{ fontSize:13, fontWeight:700, overflow:"hidden", textOverflow:"ellipsis",
                      whiteSpace:"nowrap" }} className="text-ink dark:text-white">
                      {scan.crop || "Unknown plant"}
                    </p>
                    <p style={{ fontSize:11, marginTop:2, overflow:"hidden", textOverflow:"ellipsis",
                      whiteSpace:"nowrap", color:"#9CA3AF" }}>
                      {scan.result || "—"} · {format(new Date(scan.created_at),"MMM d, yyyy")}
                    </p>
                    <div style={{ marginTop:4 }}>
                      <Bar pct={scan.confidence||0} color={SEV_COLOR[sev]||"#1E8A4C"} />
                    </div>
                  </div>

                  <span style={{ color:"#9CA3AF", fontSize:14, flexShrink:0 }}>{isOpen?"▲":"▼"}</span>
                </div>

                {/* Expanded detail — loaded on demand */}
                {isOpen && (
                  <div className="border-t border-deep-light dark:border-dark-light bg-deep-mid dark:bg-dark-mid"
                    style={{ padding:14 }}
                    onClick={e => e.stopPropagation()}
                  >
                    {loading ? (
                      <div style={{ textAlign:"center", padding:"20px 0", color:"#9CA3AF", fontSize:13 }}>
                        Loading details...
                      </div>
                    ) : plan ? (
                      <>
                        {/* Health summary */}
                        {plan.health_summary && (
                          <div style={{ background:SEV_COLOR[sev]+"18", border:`1px solid ${SEV_COLOR[sev]}33`,
                            borderRadius:10, padding:"10px 12px", marginBottom:10 }}>
                            <p style={{ fontSize:11, fontWeight:700, color:SEV_COLOR[sev], marginBottom:3, textTransform:"uppercase" }}>Health Summary</p>
                            <p className="text-ink dark:text-white" style={{ fontSize:13 }}>{plan.health_summary}</p>
                          </div>
                        )}

                        {/* Immediate action */}
                        {plan.immediate_action && (
                          <div style={{ background:"#FEF3C722", border:"1px solid #FDE68A", borderRadius:10,
                            padding:"10px 12px", marginBottom:10 }}>
                            <p style={{ fontSize:11, fontWeight:700, color:"#92400E", marginBottom:4 }}>⚡ Immediate Action</p>
                            <p style={{ fontSize:13, color:"#78350F" }}>{plan.immediate_action}</p>
                          </div>
                        )}

                        {/* Treatment steps */}
                        {plan.steps?.length > 0 && (
                          <div className="bg-white dark:bg-dark-surface rounded-xl p-3 border border-deep-light dark:border-dark-light" style={{ marginBottom:10 }}>
                            <p style={{ fontSize:11, fontWeight:700, textTransform:"uppercase", marginBottom:8 }}
                               className="text-ink dark:text-white">Treatment Steps</p>
                            {plan.steps.map((s,i) => (
                              <div key={i} style={{ display:"flex", gap:8, marginBottom:6 }}>
                                <div style={{ width:18, height:18, borderRadius:"50%", background:"#1E8A4C",
                                  color:"white", fontSize:10, fontWeight:700, display:"flex", alignItems:"center",
                                  justifyContent:"center", flexShrink:0 }}>{i+1}</div>
                                <p style={{ fontSize:12, color:"#6B7280" }}>{s}</p>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Local products */}
                        {plan.local_products?.length > 0 && (
                          <div className="bg-white dark:bg-dark-surface rounded-xl p-3 border border-deep-light dark:border-dark-light" style={{ marginBottom:10 }}>
                            <p style={{ fontSize:11, fontWeight:700, textTransform:"uppercase", marginBottom:8 }}
                               className="text-ink dark:text-white">Local Products</p>
                            {plan.local_products.map((prod,i) => (
                              <div key={i} style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                                <div>
                                  <p style={{ fontSize:12, fontWeight:600 }} className="text-ink dark:text-white">{prod.name}</p>
                                  <p style={{ fontSize:11, color:"#9CA3AF" }}>{prod.where}</p>
                                </div>
                                <p style={{ fontSize:12, fontWeight:700, color:"#1E8A4C" }}>
                                  ₦{prod.price_naira?.toLocaleString()}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Organic + prevention */}
                        {plan.organic_option && (
                          <div style={{ background:"#F0FDF422", border:"1px solid #BBF7D0", borderRadius:10,
                            padding:"8px 12px", marginBottom:8 }}>
                            <p style={{ fontSize:11, fontWeight:700, color:"#15803D", marginBottom:3 }}>🌿 Organic Option</p>
                            <p style={{ fontSize:12, color:"#166534" }}>{plan.organic_option}</p>
                          </div>
                        )}
                        {plan.prevention && (
                          <p style={{ fontSize:11, color:"#9CA3AF", marginBottom:10 }}>
                            <strong style={{ color:"#6B7280" }}>Prevention: </strong>{plan.prevention}
                          </p>
                        )}

                        {/* PDF download */}
                        <button
                          onClick={async () => {
                            const tid = toast.loading("Generating PDF...");
                            try {
                              await generateScanReport({
                                result: plan,
                                farmerName: profile?.full_name,
                                location: [profile?.city, profile?.region].filter(Boolean).join(", ") || "Nigeria",
                                imageDataUrl: scan.image_url || undefined,
                              });
                              toast.dismiss(tid);
                              toast.success("PDF downloaded!");
                            } catch {
                              toast.dismiss(tid);
                              toast.error("Could not generate PDF");
                            }
                          }}
                          className="w-full bg-terra text-white rounded-xl py-2.5 text-sm font-bold hover:bg-terra-dark transition-colors flex items-center justify-center gap-2"
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/>
                          </svg>
                          Download PDF Report
                        </button>
                      </>
                    ) : (
                      <div style={{ textAlign:"center", padding:"12px 0" }}>
                        <p style={{ fontSize:12, color:"#9CA3AF" }}>No detailed report for this scan.</p>
                        <p style={{ fontSize:11, color:"#9CA3AF", marginTop:4 }}>Diagnosis: {scan.result}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination — load 15 at a time */}
      {totalPages > 1 && (
        <div style={{ display:"flex", justifyContent:"center", gap:8, marginTop:16 }}>
          {page > 0 && (
            <button onClick={()=>setPage(p=>p-1)}
              className="bg-white dark:bg-dark-surface border border-deep-light dark:border-dark-light rounded-xl px-4 py-2 text-sm font-semibold text-ink-500 dark:text-gray-400 hover:border-terra">
              ← Newer
            </button>
          )}
          <span style={{ fontSize:12, color:"#9CA3AF", alignSelf:"center" }}>
            {page+1} of {totalPages}
          </span>
          {page < totalPages-1 && (
            <button onClick={()=>setPage(p=>p+1)}
              className="bg-white dark:bg-dark-surface border border-deep-light dark:border-dark-light rounded-xl px-4 py-2 text-sm font-semibold text-ink-500 dark:text-gray-400 hover:border-terra">
              Older →
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// SOIL HISTORY — fast, shows NPK bars from DB columns directly
// ══════════════════════════════════════════════════════════════════════
function SoilHistory() {
  const { t }  = useTranslation();
  const [tests,    setTests]    = useState([]);
  const [profile,  setProfile]  = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [selected, setSelected] = useState(null);
  const [detail,   setDetail]   = useState({});
  const [loadingDetail, setLoadingDetail] = useState(null);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { setLoading(false); return; }
      const uid = session.user.id;

      // Light select — no analysis JSON
      const [{ data: testsData }, { data: profileData }] = await Promise.all([
        supabase.from("soil_tests")
          .select("id,nitrogen,phosphorus,potassium,ph,moisture,organic_carbon,rating,created_at")
          .eq("user_id", uid)
          .order("created_at", { ascending:false })
          .limit(30),
        supabase.from("profiles")
          .select("full_name,region,city")
          .eq("id", uid)
          .single(),
      ]);

      setTests(testsData ?? []);
      setProfile(profileData);
      setLoading(false);
    })();
  }, []);

  const loadDetail = useCallback(async (id) => {
    if (detail[id] !== undefined) return;
    setLoadingDetail(id);
    const { data } = await supabase.from("soil_tests")
      .select("analysis")
      .eq("id", id)
      .single();
    let a = null;
    if (data?.analysis) { try { a = JSON.parse(data.analysis); } catch {} }
    setDetail(prev => ({ ...prev, [id]: a }));
    setLoadingDetail(null);
  }, [detail]);

  const handleTap = (id) => {
    if (selected === id) { setSelected(null); return; }
    setSelected(id);
    loadDetail(id);
  };

  if (loading) return (
    <div className="space-y-2">
      {[1,2,3].map(i=>(
        <div key={i} style={{ height:80, borderRadius:16, background:"#E5E7EB", animation:"pulse 1.5s ease-in-out infinite" }} />
      ))}
    </div>
  );

  if (tests.length === 0) return (
    <div className="bg-white dark:bg-dark-surface rounded-2xl border border-deep-light dark:border-dark-light p-10 text-center">
      <div style={{ fontSize:36 }}>🌱</div>
      <p className="text-ink dark:text-white font-bold mt-2">No soil tests yet</p>
      <p style={{ fontSize:12, color:"#9CA3AF", marginTop:4 }}>Analyse your soil to see results here</p>
    </div>
  );

  const PCOL = { nitrogen:"#3B82F6", phosphorus:"#F59E0B", potassium:"#F97316", ph:"#8B5CF6" };
  const PMAX = { nitrogen:400, phosphorus:50, potassium:400, ph:9 };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
      {tests.map(test => {
        const rating   = norm(test.rating) || "fair";
        const isOpen   = selected === test.id;
        const analysis = detail[test.id];
        const loading  = loadingDetail === test.id;
        const grade    = { excellent:"A", good:"B", fair:"C", poor:"D" }[rating] || "C";

        return (
          <div key={test.id}
            onClick={() => handleTap(test.id)}
            className="bg-white dark:bg-dark-surface rounded-2xl border border-deep-light dark:border-dark-light shadow-sm cursor-pointer hover:border-terra transition-colors overflow-hidden"
          >
            <div style={{ padding:"12px 14px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                <div style={{ flex:1 }}>
                  {/* Rating + date */}
                  <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:8 }}>
                    <span style={{ fontSize:10, fontWeight:700, padding:"2px 10px", borderRadius:20,
                      background:SOIL_BG[rating], color:SOIL_COL[rating], border:`1px solid ${SOIL_COL[rating]}44` }}>
                      {rating.toUpperCase()}
                    </span>
                    <span style={{ fontSize:10, color:"#9CA3AF" }}>
                      {format(new Date(test.created_at), "MMM d, yyyy")}
                    </span>
                  </div>

                  {/* NPK mini bars — built from DB columns, no JSON parse */}
                  <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                    {[["nitrogen","N"],["phosphorus","P"],["potassium","K"],["ph","pH"]].map(([key,lbl])=> {
                      const val = test[key];
                      if (!val) return null;
                      const pct = Math.min(100, (val / PMAX[key]) * 100);
                      return (
                        <div key={key} style={{ display:"flex", alignItems:"center", gap:6 }}>
                          <span style={{ width:18, fontSize:9, fontWeight:800, color:PCOL[key] }}>{lbl}</span>
                          <div style={{ flex:1, height:5, borderRadius:3, background:"#E5E7EB", overflow:"hidden" }}>
                            <div style={{ width:`${pct}%`, height:"100%", background:PCOL[key], borderRadius:3 }} />
                          </div>
                          <span style={{ width:52, fontSize:9, fontWeight:600, color:PCOL[key] }}>
                            {val}{key==="ph" ? "" : " mg/kg"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Grade */}
                <div style={{ textAlign:"center", marginLeft:14, flexShrink:0 }}>
                  <div style={{ fontSize:28, fontWeight:900, color:SOIL_COL[rating] }}>{grade}</div>
                  <div style={{ fontSize:8, color:"#9CA3AF" }}>GRADE</div>
                  <div style={{ fontSize:10, color:"#9CA3AF", marginTop:6 }}>{isOpen?"▲":"▼"}</div>
                </div>
              </div>
            </div>

            {/* Expanded detail */}
            {isOpen && (
              <div className="border-t border-deep-light dark:border-dark-light bg-deep-mid dark:bg-dark-mid"
                style={{ padding:14 }}
                onClick={e => e.stopPropagation()}
              >
                {loading ? (
                  <div style={{ textAlign:"center", padding:"16px 0", color:"#9CA3AF", fontSize:13 }}>Loading analysis...</div>
                ) : analysis ? (
                  <>
                    {/* Summary */}
                    {analysis.summary && (
                      <p style={{ fontSize:12, color:"#6B7280", marginBottom:10, lineHeight:1.5 }}>{analysis.summary}</p>
                    )}

                    {/* Best crops */}
                    {analysis.best_crops?.length > 0 && (
                      <div style={{ marginBottom:10 }}>
                        <p style={{ fontSize:11, fontWeight:700, textTransform:"uppercase", marginBottom:6 }}
                           className="text-ink dark:text-white">Best Crops</p>
                        <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                          {analysis.best_crops.map(c => (
                            <span key={c} style={{ fontSize:11, fontWeight:600, padding:"3px 10px", borderRadius:20,
                              background:"#22C55E22", color:"#16A34A", border:"1px solid #22C55E44" }}>{c}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Improvement steps */}
                    {analysis.improvement_steps?.length > 0 && (
                      <div className="bg-white dark:bg-dark-surface rounded-xl p-3 border border-deep-light dark:border-dark-light" style={{ marginBottom:10 }}>
                        <p style={{ fontSize:11, fontWeight:700, textTransform:"uppercase", marginBottom:6 }}
                           className="text-ink dark:text-white">Action Plan</p>
                        {analysis.improvement_steps.map((s,i) => (
                          <div key={i} style={{ display:"flex", gap:8, marginBottom:5 }}>
                            <div style={{ width:18, height:18, borderRadius:"50%", background:"#1E8A4C",
                              color:"white", fontSize:10, fontWeight:700, display:"flex", alignItems:"center",
                              justifyContent:"center", flexShrink:0 }}>{i+1}</div>
                            <p style={{ fontSize:12, color:"#6B7280" }}>{s}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Season advice */}
                    {analysis.season_advice && (
                      <p style={{ fontSize:11, color:"#9CA3AF", marginBottom:10 }}>
                        <strong style={{ color:"#6B7280" }}>Season: </strong>{analysis.season_advice}
                      </p>
                    )}

                    {/* PDF download */}
                    <button
                      onClick={async () => {
                        const tid = toast.loading("Generating PDF...");
                        try {
                          await generateSoilReport({
                            result: analysis,
                            params: {
                              nitrogen: test.nitrogen, phosphorus: test.phosphorus,
                              potassium: test.potassium, ph: test.ph,
                              moisture: test.moisture, organic_carbon: test.organic_carbon,
                            },
                            farmerName: profile?.full_name,
                            location: [profile?.city, profile?.region].filter(Boolean).join(", ") || "Nigeria",
                          });
                          toast.dismiss(tid);
                          toast.success("PDF downloaded!");
                        } catch {
                          toast.dismiss(tid);
                          toast.error("Could not generate PDF");
                        }
                      }}
                      className="w-full bg-terra text-white rounded-xl py-2.5 text-sm font-bold hover:bg-terra-dark transition-colors flex items-center justify-center gap-2"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/>
                      </svg>
                      Download PDF Report
                    </button>
                  </>
                ) : (
                  <div style={{ textAlign:"center", padding:"12px 0" }}>
                    <p style={{ fontSize:12, color:"#9CA3AF" }}>
                      Full analysis not stored for this test.
                    </p>
                    <p style={{ fontSize:11, color:"#9CA3AF", marginTop:4 }}>
                      N:{test.nitrogen} · P:{test.phosphorus} · K:{test.potassium} · pH:{test.ph}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════════
export default function HistoryPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState("scans");

  return (
    <Layout>
      <h1 className="text-ink dark:text-white text-2xl font-black mb-1">History</h1>
      <p className="text-ink-500 dark:text-gray-400 text-sm mb-4">
        {t("common.historySubtitle") || "All your scan and soil analysis records"}
      </p>

      {/* Tab selector */}
      <div className="flex gap-2 mb-5 p-1 bg-deep-mid dark:bg-dark-mid rounded-2xl">
        <button onClick={() => setTab("scans")}
          className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
            tab==="scans" ? "bg-white dark:bg-dark-surface text-ink dark:text-white shadow-sm" : "text-ink-500 dark:text-gray-400"
          }`}>
          🌿 Crop Scans
        </button>
        <button onClick={() => setTab("soil")}
          className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
            tab==="soil" ? "bg-white dark:bg-dark-surface text-ink dark:text-white shadow-sm" : "text-ink-500 dark:text-gray-400"
          }`}>
          🌱 Soil Tests
        </button>
      </div>

      {tab === "scans" && <ScanHistory />}
      {tab === "soil"  && <SoilHistory />}
    </Layout>
  );
}
