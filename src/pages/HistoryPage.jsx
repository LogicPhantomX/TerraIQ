// ─── src/pages/HistoryPage.jsx ────────────────────────────────────────
// Fast: light select on load, lazy-fetch detail on tap
// Clean card UI with real plant image thumbnail

import { useState, useEffect, useCallback } from "react";
import Layout from "@/components/Layout";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import { generateScanReport, generateSoilReport } from "@/lib/generateReport";
import toast from "react-hot-toast";

function norm(v) { return (v ?? "").toString().toLowerCase().trim(); }

const SEV_COLOR = { none:"#22C55E", low:"#22C55E", moderate:"#F59E0B", high:"#F97316", critical:"#EF4444" };
const SEV_LABEL = { none:"Healthy", low:"Low", moderate:"Moderate", high:"High", critical:"Critical" };
const SOIL_COL  = { excellent:"#16A34A", good:"#22C55E", fair:"#F59E0B", poor:"#EF4444" };
const SOIL_GRADE = { excellent:"A", good:"B", fair:"C", poor:"D" };
const PCOL      = { nitrogen:"#3B82F6", phosphorus:"#F59E0B", potassium:"#F97316", ph:"#8B5CF6" };

// ══════════════════════════════════════════════════════════════════════
function ScanHistory() {
  const { t } = useTranslation();
  const [scans,         setScans]         = useState([]);
  const [profile,       setProfile]       = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [filter,        setFilter]        = useState("all");
  const [selected,      setSelected]      = useState(null);
  const [detail,        setDetail]        = useState({});
  const [loadingDetail, setLoadingDetail] = useState(null);
  const [page,          setPage]          = useState(0);
  const PAGE = 15;

  useEffect(() => {
    (async () => {
      const { data:{ session } } = await supabase.auth.getSession();
      if (!session?.user) { setLoading(false); return; }
      const uid = session.user.id;
      const [{ data:scansData }, { data:profileData }] = await Promise.all([
        supabase.from("scans")
          .select("id,crop,scan_type,result,severity,confidence,created_at,image_url")
          .eq("user_id", uid)
          .order("created_at", { ascending:false })
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

  const loadDetail = useCallback(async (id) => {
    if (detail[id] !== undefined) return;
    setLoadingDetail(id);
    const { data } = await supabase.from("scans").select("treatment_plan").eq("id", id).single();
    let plan = null;
    if (data?.treatment_plan) { try { plan = JSON.parse(data.treatment_plan); } catch {} }
    setDetail(prev => ({ ...prev, [id]: plan }));
    setLoadingDetail(null);
  }, [detail]);

  const handleTap = (id) => {
    if (selected === id) { setSelected(null); return; }
    setSelected(id);
    loadDetail(id);
  };

  const filtered = scans.filter(s => {
    if (filter === "all")     return true;
    if (filter === "healthy") return !s.severity || norm(s.severity) === "none";
    if (filter === "weed")    return norm(s.scan_type) === "weed";
    if (filter === "disease") return norm(s.scan_type) === "disease" || norm(s.scan_type) === "pest";
    return true;
  });

  const pageScans  = filtered.slice(page * PAGE, (page + 1) * PAGE);
  const totalPages = Math.ceil(filtered.length / PAGE);
  const total      = scans.length;
  const healthy    = scans.filter(s => !s.severity || norm(s.severity) === "none").length;
  const disease    = scans.filter(s => norm(s.scan_type) === "disease").length;
  const weed       = scans.filter(s => norm(s.scan_type) === "weed").length;

  if (loading) return (
    <div className="space-y-3">
      {[1,2,3].map(i => (
        <div key={i} className="bg-white dark:bg-dark-surface rounded-2xl border border-deep-light dark:border-dark-light overflow-hidden animate-pulse">
          <div className="flex gap-3 p-4">
            <div className="w-16 h-16 rounded-xl bg-deep-light dark:bg-dark-light shrink-0"/>
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-deep-light dark:bg-dark-light rounded w-20"/>
              <div className="h-4 bg-deep-light dark:bg-dark-light rounded w-36"/>
              <div className="h-3 bg-deep-light dark:bg-dark-light rounded w-28"/>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div>
      {/* Stats */}
      {total > 0 && (
        <div className="grid grid-cols-4 gap-2 mb-4">
          {[
            { label:t("common.healthy")||"Healthy", val:healthy, color:"#22C55E" },
            { label:t("common.disease")||"Disease", val:disease, color:"#F97316" },
            { label:t("common.weed")||"Weed",       val:weed,    color:"#F59E0B" },
            { label:"Total",                         val:total,   color:"#1E8A4C" },
          ].map(({ label, val, color }) => (
            <div key={label} className="bg-white dark:bg-dark-surface rounded-xl border border-deep-light dark:border-dark-light p-3 text-center shadow-sm">
              <p style={{ fontSize:22, fontWeight:900, color }}>{val}</p>
              <p style={{ fontSize:10, color:"#9CA3AF", marginTop:1 }}>{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filter pills */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {[["all", `All (${total})`],["healthy", t("common.healthy")||"Healthy"],["disease", t("common.disease")||"Disease"],["weed", t("common.weed")||"Weed"]].map(([k,l]) => (
          <button key={k} onClick={() => { setFilter(k); setPage(0); }}
            className="shrink-0 px-4 py-1.5 rounded-full text-xs font-bold border transition-all"
            style={{
              background: filter===k ? "#1E8A4C" : "transparent",
              color:      filter===k ? "white"   : "#5A6B62",
              borderColor:filter===k ? "#1E8A4C" : "#D1D9D4",
            }}>
            {l}
          </button>
        ))}
      </div>

      {/* Cards */}
      {pageScans.length === 0 ? (
        <div className="bg-white dark:bg-dark-surface rounded-2xl border border-deep-light dark:border-dark-light p-12 text-center">
          <div className="text-4xl mb-2">🌿</div>
          <p className="text-ink dark:text-white font-bold">{t("dashboard.noScans")||"No scans yet"}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pageScans.map(scan => {
            const sev    = norm(scan.severity) || "none";
            const isOpen = selected === scan.id;
            const plan   = detail[scan.id];
            const busy   = loadingDetail === scan.id;
            const sevC   = SEV_COLOR[sev] || "#22C55E";
            const icon   = sev === "none" ? "🌿" : norm(scan.scan_type) === "weed" ? "🌾" : "🔬";

            return (
              <div key={scan.id}
                className="bg-white dark:bg-dark-surface rounded-2xl border border-deep-light dark:border-dark-light shadow-card overflow-hidden cursor-pointer hover:border-terra transition-colors"
                onClick={() => handleTap(scan.id)}
              >
                {/* ── Card row ── */}
                <div className="flex gap-3 p-4">

                  {/* Plant image thumbnail */}
                  <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 relative"
                    style={{ background:"#E8F0ED" }}>
                    {scan.image_url ? (
                      <img
                        src={scan.image_url}
                        alt={scan.crop}
                        loading="lazy"
                        className="w-full h-full object-cover"
                        onError={e => { e.target.style.display="none"; }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl">{icon}</div>
                    )}
                    {/* Severity dot overlay */}
                    <div className="absolute bottom-1 right-1 w-3 h-3 rounded-full border-2 border-white"
                      style={{ background: sevC }} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    {/* Crop name */}
                    <p className="text-ink dark:text-white font-bold text-sm truncate">{scan.crop || "Unknown plant"}</p>

                    {/* Diagnosis */}
                    <p className="text-ink-500 dark:text-gray-400 text-xs truncate mt-0.5">{scan.result || "—"}</p>

                    {/* Date + scan type */}
                    <p className="text-ink-500 dark:text-gray-500 text-xs mt-1">
                      {format(new Date(scan.created_at), "MMM d, yyyy")}
                      {" · "}
                      <span className="capitalize">{scan.scan_type || "scan"}</span>
                    </p>

                    {/* Confidence bar */}
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex-1 h-1.5 rounded-full bg-deep-light dark:bg-dark-light overflow-hidden">
                        <div className="h-full rounded-full transition-all"
                          style={{ width:`${scan.confidence||0}%`, background:sevC }}/>
                      </div>
                      <span style={{ fontSize:10, fontWeight:700, color:sevC }}>{scan.confidence||0}%</span>
                    </div>
                  </div>

                  {/* Right: severity badge + chevron */}
                  <div className="flex flex-col items-end justify-between shrink-0">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{ background:sevC+"20", color:sevC, border:`1px solid ${sevC}44` }}>
                      {t(`scanner.${sev==="none"?"healthy":sev}`) || SEV_LABEL[sev]}
                    </span>
                    <span className="text-ink-500 dark:text-gray-500 text-xs mt-2">{isOpen?"▲":"▼"}</span>
                  </div>
                </div>

                {/* ── Expanded detail ── */}
                {isOpen && (
                  <div className="border-t border-deep-light dark:border-dark-light bg-deep-mid dark:bg-dark-mid p-4 space-y-3"
                    onClick={e => e.stopPropagation()}>

                    {busy ? (
                      <div className="flex items-center gap-2 py-4 justify-center">
                        <div className="w-4 h-4 border-2 border-terra border-t-transparent rounded-full animate-spin"/>
                        <p className="text-ink-500 dark:text-gray-400 text-sm">Loading details...</p>
                      </div>
                    ) : plan ? (
                      <>
                        {/* Health summary */}
                        {plan.health_summary && (
                          <div className="rounded-xl p-3 border"
                            style={{ background:sevC+"12", borderColor:sevC+"33" }}>
                            <p className="text-xs font-bold uppercase mb-1" style={{ color:sevC }}>
                              {t("scanner.healthSummary")||"Health Summary"}
                            </p>
                            <p className="text-ink dark:text-white text-sm">{plan.health_summary}</p>
                          </div>
                        )}

                        {/* Immediate action */}
                        {plan.immediate_action && (
                          <div className="rounded-xl p-3 border border-amber/30 bg-amber/5">
                            <p className="text-xs font-bold text-amber uppercase mb-1">⚡ {t("scanner.actNow")||"Immediate Action"}</p>
                            <p className="text-ink dark:text-white text-sm">{plan.immediate_action}</p>
                          </div>
                        )}

                        {/* Steps */}
                        {plan.steps?.length > 0 && (
                          <div className="bg-white dark:bg-dark-surface rounded-xl p-3 border border-deep-light dark:border-dark-light">
                            <p className="text-ink dark:text-white text-xs font-bold uppercase mb-2">{t("scanner.steps")||"Treatment Steps"}</p>
                            <ol className="space-y-2">
                              {plan.steps.map((s,i) => (
                                <li key={i} className="flex gap-2">
                                  <div className="w-5 h-5 rounded-full bg-terra text-white text-xs font-bold flex items-center justify-center shrink-0">{i+1}</div>
                                  <p className="text-ink-500 dark:text-gray-300 text-sm">{s}</p>
                                </li>
                              ))}
                            </ol>
                          </div>
                        )}

                        {/* Local products */}
                        {plan.local_products?.length > 0 && (
                          <div className="bg-white dark:bg-dark-surface rounded-xl p-3 border border-deep-light dark:border-dark-light">
                            <p className="text-ink dark:text-white text-xs font-bold uppercase mb-2">{t("scanner.localProducts")||"Local Products"}</p>
                            {plan.local_products.map((p,i) => (
                              <div key={i} className="flex justify-between items-start mb-2 last:mb-0">
                                <div>
                                  <p className="text-ink dark:text-white text-sm font-semibold">{p.name}</p>
                                  <p className="text-ink-500 dark:text-gray-400 text-xs">{p.where}</p>
                                </div>
                                <p className="text-terra font-bold text-sm">₦{p.price_naira?.toLocaleString()}</p>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Organic + prevention inline */}
                        {(plan.organic_option || plan.prevention) && (
                          <div className="bg-terra-light dark:bg-terra/10 rounded-xl p-3 border border-green-200 dark:border-terra/20 space-y-2">
                            {plan.organic_option && (
                              <div>
                                <p className="text-terra text-xs font-bold uppercase mb-0.5">🌿 {t("scanner.organic")||"Organic Option"}</p>
                                <p className="text-ink-500 dark:text-gray-300 text-sm">{plan.organic_option}</p>
                              </div>
                            )}
                            {plan.prevention && (
                              <div>
                                <p className="text-terra text-xs font-bold uppercase mb-0.5">{t("scanner.prevention")||"Prevention"}</p>
                                <p className="text-ink-500 dark:text-gray-300 text-sm">{plan.prevention}</p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* PDF */}
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
                              toast.dismiss(tid); toast.success("PDF downloaded!");
                            } catch { toast.dismiss(tid); toast.error("Could not generate PDF"); }
                          }}
                          className="w-full bg-terra text-white rounded-xl py-2.5 text-sm font-bold hover:bg-terra-dark transition-colors flex items-center justify-center gap-2"
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/>
                          </svg>
                          {t("scanner.scanReport")||"Download PDF Report"}
                        </button>
                      </>
                    ) : (
                      <div className="py-4 text-center">
                        <p className="text-ink-500 dark:text-gray-400 text-sm">{scan.result || "No detailed report stored"}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-3 mt-4">
          <button disabled={page===0} onClick={()=>setPage(p=>p-1)}
            className="px-4 py-2 rounded-xl text-sm font-semibold border border-deep-light dark:border-dark-light bg-white dark:bg-dark-surface text-ink-500 dark:text-gray-400 hover:border-terra disabled:opacity-40">
            ← {t("common.back")||"Back"}
          </button>
          <span className="text-xs text-ink-500 dark:text-gray-500">{page+1} / {totalPages}</span>
          <button disabled={page>=totalPages-1} onClick={()=>setPage(p=>p+1)}
            className="px-4 py-2 rounded-xl text-sm font-semibold border border-deep-light dark:border-dark-light bg-white dark:bg-dark-surface text-ink-500 dark:text-gray-400 hover:border-terra disabled:opacity-40">
            {t("common.viewAll")||"Next"} →
          </button>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
function SoilHistory() {
  const { t } = useTranslation();
  const [tests,         setTests]         = useState([]);
  const [profile,       setProfile]       = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [selected,      setSelected]      = useState(null);
  const [detail,        setDetail]        = useState({});
  const [loadingDetail, setLoadingDetail] = useState(null);

  useEffect(() => {
    (async () => {
      const { data:{ session } } = await supabase.auth.getSession();
      if (!session?.user) { setLoading(false); return; }
      const uid = session.user.id;
      const [{ data:testsData }, { data:profileData }] = await Promise.all([
        supabase.from("soil_tests")
          .select("id,nitrogen,phosphorus,potassium,ph,moisture,organic_carbon,rating,created_at")
          .eq("user_id", uid)
          .order("created_at", { ascending:false })
          .limit(30),
        supabase.from("profiles").select("full_name,region,city").eq("id", uid).single(),
      ]);
      setTests(testsData ?? []);
      setProfile(profileData);
      setLoading(false);
    })();
  }, []);

  const loadDetail = useCallback(async (id) => {
    if (detail[id] !== undefined) return;
    setLoadingDetail(id);
    const { data } = await supabase.from("soil_tests").select("analysis").eq("id", id).single();
    let a = null;
    if (data?.analysis) { try { a = JSON.parse(data.analysis); } catch {} }
    setDetail(prev => ({ ...prev, [id]: a }));
    setLoadingDetail(null);
  }, [detail]);

  const handleTap = (id) => {
    if (selected === id) { setSelected(null); return; }
    setSelected(id); loadDetail(id);
  };

  if (loading) return (
    <div className="space-y-3">
      {[1,2,3].map(i => (
        <div key={i} className="bg-white dark:bg-dark-surface rounded-2xl border border-deep-light dark:border-dark-light p-4 animate-pulse">
          <div className="h-4 bg-deep-light dark:bg-dark-light rounded w-24 mb-3"/>
          <div className="space-y-2">
            {[1,2,3].map(j=><div key={j} className="h-2 bg-deep-light dark:bg-dark-light rounded"/>)}
          </div>
        </div>
      ))}
    </div>
  );

  if (tests.length === 0) return (
    <div className="bg-white dark:bg-dark-surface rounded-2xl border border-deep-light dark:border-dark-light p-12 text-center">
      <div className="text-4xl mb-2">🌱</div>
      <p className="text-ink dark:text-white font-bold">{t("dashboard.soilTests")||"No soil tests yet"}</p>
      <p className="text-ink-500 dark:text-gray-400 text-sm mt-1">Analyse your soil to see results here</p>
    </div>
  );

  return (
    <div className="space-y-3">
      {tests.map(test => {
        const rating  = norm(test.rating) || "fair";
        const col     = SOIL_COL[rating]  || "#F59E0B";
        const grade   = SOIL_GRADE[rating]|| "C";
        const isOpen  = selected === test.id;
        const analysis= detail[test.id];
        const busy    = loadingDetail === test.id;

        return (
          <div key={test.id}
            className="bg-white dark:bg-dark-surface rounded-2xl border border-deep-light dark:border-dark-light shadow-card overflow-hidden cursor-pointer hover:border-terra transition-colors"
            onClick={() => handleTap(test.id)}
          >
            {/* Card row */}
            <div className="flex gap-3 p-4">
              {/* Grade circle */}
              <div className="w-14 h-14 rounded-xl flex flex-col items-center justify-center shrink-0 border-2"
                style={{ borderColor:col, background:col+"12" }}>
                <span style={{ fontSize:22, fontWeight:900, color:col, lineHeight:1 }}>{grade}</span>
                <span style={{ fontSize:9, color:col, fontWeight:600 }}>GRADE</span>
              </div>

              {/* NPK bars */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ background:col+"20", color:col }}>
                    {rating.toUpperCase()}
                  </span>
                  <span className="text-xs text-ink-500 dark:text-gray-500">
                    {format(new Date(test.created_at), "MMM d, yyyy")}
                  </span>
                </div>

                <div className="space-y-1.5">
                  {[["nitrogen","N",400],["phosphorus","P",50],["potassium","K",400],["ph","pH",9]].map(([key,lbl,max])=> {
                    const val = test[key];
                    if (!val) return null;
                    const pct = Math.min(100,(val/max)*100);
                    return (
                      <div key={key} className="flex items-center gap-2">
                        <span style={{ width:16, fontSize:9, fontWeight:800, color:PCOL[key] }}>{lbl}</span>
                        <div className="flex-1 h-2 rounded-full bg-deep-light dark:bg-dark-light overflow-hidden">
                          <div className="h-full rounded-full" style={{ width:`${pct}%`, background:PCOL[key] }}/>
                        </div>
                        <span style={{ width:56, fontSize:9, fontWeight:600, color:PCOL[key], textAlign:"right" }}>
                          {val}{key==="ph"?"":"/kg"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <span className="text-ink-500 dark:text-gray-500 text-xs self-end">{isOpen?"▲":"▼"}</span>
            </div>

            {/* Expanded */}
            {isOpen && (
              <div className="border-t border-deep-light dark:border-dark-light bg-deep-mid dark:bg-dark-mid p-4 space-y-3"
                onClick={e=>e.stopPropagation()}>

                {busy ? (
                  <div className="flex items-center gap-2 py-4 justify-center">
                    <div className="w-4 h-4 border-2 border-terra border-t-transparent rounded-full animate-spin"/>
                    <p className="text-ink-500 dark:text-gray-400 text-sm">Loading analysis...</p>
                  </div>
                ) : analysis ? (
                  <>
                    {analysis.summary && (
                      <p className="text-ink-500 dark:text-gray-300 text-sm leading-relaxed">{analysis.summary}</p>
                    )}

                    {analysis.best_crops?.length > 0 && (
                      <div>
                        <p className="text-ink dark:text-white text-xs font-bold uppercase mb-2">{t("soil.bestCrops")||"Best Crops"}</p>
                        <div className="flex flex-wrap gap-2">
                          {analysis.best_crops.map(c=>(
                            <span key={c} className="text-xs font-semibold px-2.5 py-1 rounded-full"
                              style={{ background:"#22C55E22", color:"#16A34A", border:"1px solid #22C55E44" }}>{c}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {analysis.improvement_steps?.length > 0 && (
                      <div className="bg-white dark:bg-dark-surface rounded-xl p-3 border border-deep-light dark:border-dark-light">
                        <p className="text-ink dark:text-white text-xs font-bold uppercase mb-2">{t("soil.improvement")||"Action Plan"}</p>
                        <ol className="space-y-2">
                          {analysis.improvement_steps.map((s,i)=>(
                            <li key={i} className="flex gap-2">
                              <div className="w-5 h-5 rounded-full bg-terra text-white text-xs font-bold flex items-center justify-center shrink-0">{i+1}</div>
                              <p className="text-ink-500 dark:text-gray-300 text-sm">{s}</p>
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}

                    {analysis.season_advice && (
                      <p className="text-xs text-ink-500 dark:text-gray-400">
                        <span className="font-bold text-ink dark:text-white">{t("soil.season")||"Season"}: </span>
                        {analysis.season_advice}
                      </p>
                    )}

                    <button
                      onClick={async () => {
                        const tid = toast.loading("Generating PDF...");
                        try {
                          await generateSoilReport({
                            result: analysis,
                            params: { nitrogen:test.nitrogen, phosphorus:test.phosphorus, potassium:test.potassium, ph:test.ph, moisture:test.moisture, organic_carbon:test.organic_carbon },
                            farmerName: profile?.full_name,
                            location: [profile?.city,profile?.region].filter(Boolean).join(", ")||"Nigeria",
                          });
                          toast.dismiss(tid); toast.success("PDF downloaded!");
                        } catch { toast.dismiss(tid); toast.error("Could not generate PDF"); }
                      }}
                      className="w-full bg-terra text-white rounded-xl py-2.5 text-sm font-bold hover:bg-terra-dark transition-colors flex items-center justify-center gap-2"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/>
                      </svg>
                      {t("scanner.scanReport")||"Download PDF Report"}
                    </button>
                  </>
                ) : (
                  <p className="text-center text-sm text-ink-500 dark:text-gray-400 py-3">
                    N:{test.nitrogen} · P:{test.phosphorus} · K:{test.potassium} · pH:{test.ph}
                  </p>
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
export default function HistoryPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState("scans");

  return (
    <Layout>
      <h1 className="text-ink dark:text-white text-2xl font-black mb-1">
        {t("nav.history")||"History"}
      </h1>
      <p className="text-ink-500 dark:text-gray-400 text-sm mb-5">
        {t("common.historySubtitle")||"All your scan and soil analysis records"}
      </p>

      <div className="flex gap-2 mb-5 p-1 bg-deep-mid dark:bg-dark-mid rounded-2xl">
        {[["scans","🌿 "+( t("nav.scanner")||"Crop Scans")],["soil","🌱 "+(t("dashboard.soilTests")||"Soil Tests")]].map(([k,l])=>(
          <button key={k} onClick={()=>setTab(k)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
              tab===k ? "bg-white dark:bg-dark-surface text-ink dark:text-white shadow-sm" : "text-ink-500 dark:text-gray-400"
            }`}>{l}</button>
        ))}
      </div>

      {tab==="scans" && <ScanHistory />}
      {tab==="soil"  && <SoilHistory />}
    </Layout>
  );
}
