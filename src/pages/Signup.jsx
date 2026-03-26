import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";

const NIGERIAN_STATES = [
  "Abia","Adamawa","Akwa Ibom","Anambra","Bauchi","Bayelsa","Benue","Borno",
  "Cross River","Delta","Ebonyi","Edo","Ekiti","Enugu","FCT","Gombe","Imo",
  "Jigawa","Kaduna","Kano","Katsina","Kebbi","Kogi","Kwara","Lagos","Nasarawa",
  "Niger","Ogun","Ondo","Osun","Oyo","Plateau","Rivers","Sokoto","Taraba","Yobe","Zamfara",
];
const CROPS = ["Maize","Cassava","Rice","Yam","Tomato","Pepper","Okra","Groundnut","Plantain","Soybean","Cucumber","Watermelon"];

export default function SignupPage() {
  const navigate = useNavigate();
  const [step,    setStep]    = useState(1);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    fullName:"", email:"", password:"",
    farmName:"", farmSize:"small", state:"",
    crops:[], language:"en",
  });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const toggleCrop = (c) => set("crops", form.crops.includes(c) ? form.crops.filter(x => x !== c) : [...form.crops, c]);

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
          id: data.user.id, full_name: form.fullName, email: form.email,
          role:"farmer", farm_name: form.farmName, farm_size: form.farmSize,
          region: form.state, crops: form.crops, language: form.language,
        });
      }
      toast.success("Account created!");
      navigate("/dashboard");
    } catch(e) { toast.error(e.message); }
    setLoading(false);
  };

  const inputClass = "w-full bg-deep-mid dark:bg-dark-mid rounded-xl px-4 h-12 text-ink dark:text-white border border-deep-light dark:border-dark-light focus:border-terra outline-none text-sm";
  const btnClass   = "flex-1 h-12 rounded-xl font-bold transition-colors";

  return (
    <div className="min-h-screen bg-deep-mid dark:bg-dark-base flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img src="/icon.png" alt="TerraIQ" style={{ width:64, height:64, borderRadius:16, objectFit:"cover" }} />
          </div>
          <h1 className="text-ink dark:text-white text-3xl font-black">Create your account</h1>
          {/* Step dots */}
          <div className="flex justify-center gap-2 mt-4">
            {[1,2,3].map(s => (
              <div key={s} className={`h-1.5 w-12 rounded-full transition-all ${step >= s ? "bg-terra" : "bg-deep-light dark:bg-dark-light"}`} />
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-dark-surface rounded-3xl p-6 border border-deep-light dark:border-dark-light shadow-card space-y-4">

          {step === 1 && <>
            <h2 className="text-ink dark:text-white font-bold">Your details</h2>
            {[["Full name","text","fullName","Oyeyiola Peace"],["Email","email","email","you@example.com"],["Password","password","password","Minimum 8 characters"]].map(([l,t,k,ph]) => (
              <div key={k}>
                <label className="text-ink-500 dark:text-gray-400 text-sm mb-1.5 block">{l}</label>
                <input type={t} value={form[k]} onChange={e => set(k, e.target.value)} placeholder={ph} className={inputClass} />
              </div>
            ))}
            <button onClick={() => { if (!form.fullName||!form.email||!form.password) { toast.error("Fill all fields"); return; } setStep(2); }}
              className={`${btnClass} w-full bg-terra text-white hover:bg-terra-dark`}>Continue →</button>
          </>}

          {step === 2 && <>
            <h2 className="text-ink dark:text-white font-bold">Your farm</h2>
            <div>
              <label className="text-ink-500 dark:text-gray-400 text-sm mb-1.5 block">Farm name</label>
              <input value={form.farmName} onChange={e => set("farmName", e.target.value)} placeholder="OyeyiolaFamily Farm" className={inputClass} />
            </div>
            <div>
              <label className="text-ink-500 dark:text-gray-400 text-sm mb-1.5 block">Farm size</label>
              <div className="grid grid-cols-3 gap-2">
                {["small","medium","large"].map(s => (
                  <button key={s} onClick={() => set("farmSize", s)}
                    className={`py-2.5 rounded-xl text-sm font-semibold capitalize border transition-all ${form.farmSize === s ? "bg-terra text-white border-terra" : "bg-deep-mid dark:bg-dark-mid text-ink-500 dark:text-gray-400 border-deep-light dark:border-dark-light"}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-ink-500 dark:text-gray-400 text-sm mb-1.5 block">State</label>
              <select value={form.state} onChange={e => set("state", e.target.value)} className={inputClass}>
                <option value="">Select state</option>
                {NIGERIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setStep(1)} className={`${btnClass} bg-deep-light dark:bg-dark-light text-ink dark:text-white`}>← Back</button>
              <button onClick={() => { if (!form.farmName||!form.state) { toast.error("Fill all fields"); return; } setStep(3); }}
                className={`${btnClass} bg-terra text-white hover:bg-terra-dark`}>Continue →</button>
            </div>
          </>}

          {step === 3 && <>
            <h2 className="text-ink dark:text-white font-bold">Crops & Language</h2>
            <div>
              <label className="text-ink-500 dark:text-gray-400 text-sm mb-2 block">Crops you grow</label>
              <div className="flex flex-wrap gap-2">
                {CROPS.map(c => (
                  <button key={c} onClick={() => toggleCrop(c)}
                    className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition-all ${form.crops.includes(c) ? "bg-terra text-white border-terra" : "bg-deep-mid dark:bg-dark-mid text-ink-500 dark:text-gray-400 border-deep-light dark:border-dark-light"}`}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-ink-500 dark:text-gray-400 text-sm mb-2 block">Language</label>
              <div className="grid grid-cols-2 gap-2">
                {[{code:"en",l:"English"},{code:"yo",l:"Yorùbá"},{code:"ha",l:"Hausa"},{code:"ig",l:"Igbo"}].map(({code,l}) => (
                  <button key={code} onClick={() => set("language", code)}
                    className={`py-2.5 rounded-xl text-sm font-semibold border transition-all ${form.language === code ? "bg-terra text-white border-terra" : "bg-deep-mid dark:bg-dark-mid text-ink-500 dark:text-gray-400 border-deep-light dark:border-dark-light"}`}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setStep(2)} className={`${btnClass} bg-deep-light dark:bg-dark-light text-ink dark:text-white`}>← Back</button>
              <button onClick={handleSubmit} disabled={loading} className={`${btnClass} bg-terra text-white hover:bg-terra-dark disabled:opacity-50`}>
                {loading ? "Creating..." : "Create Account"}
              </button>
            </div>
          </>}
        </div>

        <p className="text-center text-ink-500 dark:text-gray-400 mt-6 text-sm">
          Already have an account?{" "}
          <Link to="/login" className="text-terra font-semibold">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
