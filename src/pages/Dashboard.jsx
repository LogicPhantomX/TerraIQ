import Layout from "@/components/Layout";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import { DashboardSkeleton } from "@/components/Skeleton";
import { EmptyScans } from "@/components/EmptyState";
import WeatherWidget from "@/components/WeatherWidget";
import CropPriceTicker from "@/components/CropPriceTicker";
import { checkAndNotify } from "@/lib/notifications";
import { keepSupabaseAwake } from "@/lib/supabase";
import toast from "react-hot-toast";



// Get the best available display name — never fall back to generic "Farmer"
function getDisplayName(profile) {
  if (!profile) return "";
  const full = profile.full_name?.trim();
  if (full) return full.split(" ")[0]; // first name
  if (profile.farm_name) return profile.farm_name.split(" ")[0];
  return ""; // empty — greet without a name
}

// Returns the correct i18n greeting key based on current local time
function getGreetingKey() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "dashboard.greetingMorning";
  if (hour >= 12 && hour < 17) return "dashboard.greetingAfternoon";
  return "dashboard.greetingEvening";
}

function norm(v) { return (v??"").toString().toLowerCase().trim(); }

const SEV = {
  low:      "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
  moderate: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400",
  high:     "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400",
  critical: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
};

export default function DashboardPage() {
  const { t } = useTranslation();
  const [profile,    setProfile]    = useState(null);
  const [stats,      setStats]      = useState({ scans:0, soilTests:0, harvests:0 });
  const [recentScans,setRecentScans]= useState([]);
  const [loading,    setLoading]    = useState(true);
  const [isNewUser,  setIsNewUser]  = useState(false);

const [profileLoaded, setProfileLoaded] = useState(false); // shows name fast

useEffect(() => {
  (async () => {
    const { data: { session: _authSess } } = await supabase.auth.getSession();
      const user = _authSess?.user;
    if (!user) return;

    // Load profile FIRST — shows name immediately, removes skeleton
    const { data: p } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    setProfile(p);
    setLoading(false); // ← Remove skeleton as soon as profile loads

    // Load stats in background — page already visible
    const [scans, soil, harvest] = await Promise.all([
      supabase.from("scans").select("*").eq("user_id", user.id).order("created_at",{ascending:false}).limit(5),
      supabase.from("soil_tests").select("id").eq("user_id", user.id),
      supabase.from("harvests").select("id").eq("user_id", user.id),
    ]);
    setStats({ scans:scans.data?.length??0, soilTests:soil.data?.length??0, harvests:harvest.data?.length??0 });
    setRecentScans(scans.data??[]);
    setIsNewUser((scans.data?.length ?? 0) === 0);
    checkAndNotify(user.id, p?.region);
    keepSupabaseAwake();
  })();
}, []);

// Check if user just confirmed their email
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const type = params.get("type");
  if (type === "signup" || type === "email_change") {
    toast.success(t("common.emailConfirmed"));
    window.history.replaceState({}, "", window.location.pathname);
  }
}, [t]);

  if (loading) return <Layout><DashboardSkeleton /></Layout>;

  return (
    <Layout>
      {/* Greeting */}
      <div className="mb-6">
        <h1 className="text-ink dark:text-white text-3xl font-black">
          {t(getGreetingKey())}{getDisplayName(profile) ? `, ${getDisplayName(profile)}` : ""} 👋
        </h1>
        <p className="text-ink-500 dark:text-gray-400 mt-1">{profile?.farm_name ? `${profile.farm_name} · ` : ""}{profile?.city && profile?.region ? `${profile.city}, ${profile.region}` : profile?.region ?? ""}</p>
      </div>

      {/* Welcome banner for new users */}
      {isNewUser && (
        <div className="bg-terra/10 dark:bg-terra/10 border border-terra/20 rounded-2xl p-5 mb-6 flex gap-4 items-start">
          <span className="text-3xl shrink-0"></span>
          <div className="flex-1">
            <p className="text-ink dark:text-white font-bold mb-1">{t("dashboard.welcome")}</p>
            <p className="text-ink-500 dark:text-gray-400 text-sm mb-3">{t("dashboard.setupMessage")}</p>
            <div className="flex flex-wrap gap-2">
              <Link to="/scanner" className="bg-terra text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-terra-dark transition-colors">{t("dashboard.scanCrop")}</Link>
              <Link to="/soil" className="bg-white dark:bg-dark-surface border border-deep-light dark:border-dark-light text-ink dark:text-white px-4 py-2 rounded-xl text-sm font-semibold hover:border-terra transition-colors">{t("dashboard.analyseSoil")}</Link>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label:t("dashboard.totalScans"),  value:stats.scans,     color:"text-terra", to:"/scans"     },
          { label:t("dashboard.soilTests"),   value:stats.soilTests, color:"text-sky",   to:"/soil"      },
          { label:t("dashboard.harvests"),    value:stats.harvests,  color:"text-amber", to:"/harvest"   },
        ].map(s => (
          <Link key={s.label} to={s.to} className="bg-white dark:bg-dark-surface rounded-2xl p-5 border border-deep-light dark:border-dark-light shadow-card hover:border-terra transition-colors block">
            <div className={`text-3xl font-black ${s.color}`}>{s.value}</div>
            <div className="text-ink-500 dark:text-gray-400 text-sm mt-1">{s.label}</div>
          </Link>
        ))}
      </div>

      {/* Weather + quick actions */}
      <div className="grid md:grid-cols-2 gap-5 mb-6">
        <WeatherWidget city={profile?.city} region={profile?.region} />

        <div className="grid grid-cols-2 gap-3">
          {[
            { icon:"⊙", label:t("dashboard.scanCrop"),    to:"/scanner",     color:"bg-terra text-white"  },
            { icon:"◈", label:t("dashboard.analyseSoil"), to:"/soil",        color:"bg-sky/10 text-sky border border-sky/20" },
            { icon:"svg_growth", label:t("dashboard.cropGrowth"), to:"/growth", color:"bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800" },
            { icon:"◆", label:t("dashboard.marketPrice"), to:"/market",      color:"bg-amber/10 text-amber border border-amber/20" },
          ].map(a => (
            <Link key={a.label} to={a.to}
              className={`${a.color} rounded-2xl p-4 flex flex-col items-center justify-center gap-2 text-center hover:scale-105 transition-all shadow-sm font-semibold text-sm`}
            >
              {a.icon === "svg_growth" ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22V12" /><path d="M12 12C12 7 8 4 3 5c0 5 3 8 9 7" /><path d="M12 12c0-5 4-8 9-7-1 5-4 8-9 7" />
                </svg>
              ) : (
                <span className="text-2xl">{a.icon}</span>
              )}
              {a.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Recent scans */}
      <div className="bg-white dark:bg-dark-surface rounded-2xl border border-deep-light dark:border-dark-light shadow-card mb-6">
        <div className="px-5 py-4 border-b border-deep-light dark:border-dark-light flex justify-between items-center">
          <h2 className="text-ink dark:text-white font-bold">{t("dashboard.recentScans")}</h2>
          {recentScans.length > 0 && (
            <Link to="/scans" className="text-terra text-sm font-semibold hover:underline">{t("common.viewAll")} →</Link>
          )}
        </div>
        {recentScans.length === 0 ? <EmptyScans /> : recentScans.map(s => (
          <div key={s.id} className="px-5 py-4 border-b border-deep-light dark:border-dark-light last:border-0 flex justify-between items-center">
            <div>
              <p className="text-ink dark:text-white font-medium">{s.result}</p>
              <p className="text-ink-500 dark:text-gray-500 text-sm">{s.crop} · {format(new Date(s.created_at),"MMM d, yyyy")}</p>
            </div>
            <span className={`text-xs px-2.5 py-1 rounded-lg font-semibold capitalize ${SEV[norm(s.severity)]??SEV.low}`}>{s.severity}</span>
          </div>
        ))}
      </div>

      {/* Crop price ticker */}
      <CropPriceTicker location={profile?.city || profile?.region} />
    </Layout>
  );
}