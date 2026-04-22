// ─── Empty State Components ───────────────────────────────────────────
// One component per page. Shows when there is no data yet.
// Each has an icon, message, and a call to action.

import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

function EmptyBase({ icon, title, subtitle, action }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"64px 24px", textAlign:"center" }}>
      <div style={{
        width:80, height:80, borderRadius:24, marginBottom:20,
        backgroundColor:"#E8F5EE", display:"flex", alignItems:"center", justifyContent:"center", fontSize:36,
      }} className="dark:!bg-terra/10">
        {icon}
      </div>
      <h3 className="text-ink dark:text-white font-bold text-lg mb-2">{title}</h3>
      <p className="text-ink-500 dark:text-gray-400 text-sm max-w-xs mb-6 leading-relaxed">{subtitle}</p>
      {action && (
        <Link to={action.to} style={{
          backgroundColor:"#1E8A4C", color:"white",
          padding:"11px 28px", borderRadius:12,
          textDecoration:"none", fontSize:14, fontWeight:700,
        }}>
          {action.label}
        </Link>
      )}
    </div>
  );
}

export function EmptyScans() {
  const { t } = useTranslation();
  return (
    <EmptyBase
      icon="🌿"
      title={t("empty.noScans")}
      subtitle={t("empty.noScansSubtitle")}
      action={{ to:"/scanner", label:t("empty.scanCrop") }}
    />
  );
}

export function EmptySoilTests() {
  const { t } = useTranslation();
  return (
    <EmptyBase
      icon="🌍"
      title={t("empty.noSoilTests")}
      subtitle={t("empty.noSoilTestsSubtitle")}
      action={{ to:"/soil", label:t("empty.analyseSoil") }}
    />
  );
}

export function EmptyHarvests() {
  const { t } = useTranslation();
  return (
    <EmptyBase
      icon="🧺"
      title={t("empty.noHarvests")}
      subtitle={t("empty.noHarvestsSubtitle")}
      action={{ to:"/harvest", label:t("empty.logHarvest") }}
    />
  );
}

export function EmptyMarket() {
  const { t } = useTranslation();
  return (
    <EmptyBase
      icon="🏪"
      title={t("empty.noMarketQueries")}
      subtitle={t("empty.noMarketQueriesSubtitle")}
      action={{ to:"/market", label:t("empty.getMarketAdvice") }}
    />
  );
}

export function EmptyAnalytics() {
  const { t } = useTranslation();
  return (
    <EmptyBase
      icon="📊"
      title={t("empty.noData")}
      subtitle={t("empty.noDataSubtitle")}
      action={{ to:"/scanner", label:t("empty.scanFirstCrop") }}
    />
  );
}

export function EmptyCooperative() {
  const { t } = useTranslation();
  return (
    <EmptyBase
      icon="👨‍🌾"
      title={t("empty.notInCooperative")}
      subtitle={t("empty.notInCooperativeSubtitle")}
    />
  );
}

export function EmptyAlerts() {
  const { t } = useTranslation();
  return (
    <EmptyBase
      icon="🔔"
      title={t("empty.noAlerts")}
      subtitle="Disease alerts, harvest reminders, and cooperative messages will appear here."
    />
  );
}

export function EmptyIrrigation() {
  return (
    <EmptyBase
      icon="💧"
      title="No irrigation plan yet"
      subtitle="Enter your crop and farm size to get a 7-day watering schedule based on your local weather."
      action={{ to:"/irrigation", label:"Generate a Plan" }}
    />
  );
}
