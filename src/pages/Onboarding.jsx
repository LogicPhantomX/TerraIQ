import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";

const NIGERIAN_STATES = [
  "Abia","Adamawa","Akwa Ibom","Anambra","Bauchi","Bayelsa","Benue","Borno",
  "Cross River","Delta","Ebonyi","Edo","Ekiti","Enugu","FCT","Gombe","Imo",
  "Jigawa","Kaduna","Kano","Katsina","Kebbi","Kogi","Kwara","Lagos","Nasarawa",
  "Niger","Ogun","Ondo","Osun","Oyo","Plateau","Rivers","Sokoto","Taraba","Yobe","Zamfara",
];
const CROPS = ["Maize","Cassava","Rice","Yam","Tomato","Pepper","Okra","Groundnut","Plantain","Soybean","Cucumber","Watermelon"];

export default function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [state,    setState]    = useState("");
  const [farmName, setFarmName] = useState("");
  const [crops,    setCrops]    = useState([]);
  const [saving,   setSaving]   = useState(false);

  const toggleCrop = (c) => setCrops(p => p.includes(c) ? p.filter(x=>x!==c) : [...p, c]);

  const finish = async () => {
    setSaving(true);
    const { data: { session: _sess } } = await supabase.auth.getSession();
      const user = _sess?.user;
    await supabase.from("profiles").update({
      full_name: name || undefined,
      farm_name: farmName || undefined,
      region:    state || undefined,
      crops:     crops.length > 0 ? crops : undefined,
    }).eq("id", user.id);
    toast.success("Welcome to TerraIQ+!");
    navigate("/dashboard");
  };

  const steps = [
    // Step 0 — Welcome
    {
      content: (
        <div className="text-center">
          <motion.div initial={{ scale:0.8 }} animate={{ scale:1 }} transition={{ type:"spring", stiffness:200 }}>
            <img src="/icon.png" alt="TerraIQ+" style={{ width:96, height:96, borderRadius:24, objectFit:"cover", margin:"0 auto 24px", display:"block" }} />
          </motion.div>
          <h1 className="text-ink dark:text-white text-3xl font-black mb-3">
            Welcome to <span style={{ color:"#1E8A4C" }}>TerraIQ<span style={{ fontSize:36 }}>+</span></span>
          </h1>
          <p className="text-ink-500 dark:text-gray-400 text-lg mb-8 leading-relaxed">
            Your AI farming assistant. Let's set up your farm in 3 quick steps.
          </p>
          <div className="grid grid-cols-3 gap-3 mb-10">
            {[["🌿","Scan crops","for disease"],["🌍","Analyse","your soil"],["📈","Get better","prices"]].map(([icon,t1,t2]) => (
              <div key={t1} className="bg-white dark:bg-dark-surface rounded-2xl p-4 border border-deep-light dark:border-dark-light shadow-card">
                <div className="text-2xl mb-2">{icon}</div>
                <p className="text-ink dark:text-white font-semibold text-sm">{t1}</p>
                <p className="text-ink-500 dark:text-gray-400 text-xs">{t2}</p>
              </div>
            ))}
          </div>
          <button onClick={() => setStep(1)} className="w-full bg-terra text-white h-14 rounded-2xl font-bold text-lg hover:bg-terra-dark transition-colors shadow-md">
            Let's Get Started →
          </button>
        </div>
      ),
    },
    // Step 1 — Name + State
    {
      content: (
        <div>
          <h2 className="text-ink dark:text-white text-2xl font-black mb-2">Tell us about yourself</h2>
          <p className="text-ink-500 dark:text-gray-400 mb-6">We'll personalise your experience for your region.</p>
          <div className="space-y-4 mb-6">
            <div>
              <label className="text-ink-500 dark:text-gray-400 text-sm mb-1.5 block">Your name</label>
              <input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Emeka Okafor"
                className="w-full bg-white dark:bg-dark-mid rounded-xl px-4 h-12 text-ink dark:text-white border border-deep-light dark:border-dark-light focus:border-terra outline-none shadow-sm" />
            </div>
            <div>
              <label className="text-ink-500 dark:text-gray-400 text-sm mb-1.5 block">Your farm name</label>
              <input value={farmName} onChange={e=>setFarmName(e.target.value)} placeholder="e.g. Okafor Family Farm"
                className="w-full bg-white dark:bg-dark-mid rounded-xl px-4 h-12 text-ink dark:text-white border border-deep-light dark:border-dark-light focus:border-terra outline-none shadow-sm" />
            </div>
            <div>
              <label className="text-ink-500 dark:text-gray-400 text-sm mb-1.5 block">Your state</label>
              <select value={state} onChange={e=>setState(e.target.value)}
                className="w-full bg-white dark:bg-dark-mid rounded-xl px-4 h-12 text-ink dark:text-white border border-deep-light dark:border-dark-light focus:border-terra outline-none shadow-sm"
              >
                <option value="">Select your state</option>
                {NIGERIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStep(0)} className="flex-1 bg-deep-light dark:bg-dark-light text-ink dark:text-white h-12 rounded-xl font-semibold">← Back</button>
            <button onClick={() => setStep(2)} className="flex-1 bg-terra text-white h-12 rounded-xl font-bold hover:bg-terra-dark transition-colors shadow-sm">Continue →</button>
          </div>
        </div>
      ),
    },
    // Step 2 — Crops
    {
      content: (
        <div>
          <h2 className="text-ink dark:text-white text-2xl font-black mb-2">What do you grow?</h2>
          <p className="text-ink-500 dark:text-gray-400 mb-5">Select the crops on your farm. This helps us give better advice.</p>
          <div className="flex flex-wrap gap-2 mb-6">
            {CROPS.map(c => (
              <button key={c} onClick={() => toggleCrop(c)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${crops.includes(c) ? "bg-terra text-white border-terra" : "bg-white dark:bg-dark-mid text-ink-500 dark:text-gray-400 border-deep-light dark:border-dark-light"}`}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="flex-1 bg-deep-light dark:bg-dark-light text-ink dark:text-white h-12 rounded-xl font-semibold">← Back</button>
            <button onClick={finish} disabled={saving} className="flex-1 bg-terra text-white h-12 rounded-xl font-bold hover:bg-terra-dark disabled:opacity-50 transition-colors shadow-sm">
              {saving ? "Setting up..." : "Go to Dashboard 🚀"}
            </button>
          </div>
          <button onClick={() => navigate("/dashboard")} className="w-full text-center text-ink-500 dark:text-gray-400 text-sm mt-4 py-2">
            Skip for now
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-deep-mid dark:bg-dark-base flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        {/* Progress dots */}
        {step > 0 && (
          <div className="flex gap-2 justify-center mb-8">
            {[1,2,3].map(s => (
              <div key={s} className={`h-2 rounded-full transition-all ${step >= s ? "w-8 bg-terra" : "w-2 bg-deep-light dark:bg-dark-light"}`} />
            ))}
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity:0, x:20 }}
            animate={{ opacity:1, x:0 }}
            exit={{ opacity:0, x:-20 }}
            transition={{ duration:0.25 }}
          >
            {steps[step]?.content}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
