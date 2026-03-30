import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import LocationPicker from "@/components/LocationPicker";
import { supabase } from "@/lib/supabase";
import { NIGERIAN_STATES } from "@/lib/nigeriaLocations";
import { useTranslation } from "react-i18next";
import { useFarmerLanguage } from "@/hooks/useFarmerLanguage";
import toast from "react-hot-toast";

const LANGUAGES = [
  { code:"en", label:"English" },
  { code:"yo", label:"Yorùbá"  },
  { code:"ha", label:"Hausa"   },
  { code:"ig", label:"Igbo"    },
];

const iClass = "w-full bg-white dark:bg-dark-mid rounded-xl px-4 h-12 text-ink dark:text-white border border-deep-light dark:border-dark-light focus:border-terra outline-none text-sm shadow-sm";

export default function ProfilePage() {
  const { t }    = useTranslation();
  const lang     = useFarmerLanguage();
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [form, setForm] = useState({
    full_name:"", farm_name:"", region:"", city:"", language:"en"
  });

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (data) setForm({
        full_name: data.full_name ?? "",
        farm_name: data.farm_name ?? "",
        region:    data.region ?? "",
        city:      data.city   ?? "",
        language:  data.language ?? "en",
      });
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("profiles").update({
      full_name: form.full_name,
      farm_name: form.farm_name,
      region:    form.region,
      city:      form.city,
      language:  form.language,
    }).eq("id", user.id);
    if (error) toast.error(error.message);
    else toast.success("Profile saved!");
    setSaving(false);
  };

  if (loading) return (
    <Layout><div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-terra border-t-transparent rounded-full animate-spin" />
    </div></Layout>
  );

  return (
    <Layout>
      <h1 className="text-ink dark:text-white text-3xl font-black mb-6">Profile</h1>

      <div className="space-y-5 max-w-lg">
        {/* Name + farm */}
        <div className="bg-white dark:bg-dark-surface rounded-2xl border border-deep-light dark:border-dark-light p-6 shadow-card space-y-4">
          <h2 className="text-ink dark:text-white font-bold">Personal Details</h2>
          <div>
            <label className="text-ink-500 dark:text-gray-400 text-sm mb-1.5 block">Full name</label>
            <input value={form.full_name} onChange={e => setForm(p => ({...p, full_name:e.target.value}))}
              placeholder="e.g. Emeka Okafor" className={iClass} />
          </div>
          <div>
            <label className="text-ink-500 dark:text-gray-400 text-sm mb-1.5 block">Farm name</label>
            <input value={form.farm_name} onChange={e => setForm(p => ({...p, farm_name:e.target.value}))}
              placeholder="e.g. Okafor Family Farm" className={iClass} />
          </div>
        </div>

        {/* Location — state + city */}
        <div className="bg-white dark:bg-dark-surface rounded-2xl border border-deep-light dark:border-dark-light p-6 shadow-card space-y-4">
          <h2 className="text-ink dark:text-white font-bold">Location</h2>
          <p className="text-ink-500 dark:text-gray-400 text-sm">
            Your city helps you discover cooperatives nearby and get localised market prices.
          </p>
          <LocationPicker
            state={form.region}
            city={form.city}
            onStateChange={v => setForm(p => ({...p, region:v}))}
            onCityChange={v  => setForm(p => ({...p, city:v}))}
          />
          {form.city && form.region && (
            <p className="text-terra text-sm font-semibold">
              ◈ {form.city}, {form.region}
            </p>
          )}
        </div>

        {/* Language */}
        <div className="bg-white dark:bg-dark-surface rounded-2xl border border-deep-light dark:border-dark-light p-6 shadow-card">
          <h2 className="text-ink dark:text-white font-bold mb-3">Language</h2>
          <div className="grid grid-cols-2 gap-2">
            {LANGUAGES.map(l => (
              <button key={l.code} onClick={() => setForm(p => ({...p, language:l.code}))}
                className={`py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                  form.language === l.code
                    ? "bg-terra text-white border-terra"
                    : "bg-deep-mid dark:bg-dark-mid text-ink-500 dark:text-gray-400 border-deep-light dark:border-dark-light"
                }`}>{l.label}</button>
            ))}
          </div>
        </div>

        <button onClick={save} disabled={saving}
          className="w-full bg-terra text-white h-12 rounded-xl font-bold hover:bg-terra-dark disabled:opacity-50 transition-colors shadow-sm">
          {saving ? "Saving..." : "Save Profile"}
        </button>
      </div>
    </Layout>
  );
}
