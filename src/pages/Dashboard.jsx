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

// Normalise severity so colors always work regardless of Groq capitalisation
function norm(v) { return (v ?? "").toString().toLowerCase().trim(); }

const SEV = {
  low:      "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
  moderate: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400",
  high:     "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400",
  critical: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
};

export default function DashboardPage() {
  const { t } = useTranslation();
  const [profile,     setProfile]     = useState(null);
  const [stats,       setStats]       = useState({ scans:0, soilTests:0, harvests:0 });
  const [recentScans, setRecentScans] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [isNewUser,   setIsNewUser]   = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [p, scans, soil, harvest] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase.from("scans").select("*").eq("user_id", user.id).order("created_at",{ascending:false}).limit(5),
        supabase.from("soil_tests").select("id").eq("user_id", user.id),
        supabase.from("harvests").select("id").eq("user_id", user.id),
      ]);
      setProfile(p.data);
      setStats({ scans:scans.data?.length??0, soilTests:soil.data?.length??0, harvests:harvest.data?.length??0 });
      setRecentScans(scans.data??[]);
      setIsNewUser((scans.data?.length ?? 0) === 0);
      setLoading(false);

      // Run smart notification checks silently in background
      checkAndNotify(user.id, p.data?.region);
    })();
  }, []);

  if (loading) return <Layout><DashboardSkeleton /></Layout>;

  return (
    <Layout>
      {/* Greeting */}
      <div className="mb-6">
        <h1 className="text-ink dark:text-white text-3xl font-black">
          {t("dashboard.greeting")}, {profile?.full_name?.split(" ")[0] ?? "Farmer"} 👋
        </h1>
        <p className="text-ink-500 dark:text-gray-400 mt-1">{profile?.farm_name} · {profile?.region}</p>
      </div>

      {/* Welcome banner for new users */}
      {isNewUser && (
        <div className="bg-terra/10 border border-terra/20 rounded-2xl p-5 mb-6 flex gap-4 items-start">
          <span className="text-3xl shrink-0">🌱</span>
          <div className="flex-1">
            <p className="text-ink dark:text-white font-bold mb-1">Welcome to TerraIQ+!</p>
            <p className="text-ink-500 dark:text-gray-400 text-sm mb-3">Start by scanning a crop or analysing your soil to see AI recommendations.</p>
            <div className="flex flex-wrap gap-2">
              <Link to="/scanner" className="bg-terra text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-terra-dark transition-colors">Scan a Crop</Link>
              <Link to="/soil" className="bg-white dark:bg-dark-surface border border-deep-light dark:border-dark-light text-ink dark:text-white px-4 py-2 rounded-xl text-sm font-semibold hover:border-terra transition-colors">Analyse Soil</Link>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label:t("dashboard.totalScans"),  value:stats.scans,     color:"text-terra", to:"/scans"   },
          { label:t("dashboard.soilTests"),   value:stats.soilTests, color:"text-sky",   to:"/soil"    },
          { label:t("dashboard.harvests"),    value:stats.harvests,  color:"text-amber", to:"/harvest" },
        ].map(s => (
          <Link key={s.label} to={s.to} className="bg-white dark:bg-dark-surface rounded-2xl p-5 border border-deep-light dark:border-dark-light shadow-card hover:border-terra transition-colors block">
            <div className={`text-3xl font-black ${s.color}`}>{s.value}</div>
            <div className="text-ink-500 dark:text-gray-400 text-sm mt-1">{s.label}</div>
          </Link>
        ))}
      </div>

      {/* Weather + quick actions */}
      <div className="grid md:grid-cols-2 gap-5 mb-6">
        <WeatherWidget region={profile?.region} />
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon:"⊙", label:"Scan Crop",    to:"/scanner",    color:"bg-terra text-white"                             },
            { icon:"◈", label:"Soil Test",    to:"/soil",       color:"bg-sky/10 text-sky border border-sky/20"         },
            { icon:"◎", label:"Irrigation",   to:"/irrigation", color:"bg-sky/10 text-sky border border-sky/20"         },
            { icon:"◆", label:"Market Price", to:"/market",     color:"bg-amber/10 text-amber border border-amber/20"   },
          ].map(a => (
            <Link key={a.label} to={a.to}
              className={`${a.color} rounded-2xl p-4 flex flex-col items-center justify-center gap-2 text-center hover:scale-105 transition-all shadow-sm font-semibold text-sm`}
            >
              <span className="text-2xl">{a.icon}</span>
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
            <Link to="/scans" className="text-terra text-sm font-semibold hover:underline">View all →</Link>
          )}
        </div>
        {recentScans.length === 0 ? <EmptyScans /> : recentScans.map(s => (
          <div key={s.id} className="px-5 py-4 border-b border-deep-light dark:border-dark-light last:border-0 flex justify-between items-center">
            <div>
              <p className="text-ink dark:text-white font-medium">{s.result}</p>
              <p className="text-ink-500 dark:text-gray-500 text-sm">{s.crop} · {format(new Date(s.created_at),"MMM d, yyyy")}</p>
            </div>
            {/* norm() fixes color matching regardless of Groq capitalisation */}
            <span className={`text-xs px-2.5 py-1 rounded-lg font-semibold capitalize ${SEV[norm(s.severity)] ?? SEV.low}`}>
              {s.severity}
            </span>
          </div>
        ))}
      </div>

      {/* Crop price ticker */}
      <CropPriceTicker region={profile?.region} />
    </Layout>
  );
}
