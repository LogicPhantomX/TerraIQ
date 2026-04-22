import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { NIGERIAN_CROPS } from "@/lib/nigerianCrops";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";

const NIGERIAN_STATES = [
  "Abia","Adamawa","Akwa Ibom","Anambra","Bauchi","Bayelsa","Benue","Borno",
  "Cross River","Delta","Ebonyi","Edo","Ekiti","Enugu","FCT","Gombe","Imo",
  "Jigawa","Kaduna","Kano","Katsina","Kebbi","Kogi","Kwara","Lagos","Nasarawa",
  "Niger","Ogun","Ondo","Osun","Oyo","Plateau","Rivers","Sokoto","Taraba","Yobe","Zamfara",
];

// Group crops by category for the picker
const CROP_CATEGORIES = [
  { label:"Vegetables",  key:"vegetable" },
  { label:"Cereals",     key:"cereal"    },
  { label:"Roots & Tubers", key:"tuber"  },
  { label:"Legumes",     key:"legume"    },
  { label:"Fruits",      key:"fruit"     },
  { label:"Cash Crops",  key:"cash_crop" },
];

export default function SignupPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [step,    setStep]    = useState(1);
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState("vegetable");
  const [form, setForm] = useState({
    fullName:"", email:"", password:"",
    farmName:"", farmSize:"small", state:"",
    crops:[], language:"en",
  });

  const set     = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const toggleCrop = (name) =>
    set("crops", form.crops.includes(name)
      ? form.crops.filter(x => x !== name)
      : [...form.crops, name]);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: form.email, password: form.password,
        options: { data: { full_name: form.fullName } },
      });
      if (error) throw error;
      if (data.user) {
        await supabase.from("profiles").upsert({
          id:        data.user.id,
          full_name: form.fullName,
          email:     form.email,
          role:      "farmer",
          farm_name: form.farmName,
          farm_size: form.farmSize,
          region:    form.state,
          crops:     form.crops,
          language:  form.language,
        });
      }
      toast.success(t("common.accountCreated"));
      navigate("/dashboard");
    } catch(e) { toast.error(e.message); }
    setLoading(false);
  };

  const iClass = "w-full bg-deep-mid dark:bg-dark-mid rounded-xl px-4 h-12 text-ink dark:text-white border border-deep-light dark:border-dark-light focus:border-terra outline-none text-sm";
  const btnClass = "flex-1 h-12 rounded-xl font-bold transition-colors";

  const visibleCrops = NIGERIAN_CROPS.filter(c => c.category === activeCategory);

  return (
    <div className="min-h-screen bg-deep-mid dark:bg-dark-base flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/icon.png" alt="TerraIQ+" style={{ width:64, height:64, borderRadius:16, objectFit:"cover", margin:"0 auto 16px", display:"block" }} />
          <h1 className="text-ink dark:text-white text-3xl font-black">{t("auth.createAccount")}</h1>
          <div className="flex justify-center gap-2 mt-4">
            {[1,2,3].map(s => (
              <div key={s} className={`h-1.5 w-12 rounded-full transition-all ${step >= s ? "bg-terra" : "bg-deep-light dark:bg-dark-light"}`} />
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-dark-surface rounded-3xl p-6 border border-deep-light dark:border-dark-light shadow-card space-y-4">

          {/* ── STEP 1 — details ───────────────────────────────────── */}
          {step === 1 && <>
            <h2 className="text-ink dark:text-white font-bold">{t("auth.yourDetails")}</h2>
            {[["fullName","text","fullName","Oyeyiola Peace"],["email","email","email","you@example.com"],["password","password","password",t("auth.min8Chars")]].map(([k,tp,kk,ph]) => (
              <div key={k}>
                <label className="text-ink-500 dark:text-gray-400 text-sm mb-1.5 block">{t(`auth.${k}`)}</label>
                <input type={tp} value={form[kk]} onChange={e => set(kk, e.target.value)} placeholder={ph} className={iClass} />
              </div>
            ))}
            <button
              onClick={() => {
                if (!form.fullName || !form.email || !form.password) { toast.error(t("auth.fillAllFields")); return; }
                setStep(2);
              }}
              className={`${btnClass} w-full bg-terra text-white hover:bg-terra-dark`}
            >
              {t("auth.continue")}
            </button>
          </>}

          {/* ── STEP 2 — farm ──────────────────────────────────────── */}
          {step === 2 && <>
            <h2 className="text-ink dark:text-white font-bold">Your farm</h2>
            <div>
              <label className="text-ink-500 dark:text-gray-400 text-sm mb-1.5 block">Farm name</label>
              <input value={form.farmName} onChange={e => set("farmName", e.target.value)} placeholder="e.g. Oyeyiola Family Farm" className={iClass} />
            </div>
            <div>
              <label className="text-ink-500 dark:text-gray-400 text-sm mb-2 block">Farm size</label>
              <div className="grid grid-cols-3 gap-2">
                {["small","medium","large"].map(s => (
                  <button key={s} onClick={() => set("farmSize", s)}
                    className={`py-2.5 rounded-xl text-sm font-semibold capitalize border transition-all ${form.farmSize === s ? "bg-terra text-white border-terra" : "bg-deep-mid dark:bg-dark-mid text-ink-500 dark:text-gray-400 border-deep-light dark:border-dark-light"}`}
                  >{s}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-ink-500 dark:text-gray-400 text-sm mb-1.5 block">State</label>
              <select value={form.state} onChange={e => set("state", e.target.value)} className={iClass}>
                <option value="">Select state</option>
                {NIGERIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setStep(1)} className={`${btnClass} bg-deep-light dark:bg-dark-light text-ink dark:text-white`}>← Back</button>
              <button onClick={() => { if (!form.farmName || !form.state) { toast.error("Fill all fields"); return; } setStep(3); }}
                className={`${btnClass} bg-terra text-white hover:bg-terra-dark`}>Continue →</button>
            </div>
          </>}

          {/* ── STEP 3 — crops ─────────────────────────────────────── */}
          {step === 3 && <>
            <h2 className="text-ink dark:text-white font-bold">What do you grow?</h2>
            <p className="text-ink-500 dark:text-gray-400 text-sm">
              Select your crops. {form.crops.length > 0 && <span className="text-terra font-semibold">{form.crops.length} selected</span>}
            </p>

            {/* Category tabs */}
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {CROP_CATEGORIES.map(cat => (
                <button key={cat.key} onClick={() => setActiveCategory(cat.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap border transition-all ${
                    activeCategory === cat.key
                      ? "bg-terra text-white border-terra"
                      : "bg-deep-mid dark:bg-dark-mid text-ink-500 dark:text-gray-400 border-deep-light dark:border-dark-light"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Crop picker */}
            <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto pr-1">
              {visibleCrops.map(crop => (
                <button key={crop.name} onClick={() => toggleCrop(crop.name)}
                  className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition-all ${
                    form.crops.includes(crop.name)
                      ? "bg-terra text-white border-terra"
                      : "bg-white dark:bg-dark-mid text-ink-500 dark:text-gray-400 border-deep-light dark:border-dark-light hover:border-terra"
                  }`}
                >
                  {crop.name}
                  {crop.local?.[0] && (
                    <span className="block text-xs opacity-70">{crop.local[0].split(" ")[0]}</span>
                  )}
                </button>
              ))}
            </div>

            {/* Language */}
            <div>
              <label className="text-ink-500 dark:text-gray-400 text-sm mb-2 block">Language</label>
              <div className="grid grid-cols-2 gap-2">
                {[{code:"en",l:"English"},{code:"yo",l:"Yorùbá"},{code:"ha",l:"Hausa"},{code:"ig",l:"Igbo"}].map(({code,l}) => (
                  <button key={code} onClick={() => set("language", code)}
                    className={`py-2.5 rounded-xl text-sm font-semibold border transition-all ${form.language === code ? "bg-terra text-white border-terra" : "bg-deep-mid dark:bg-dark-mid text-ink-500 dark:text-gray-400 border-deep-light dark:border-dark-light"}`}
                  >{l}</button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={() => setStep(2)} className={`${btnClass} bg-deep-light dark:bg-dark-light text-ink dark:text-white`}>← Back</button>
              <button onClick={handleSubmit} disabled={loading} className={`${btnClass} bg-terra text-white hover:bg-terra-dark disabled:opacity-50`}>
                {loading ? "Creating..." : "Create Account "}
              </button>
            </div>
            <button onClick={() => navigate("/dashboard")} className="w-full text-center text-ink-500 dark:text-gray-400 text-sm py-2">
              Skip for now
            </button>
          </>}
        </div>

        <p className="text-center text-ink-500 dark:text-gray-400 mt-6 text-sm">
          Already have an account? <Link to="/login" className="text-terra font-semibold">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
