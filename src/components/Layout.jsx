import { NavLink, useNavigate, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/lib/supabase";
import ThemeToggle from "@/components/ThemeToggle";

export default function Layout({ children }) {
  const { t }    = useTranslation();
  const navigate = useNavigate();
  const [menuOpen,   setMenuOpen]   = useState(false);
  const [unreadCount,setUnreadCount]= useState(0);

  const NAV = [
    { to:"/dashboard",   icon:"⊞", label:t("nav.dashboard")   },
    { to:"/scanner",     icon:"⊙", label:t("nav.scanner")     },
    { to:"/scans",       icon:"◧", label:"Scan History"        },
    { to:"/soil",        icon:"◈", label:t("nav.soil")        },
    { to:"/irrigation",  icon:"◎", label:t("nav.irrigation")  },
    { to:"/harvest",     icon:"❧", label:t("nav.harvest")     },
    { to:"/market",      icon:"◆", label:t("nav.market")      },
    { to:"/cooperative", icon:"◉", label:t("nav.cooperative") },
    { to:"/analytics",   icon:"▦", label:t("nav.analytics")   },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  // Load unread notification count
  useEffect(() => {
    loadUnread();
    // Re-check every 60 seconds
    const interval = setInterval(loadUnread, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadUnread = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { count } = await supabase
      .from("notifications")
      .select("id", { count:"exact", head:true })
      .eq("user_id", user.id)
      .eq("read", false);
    setUnreadCount(count ?? 0);
  };

  const active   = "bg-terra text-white shadow-sm";
  const inactive = "text-ink-500 dark:text-gray-400 hover:bg-deep-surface dark:hover:bg-dark-surface hover:text-ink dark:hover:text-white";
  const base     = "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all";

  const Wordmark = ({ size = 15 }) => (
    <span style={{ fontWeight:900, fontSize:size, color:"inherit", letterSpacing:"-0.3px" }}>
      TerraIQ<span style={{ color:"#1E8A4C", fontSize:size*1.1, verticalAlign:"middle", marginLeft:1 }}>+</span>
    </span>
  );

  const Logo = ({ size = 36 }) => (
    <img src="/icon.png" alt="TerraIQ+" style={{ width:size, height:size, borderRadius:size*0.28, objectFit:"cover", flexShrink:0 }} />
  );

  // Bell icon with badge
  const NotificationBell = ({ size = "md" }) => (
    <Link
      to="/notifications"
      className="relative flex items-center justify-center"
      style={{ width: size==="sm" ? 36 : 40, height: size==="sm" ? 36 : 40 }}
    >
      <div className={`w-full h-full rounded-xl flex items-center justify-center text-ink-500 dark:text-gray-400 hover:bg-deep-surface dark:hover:bg-dark-surface hover:text-ink dark:hover:text-white transition-colors`}>
        {/* Bell SVG — no emoji */}
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
      </div>
      {unreadCount > 0 && (
        <span style={{
          position:"absolute", top:4, right:4,
          width:16, height:16, borderRadius:"50%",
          backgroundColor:"#C0392B", color:"white",
          fontSize:9, fontWeight:800,
          display:"flex", alignItems:"center", justifyContent:"center",
          border:"2px solid white",
        }}>
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </Link>
  );

  return (
    <div className="flex min-h-screen bg-deep-mid dark:bg-dark-base">

      {/* ── Sidebar ──────────────────────────────────────────────────── */}
      <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-dark-mid border-r border-deep-light dark:border-dark-light fixed h-full z-10 shadow-sm">
        <div className="px-6 py-5 border-b border-deep-light dark:border-dark-light">
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <Logo size={36} />
              <div>
                <Wordmark size={15} />
                <p className="text-ink-500 dark:text-gray-400 text-xs mt-0.5">Smart Farming</p>
              </div>
            </div>
            <NotificationBell size="sm" />
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV.map(item => (
            <NavLink key={item.to} to={item.to}
              className={({ isActive }) => `${base} ${isActive ? active : inactive}`}
            >
              <span className="text-base w-5 text-center">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-deep-light dark:border-dark-light space-y-1">
          <div className="flex items-center justify-between px-3 py-2.5">
            <span className="text-ink-500 dark:text-gray-400 text-sm">Dark mode</span>
            <ThemeToggle />
          </div>
          <NavLink to="/profile" className={({ isActive }) => `${base} ${isActive ? active : inactive}`}>
            <span className="text-base w-5 text-center">◎</span>{t("nav.profile")}
          </NavLink>
          <button onClick={handleLogout} className={`w-full ${base} text-ink-500 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-danger/10 hover:text-danger`}>
            <span className="text-base w-5 text-center">→</span>{t("nav.signout")}
          </button>
        </div>
      </aside>

      {/* ── Mobile header ──────────────────────────────────────────────── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-20 bg-white dark:bg-dark-mid border-b border-deep-light dark:border-dark-light px-4 py-3 flex items-center justify-between shadow-sm">
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <Logo size={32} />
          <Wordmark size={16} />
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell size="sm" />
          <ThemeToggle />
          <button onClick={() => setMenuOpen(!menuOpen)}
            className="text-ink-400 dark:text-gray-400 w-9 h-9 flex items-center justify-center rounded-lg hover:bg-deep-surface dark:hover:bg-dark-surface text-xl"
          >
            {menuOpen ? "✕" : "☰"}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden fixed top-14 left-0 right-0 z-20 bg-white dark:bg-dark-mid border-b border-deep-light dark:border-dark-light p-3 space-y-0.5 shadow-lg max-h-[80vh] overflow-y-auto">
          {[...NAV, { to:"/profile", icon:"◎", label:t("nav.profile") }].map(item => (
            <NavLink key={item.to} to={item.to} onClick={() => setMenuOpen(false)}
              className={({ isActive }) => `${base} ${isActive ? active : inactive}`}
            >
              <span>{item.icon}</span>{item.label}
            </NavLink>
          ))}
          <button
            onClick={() => { setMenuOpen(false); handleLogout(); }}
            className={`w-full ${base} text-ink-500 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-danger/10 hover:text-danger`}
          >
            <span>→</span>{t("nav.signout")}
          </button>
        </div>
      )}

      {/* ── Content ──────────────────────────────────────────────────── */}
      <main className="flex-1 md:ml-64 pt-14 md:pt-0 min-h-screen">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-8">
          {children}
        </div>
      </main>
    </div>
  );
}