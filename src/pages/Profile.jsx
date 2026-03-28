import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import Layout from "@/components/Layout";
import { supabase } from "@/lib/supabase";
import toast from "react-hot-toast";
import i18n from "@/i18n/index";

const LANGUAGES = [
  { code:"en", label:"English", native:"English" },
  { code:"yo", label:"Yoruba",  native:"Yorùbá"  },
  { code:"ha", label:"Hausa",   native:"Hausa"   },
  { code:"ig", label:"Igbo",    native:"Igbo"    },
];

export default function ProfilePage() {
  const { t } = useTranslation();
  const [profile, setProfile] = useState(null);
  const [saving,  setSaving]  = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (data) {
        setProfile(data);
        if (data.language) i18n.changeLanguage(data.language);
      }
    })();
  }, []);

  const handleLanguageChange = (code) => {
    setProfile(p => ({ ...p, language: code }));
    i18n.changeLanguage(code); // switches the whole app instantly
  };

  const save = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("profiles")
      .update({ farm_name: profile.farm_name, region: profile.region, language: profile.language })
      .eq("id", user.id);
    toast.success(t("profile.saved", "Saved"));
    setSaving(false);
  };

  if (!profile) return (
    <Layout>
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-terra border-t-transparent rounded-full animate-spin" />
      </div>
    </Layout>
  );

  const inputClass = "w-full bg-white dark:bg-dark-mid rounded-xl px-4 h-12 text-ink dark:text-white border border-deep-light dark:border-dark-light focus:border-terra outline-none shadow-sm";

  return (
    <Layout>
      <h1 className="text-ink dark:text-white text-3xl font-black mb-6">{t("profile.title")}</h1>
      <div className="max-w-lg space-y-4">

        <div>
          <label className="text-ink-500 dark:text-gray-400 text-sm mb-1.5 block">{t("profile.fullName")}</label>
          <input value={profile.full_name ?? ""} readOnly className={`${inputClass} cursor-not-allowed opacity-60`} />
        </div>

        <div>
          <label className="text-ink-500 dark:text-gray-400 text-sm mb-1.5 block">{t("profile.farmName")}</label>
          <input value={profile.farm_name ?? ""} onChange={e => setProfile(p => ({ ...p, farm_name: e.target.value }))} className={inputClass} />
        </div>

        <div>
          <label className="text-ink-500 dark:text-gray-400 text-sm mb-1.5 block">{t("profile.state")}</label>
          <input value={profile.region ?? ""} onChange={e => setProfile(p => ({ ...p, region: e.target.value }))} className={inputClass} />
        </div>

        {/* Language switcher */}
        <div>
          <label className="text-ink-500 dark:text-gray-400 text-sm mb-2 block">{t("profile.language")}</label>
          <div className="grid grid-cols-2 gap-2">
            {LANGUAGES.map(lang => (
              <button key={lang.code} onClick={() => handleLanguageChange(lang.code)}
                className={`py-3 px-4 rounded-xl text-sm font-semibold border transition-all text-left ${
                  profile.language === lang.code
                    ? "bg-terra text-white border-terra shadow-sm"
                    : "bg-white dark:bg-dark-mid text-ink-500 dark:text-gray-400 border-deep-light dark:border-dark-light hover:border-terra hover:text-terra"
                }`}
              >
                <div className="font-bold">{lang.label}</div>
                <div className={`text-xs mt-0.5 ${profile.language === lang.code ? "text-white/80" : "text-ink-500 dark:text-gray-500"}`}>{lang.native}</div>
              </button>
            ))}
          </div>
        </div>

        <button onClick={save} disabled={saving}
          className="w-full bg-terra text-white h-12 rounded-xl font-bold hover:bg-terra-dark disabled:opacity-50 transition-colors shadow-sm"
        >
          {saving ? t("profile.saving") : t("profile.save")}
        </button>
      </div>
    </Layout>
  );
}
