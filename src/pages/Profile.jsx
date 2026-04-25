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
    toast.loading("Getting your GPS coordinates...", { id: "gps" });

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        toast.loading("Looking up your location...", { id: "gps" });

        // ── Reverse-geocoding helpers ─────────────────────────────────

        const tryNominatim = async () => {
          const r = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=jsonv2&zoom=10&addressdetails=1`,
            { headers: { "Accept-Language": "en", "User-Agent": "TerraIQ-App/2.0 (contact@terraiq.app)" } }
          );
          if (!r.ok) throw new Error("Nominatim failed");
          const d = await r.json();
          const a = d.address ?? {};
          const city  = a.city ?? a.town ?? a.municipality ?? a.village ?? a.suburb ?? a.county ?? "";
          const state = a.state ?? a["ISO3166-2-lvl4"] ?? "";
          if (!state) throw new Error("No state from Nominatim");
          return { city, state };
        };

        const tryBigDataCloud = async () => {
          const r = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
          );
          if (!r.ok) throw new Error("BigDataCloud failed");
          const d = await r.json();
          const city  = d.city ?? d.locality ?? d.localityInfo?.administrative?.[3]?.name ?? "";
          const state = d.principalSubdivision ?? d.countryName ?? "";
          if (!state) throw new Error("No state from BigDataCloud");
          return { city, state };
        };

        const tryGeoApify = async () => {
          // Free tier — no key required for basic reverse geocoding
          const r = await fetch(
            `https://api.geoapify.com/v1/geocode/reverse?lat=${latitude}&lon=${longitude}&lang=en&apiApiKey=free`
          );
          if (!r.ok) throw new Error("Geoapify failed");
          const d = await r.json();
          const props = d.features?.[0]?.properties ?? {};
          const city  = props.city ?? props.town ?? props.village ?? props.suburb ?? "";
          const state = props.state ?? props.county ?? "";
          if (!state) throw new Error("No state from Geoapify");
          return { city, state };
        };

        const tryPositionStack = async () => {
          // Uses ipinfo as last resort — works purely on IP, no GPS needed
          const r = await fetch(`https://ipinfo.io/json?token=`);
          if (!r.ok) throw new Error("ipinfo failed");
          const d = await r.json();
          const parts = (d.city ?? "").split(",");
          return {
            city:  parts[0]?.trim() ?? d.city ?? "",
            state: d.region ?? "",
          };
        };

        let resolved = null;
        for (const fn of [tryNominatim, tryBigDataCloud, tryGeoApify, tryPositionStack]) {
          try {
            const result = await fn();
            if (result.state) { resolved = result; break; }
          } catch {
            // silently try next
          }
        }

        toast.dismiss("gps");
        setGpsLoading(false);

        if (resolved?.state) {
          const state = normaliseState(resolved.state);
          const city  = resolved.city;
          if (state) {
            setForm(p => ({ ...p, region: state, city }));
            toast.success(`📍 Location detected: ${city ? city + ", " : ""}${state}`);
          } else {
            // We got coordinates and a place name but couldn't match a Nigerian state
            // Still show the city so user only needs to fix state
            setForm(p => ({ ...p, city: resolved.city }));
            toast.error("Detected your area but couldn't match your Nigerian state — please select it manually.");
          }
        } else {
          toast.error("Could not look up your location. Please select your state and city manually.");
        }
      },
      (err) => {
        toast.dismiss("gps");
        setGpsLoading(false);
        if (err.code === 1) {
          toast.error("Location access denied. Go to your browser/app settings and allow location permission for this site, then try again.");
        } else if (err.code === 2) {
          toast.error("GPS signal weak. Try moving to an open area, or enable Wi-Fi to help with location.");
        } else if (err.code === 3) {
          toast.error("Location timed out. Check that GPS is enabled in your phone settings and try again.");
        } else {
          toast.error("Could not get your location. Please select your state and city manually.");
        }
      },
      {
        timeout: 40000,           // 40s — Nigerian mobile networks can be slow
        maximumAge: 300000,       // Accept cached position up to 5 minutes old
        enableHighAccuracy: false, // false = uses cell tower + Wi-Fi (faster, no satellite wait)
      }
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
            className="w-full flex items-center justify-center gap-2 border border-terra text-terra h-11 rounded-xl text-sm font-bold hover:bg-terra hover:text-white transition-colors disabled:opacity-60"
          >
            {gpsLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Detecting your location...
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>
                </svg>
                Use my current location (GPS)
              </>
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