// ─── TerraIQ_WEB/src/pages/Profile.jsx ───────────────────────────────
// Fix: calls i18n.changeLanguage immediately on tap + on save
// Also uses getSession() not getUser()

import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import LocationPicker from "@/components/LocationPicker";
import { supabase } from "@/lib/supabase";
import { clearLanguageCache, applyLanguage } from "@/hooks/useFarmerLanguage";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";

const LANGUAGES = [
  { code:"en", label:"English"  },
  { code:"yo", label:"Yorùbá"   },
  { code:"ha", label:"Hausa"    },
  { code:"ig", label:"Igbo"     },
];

const iClass = "w-full bg-white dark:bg-dark-mid rounded-xl px-4 h-12 text-ink dark:text-white border border-deep-light dark:border-dark-light focus:border-terra outline-none text-sm shadow-sm";

export default function ProfilePage() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [userId,  setUserId]  = useState(null);
  const [form, setForm] = useState({
    full_name:"", farm_name:"", region:"", city:"", language:"en"
  });

  useEffect(() => {
    (async () => {
      // Use getSession — no lock
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { setLoading(false); return; }
      setUserId(session.user.id);

      const { data } = await supabase.from("profiles")
        .select("*").eq("id", session.user.id).single();

      if (data) {
        setForm({
          full_name: data.full_name ?? "",
          farm_name: data.farm_name ?? "",
          region:    data.region   ?? "",
          city:      data.city     ?? "",
          language:  data.language ?? "en",
        });
        // Apply saved language on page load
        if (data.language) {
          applyLanguage(data.language);
        }
      }
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    if (!userId) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      full_name: form.full_name,
      farm_name: form.farm_name,
      region:    form.region,
      city:      form.city,
      language:  form.language,
    }).eq("id", userId);

    if (error) {
      toast.error(error.message);
    } else {
      // Clear cache and switch language for whole app
      clearLanguageCache();
      applyLanguage(form.language);
      toast.success(t("profile.saved") || "Profile saved!");
    }
    setSaving(false);
  };

  const switchLanguage = (code) => {
    setForm(p => ({...p, language: code}));
    // Immediately updates ALL components using useFarmerLanguage + i18n
    applyLanguage(code);
  };

  if (loading) return (
    <Layout>
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-terra border-t-transparent rounded-full animate-spin" />
      </div>
    </Layout>
  );

  return (
    <Layout>
      <h1 className="text-ink dark:text-white text-3xl font-black mb-6">Profile</h1>

      <div className="space-y-5 max-w-lg">

        {/* Personal */}
        <div className="bg-white dark:bg-dark-surface rounded-2xl border border-deep-light dark:border-dark-light p-6 shadow-card space-y-4">
          <h2 className="text-ink dark:text-white font-bold">Personal Details</h2>
          <div>
            <label className="text-ink-500 dark:text-gray-400 text-sm mb-1.5 block">Full name</label>
            <input value={form.full_name} onChange={e=>setForm(p=>({...p,full_name:e.target.value}))}
              placeholder="e.g. Peace Oyeyiola" className={iClass} />
          </div>
          <div>
            <label className="text-ink-500 dark:text-gray-400 text-sm mb-1.5 block">Farm name</label>
            <input value={form.farm_name} onChange={e=>setForm(p=>({...p,farm_name:e.target.value}))}
              placeholder="e.g. Allamanda Farm" className={iClass} />
          </div>
        </div>

        {/* Location */}
        <div className="bg-white dark:bg-dark-surface rounded-2xl border border-deep-light dark:border-dark-light p-6 shadow-card space-y-4">
          <h2 className="text-ink dark:text-white font-bold">Location</h2>
          <p className="text-ink-500 dark:text-gray-400 text-sm">
            Your city gives you local market prices, cooperative discovery, and city-specific advice.
          </p>
          <LocationPicker
            state={form.region} city={form.city}
            onStateChange={v => setForm(p=>({...p, region:v}))}
            onCityChange={v  => setForm(p=>({...p, city:v}))}
          />
          {form.city && form.region && (
            <p className="text-terra text-sm font-semibold">◈ {form.city}, {form.region}</p>
          )}
        </div>

        {/* Language */}
        <div className="bg-white dark:bg-dark-surface rounded-2xl border border-deep-light dark:border-dark-light p-6 shadow-card">
          <h2 className="text-ink dark:text-white font-bold mb-1">Language</h2>
          <p className="text-ink-500 dark:text-gray-400 text-sm mb-4">
            Tap a language to preview it instantly. Save to make it permanent.
          </p>
          <div className="grid grid-cols-2 gap-2">
            {LANGUAGES.map(l => (
              <button key={l.code}
                onClick={() => switchLanguage(l.code)}
                className={`py-3 rounded-xl text-sm font-semibold border transition-all ${
                  form.language === l.code
                    ? "bg-terra text-white border-terra shadow-sm"
                    : "bg-deep-mid dark:bg-dark-mid text-ink-500 dark:text-gray-400 border-deep-light dark:border-dark-light"
                }`}
              >
                {l.label}
                {form.language === l.code && (
                  <span className="block text-xs opacity-75 mt-0.5">Active</span>
                )}
              </button>
            ))}
          </div>
          <p className="text-ink-500 dark:text-gray-500 text-xs mt-3">
            The page updates immediately when you tap — save to keep the change.
          </p>
        </div>

        <button onClick={save} disabled={saving}
          className="w-full bg-terra text-white h-12 rounded-xl font-bold hover:bg-terra-dark disabled:opacity-50 transition-colors shadow-sm">
          {saving ? t("profile.saving") : t("profile.save")}
        </button>
      </div>
    </Layout>
  );
}