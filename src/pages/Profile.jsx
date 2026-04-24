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

// Nigerian state name normaliser — maps GPS-returned state names to our dropdown values
const STATE_MAP = {
  "abia":              "Abia",         "adamawa":          "Adamawa",
  "akwa ibom":         "Akwa Ibom",    "anambra":          "Anambra",
  "bauchi":            "Bauchi",       "bayelsa":          "Bayelsa",
  "benue":             "Benue",        "borno":            "Borno",
  "cross river":       "Cross River",  "delta":            "Delta",
  "ebonyi":            "Ebonyi",       "edo":              "Edo",
  "ekiti":             "Ekiti",        "enugu":            "Enugu",
  "federal capital territory": "FCT",  "fct":              "FCT",
  "abuja":             "FCT",          "gombe":            "Gombe",
  "imo":               "Imo",          "jigawa":           "Jigawa",
  "kaduna":            "Kaduna",       "kano":             "Kano",
  "katsina":           "Katsina",      "kebbi":            "Kebbi",
  "kogi":              "Kogi",         "kwara":            "Kwara",
  "lagos":             "Lagos",        "nasarawa":         "Nasarawa",
  "niger":             "Niger",        "ogun":             "Ogun",
  "ondo":              "Ondo",         "osun":             "Osun",
  "oyo":               "Oyo",          "plateau":          "Plateau",
  "rivers":            "Rivers",       "sokoto":           "Sokoto",
  "taraba":            "Taraba",       "yobe":             "Yobe",
  "zamfara":           "Zamfara",
};

function normaliseState(raw) {
  if (!raw) return "";
  const cleaned = raw.toLowerCase().replace(/\s+state$/i, "").trim();
  return STATE_MAP[cleaned] ?? raw;
}

const iClass = "w-full bg-white dark:bg-dark-mid rounded-xl px-4 h-12 text-ink dark:text-white border border-deep-light dark:border-dark-light focus:border-terra outline-none text-sm shadow-sm";

export default function ProfilePage() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
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

  const detectLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
          );
          const data = await res.json();
          const addr = data.address ?? {};
          // Extract city and state from reverse geocode
          const city  = addr.city ?? addr.town ?? addr.village ?? addr.county ?? "";
          const rawState = addr.state ?? "";
          const state = normaliseState(rawState);
          if (state) {
            setForm(p => ({ ...p, region: state, city }));
            toast.success(`Location detected: ${city ? city + ", " : ""}${state}`);
          } else {
            toast.error("Could not detect your Nigerian state. Please select manually.");
          }
        } catch {
          toast.error("Could not fetch location details. Check your internet.");
        }
        setGpsLoading(false);
      },
      (err) => {
        setGpsLoading(false);
        if (err.code === 1) toast.error("Location permission denied. Please allow location access.");
        else toast.error("Could not get your location. Try again.");
      },
      { timeout: 10000, maximumAge: 60000 }
    );
  };

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
      <h1 className="text-ink dark:text-white text-3xl font-black mb-6">{t("profile.title")}</h1>

      <div className="space-y-5 max-w-lg">

        {/* Personal */}
        <div className="bg-white dark:bg-dark-surface rounded-2xl border border-deep-light dark:border-dark-light p-6 shadow-card space-y-4">
          <h2 className="text-ink dark:text-white font-bold">{t("profile.personalDetails")}</h2>
          <div>
            <label className="text-ink-500 dark:text-gray-400 text-sm mb-1.5 block">{t("profile.fullName")}</label>
            <input value={form.full_name} onChange={e=>setForm(p=>({...p,full_name:e.target.value}))}
              placeholder="e.g. Peace Oyeyiola" className={iClass} />
          </div>
          <div>
            <label className="text-ink-500 dark:text-gray-400 text-sm mb-1.5 block">{t("profile.farmName")}</label>
            <input value={form.farm_name} onChange={e=>setForm(p=>({...p,farm_name:e.target.value}))}
              placeholder="e.g. Allamanda Farm" className={iClass} />
          </div>
        </div>

        {/* Location */}
        <div className="bg-white dark:bg-dark-surface rounded-2xl border border-deep-light dark:border-dark-light p-6 shadow-card space-y-4">
          <h2 className="text-ink dark:text-white font-bold">{t("profile.location")}</h2>
          <p className="text-ink-500 dark:text-gray-400 text-sm">
            {t("profile.locationDesc")}
          </p>
          {/* GPS detect button */}
          <button
            onClick={detectLocation}
            disabled={gpsLoading}
            className="w-full flex items-center justify-center gap-2 border border-terra text-terra h-11 rounded-xl text-sm font-bold hover:bg-terra hover:text-white transition-colors disabled:opacity-50"
          >
            {gpsLoading ? (
              <><div className="w-4 h-4 border-2 border-terra border-t-transparent rounded-full animate-spin" /> Detecting location...</>
            ) : (
              <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/><path d="M12 1v2M12 21v2M1 12h2M21 12h2"/></svg> Use my current location</>
            )}
          </button>
          <p className="text-ink-500 dark:text-gray-500 text-xs -mt-2 text-center">or select manually below</p>
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
          <h2 className="text-ink dark:text-white font-bold mb-1">{t("profile.language")}</h2>
          <p className="text-ink-500 dark:text-gray-400 text-sm mb-4">
            {t("profile.languageDesc")}
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
                  <span className="block text-xs opacity-75 mt-0.5">{t("profile.active")}</span>
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