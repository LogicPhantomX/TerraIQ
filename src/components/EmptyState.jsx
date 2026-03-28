// ─── Empty State Components ───────────────────────────────────────────
// One component per page. Shows when there is no data yet.
// Each has an icon, message, and a call to action.

import { Link } from "react-router-dom";

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
  return (
    <EmptyBase
      icon="🌿"
      title="No scans yet"
      subtitle="Scan your first crop to detect diseases, weeds, and pests in 5 seconds."
      action={{ to:"/scanner", label:"Scan a Crop" }}
    />
  );
}

export function EmptySoilTests() {
  return (
    <EmptyBase
      icon="🌍"
      title="No soil tests yet"
      subtitle="Enter your soil readings to get Allamanda Compost, Biochar, and Supplement recommendations."
      action={{ to:"/soil", label:"Analyse Soil" }}
    />
  );
}

export function EmptyHarvests() {
  return (
    <EmptyBase
      icon="🧺"
      title="No harvests logged"
      subtitle="Log your first harvest to get shelf-life predictions and spoilage alerts."
      action={{ to:"/harvest", label:"Log a Harvest" }}
    />
  );
}

export function EmptyMarket() {
  return (
    <EmptyBase
      icon="🏪"
      title="No market queries yet"
      subtitle="Enter a crop to find the best market, current Naira prices, and when to sell."
      action={{ to:"/market", label:"Get Market Advice" }}
    />
  );
}

export function EmptyAnalytics() {
  return (
    <EmptyBase
      icon="📊"
      title="No data to show yet"
      subtitle="Start scanning crops and logging soil tests. Your analytics will build up here automatically."
      action={{ to:"/scanner", label:"Scan Your First Crop" }}
    />
  );
}

export function EmptyCooperative() {
  return (
    <EmptyBase
      icon="👨‍🌾"
      title="Not in a cooperative yet"
      subtitle="Create a cooperative for your farming community or join one with an invite code."
    />
  );
}

export function EmptyAlerts() {
  return (
    <EmptyBase
      icon="🔔"
      title="No alerts yet"
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
