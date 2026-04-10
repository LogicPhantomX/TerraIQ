// ── REPLACE the entire manual mode block in SmartSoil.jsx ────────────
// Find:  if (mode === "manual") {
// Replace with everything below up to the closing }

if (mode === "manual") {
  const [manualForm, setManualForm] = useState({
    organic_carbon: "",
    total_nitrogen: "",
    avail_phosphorus: "",
    potassium: "",
    ph: "",
    moisture: "",
    temperature: "",
    crop: "",
  });

  const setF = (k) => (e) => setManualForm(p => ({ ...p, [k]: e.target.value }));

  const runManual = async () => {
    if (!manualForm.ph) { toast.error("pH is required"); return; }
    setLoading(true);
    const tid = toast.loading("Analysing your soil...");
    try {
      // Convert organic carbon to nitrogen if total nitrogen not provided
      // OC × 0.1 gives rough nitrogen estimate (standard agronomic conversion)
      const oc = parseFloat(manualForm.organic_carbon) || 0;
      const tn = parseFloat(manualForm.total_nitrogen) || (oc * 0.1) || 25;
      const ap = parseFloat(manualForm.avail_phosphorus) || 20;
      const k  = parseFloat(manualForm.potassium) || 25;

      const { data: { session: _authSess } } = await supabase.auth.getSession();
      const user = _authSess?.user;
      const data = await getSoilAnalysis({
        nitrogen:    tn,
        phosphorus:  ap,
        potassium:   k,
        ph:          parseFloat(manualForm.ph) || 6.5,
        moisture:    parseFloat(manualForm.moisture) || 50,
        temperature: parseFloat(manualForm.temperature) || 28,
        region:      region || "Nigeria",
        crop:        manualForm.crop || undefined,
        lang,
        // Pass raw lab values so AI can reference them in its response
        extra_context: `Lab values — Organic Carbon: ${oc}%, Total Nitrogen: ${tn} mg/kg, Available Phosphorus: ${ap} mg/kg`,
      });

      setResult(data);
      await saveTest({
        nitrogen: tn, phosphorus: ap, potassium: k,
        ph: parseFloat(manualForm.ph),
        moisture: parseFloat(manualForm.moisture) || 50,
        temperature: parseFloat(manualForm.temperature) || 28,
      }, data);
      toast.dismiss(tid);
      toast.success(`Soil rating: ${data.rating?.toUpperCase()}`);
      setMode("result");
    } catch(e) { toast.dismiss(tid); toast.error(e.message); }
    setLoading(false);
  };

  const iClass = "w-full bg-white dark:bg-dark-mid rounded-xl px-4 h-12 text-ink dark:text-white border border-deep-light dark:border-dark-light focus:border-terra outline-none text-sm shadow-sm";

  const FIELDS = [
    { key:"organic_carbon",   label:"Organic Carbon (%)",           ph:"e.g. 1.5",  help:"From soil test report — usually 0.5 to 3.5%"        },
    { key:"total_nitrogen",   label:"Total Nitrogen (mg/kg)",       ph:"e.g. 25",   help:"Also called Total N — leave blank to estimate from OC" },
    { key:"avail_phosphorus", label:"Available Phosphorus (mg/kg)", ph:"e.g. 15",   help:"Also called Avail P or Bray P1 on your test report"    },
    { key:"potassium",        label:"Potassium — K (mg/kg)",        ph:"e.g. 120",  help:"Also called Exchangeable K"                            },
    { key:"ph",               label:"pH Level",                     ph:"e.g. 6.2",  help:"Aim for 6.0–7.0 for most Nigerian crops — required"   },
    { key:"moisture",         label:"Moisture (%)",                  ph:"e.g. 45",   help:"Optional — estimated at 50% if left blank"             },
    { key:"temperature",      label:"Soil Temperature (°C)",        ph:"e.g. 28",   help:"Optional — estimated at 28°C if left blank"            },
  ];

  return (
    <Layout>
      <button onClick={reset} className="flex items-center gap-2 text-terra text-sm font-semibold mb-6 hover:underline">← Back</button>
      <h1 className="text-ink dark:text-white text-2xl font-black mb-1">Enter Lab Values</h1>
      <p className="text-ink-500 dark:text-gray-400 mb-6 text-sm">
        Enter your soil test results. These are the standard values on a Nigerian soil test report.
      </p>

      {/* Target crop */}
      <div className="bg-white dark:bg-dark-surface rounded-2xl border border-deep-light dark:border-dark-light p-5 mb-4 shadow-card">
        <label className="text-ink-500 dark:text-gray-400 text-sm mb-1.5 block">Target crop (optional)</label>
        <input
          value={manualForm.crop}
          onChange={setF("crop")}
          placeholder="e.g. Maize, Cassava, Tomato"
          className={iClass}
        />
      </div>

      {/* Lab values form */}
      <div className="bg-white dark:bg-dark-surface rounded-2xl border border-deep-light dark:border-dark-light p-6 mb-5 shadow-card space-y-4">
        {FIELDS.map(({ key, label, ph, help }) => (
          <div key={key}>
            <div className="flex justify-between items-baseline mb-1.5">
              <label className="text-ink dark:text-white text-sm font-semibold">{label}</label>
              {key === "ph" && (
                <span className="text-danger text-xs font-semibold">Required</span>
              )}
            </div>
            <input
              type="number"
              step="0.01"
              value={manualForm[key]}
              onChange={setF(key)}
              placeholder={ph}
              className={iClass}
            />
            <p className="text-ink-500 dark:text-gray-500 text-xs mt-1">{help}</p>
          </div>
        ))}
      </div>

      {/* Allamanda banner */}
      <div className="bg-amber/5 dark:bg-amber/10 rounded-2xl border border-amber/20 p-4 mb-5 flex gap-3 items-start">
        <div className="w-8 h-8 rounded-lg bg-amber/20 flex items-center justify-center shrink-0 font-black text-amber text-sm">A</div>
        <div>
          <p className="text-ink dark:text-white font-semibold text-sm mb-0.5">No test results yet?</p>
          <p className="text-ink-500 dark:text-gray-400 text-xs">
            Contact Allamanda Innovations for affordable soil testing across Nigeria.
            Their report will include all values needed above.
          </p>
        </div>
      </div>

      <button
        onClick={runManual}
        disabled={loading || !manualForm.ph}
        className="w-full bg-terra text-white h-12 rounded-xl font-bold hover:bg-terra-dark disabled:opacity-50 transition-colors shadow-sm"
      >
        {loading ? "Analysing..." : "Analyse Soil"}
      </button>
    </Layout>
  );
}
