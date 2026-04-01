// ─── TerraIQ_WEB/src/components/Layout.jsx ───────────────────────────
// Key fix: uses getSession() instead of getUser() everywhere in this file
// getSession() does NOT use the navigator lock — no more lock errors

import { NavLink, useNavigate, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/lib/supabase";
import ThemeToggle from "@/components/ThemeToggle";

export default function Layout({ children }) {
  const { t }    = useTranslation();
  const navigate = useNavigate();
  const [menuOpen,     setMenuOpen]     = useState(false);
  const [unreadCount,  setUnreadCount]  = useState(0);

  const NAV = [
    { to:"/dashboard",   icon:"⊞", label:"Dashboard"    },
    { to:"/scanner",     icon:"◈", label:"Scanner"      },
    { to:"/history",     icon:"◧", label:"History"        },
    { to:"/soil",        icon:"⊕", label:"Soil"         },
    { to:"/irrigation",  icon:"◎", label:"Irrigation"   },
    { to:"/harvest",     icon:"❧", label:"Harvest"      },
    { to:"/market",      icon:"◆", label:"Market"       },
    { to:"/cooperative", icon:"◉", label:"Cooperative"  },
    { to:"/analytics",   icon:"▦", label:"Analytics"    },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  useEffect(() => {
    loadUnread();

    // ── Realtime — use session, NOT getUser() ──
    // getUser() causes lock contention. getSession() is instant and safe.
    const channel = supabase.channel("notif_bell")
      .on("postgres_changes",
        { event:"INSERT", schema:"public", table:"notifications" },
        async (payload) => {
          // Use getSession — no lock
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user && payload.new.user_id === session.user.id) {
            setUnreadCount(c => c + 1);
          }
        }
      ).subscribe();

    const interval = setInterval(loadUnread, 60000);
    return () => { supabase.removeChannel(channel); clearInterval(interval); };
  }, []);

  const loadUnread = async () => {
    // Use getSession — no lock
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;
    const { count } = await supabase
      .from("notifications")
      .select("id", { count:"exact", head:true })
      .eq("user_id", session.user.id)
      .eq("read", false);
    setUnreadCount(count ?? 0);
  };

  const active   = "bg-terra text-white";
  const inactive = "text-ink-500 dark:text-gray-400 hover:bg-deep-mid dark:hover:bg-dark-mid hover:text-ink dark:hover:text-white";
  const base     = "flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all";

  const Bell = ({ small = false }) => (
    <Link to="/notifications"
      className="relative flex items-center justify-center rounded-xl hover:bg-deep-mid dark:hover:bg-dark-mid transition-colors"
      style={{ width: small ? 32 : 36, height: small ? 32 : 36, flexShrink:0 }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        className="text-ink-500 dark:text-gray-400">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
      </svg>
      {unreadCount > 0 && (
        <span style={{
          position:"absolute", top:-2, right:-2, minWidth:14, height:14,
          borderRadius:7, backgroundColor:"#C0392B", color:"white",
          fontSize:8, fontWeight:800, lineHeight:"14px",
          display:"flex", alignItems:"center", justifyContent:"center",
          border:"1.5px solid white", padding:"0 2px",
        }}>
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </Link>
  );

  const Logo = ({ size = 28 }) => (
    <img src="/icon.png" alt="TerraIQ+"
      style={{ width:size, height:size, borderRadius:size*0.28, objectFit:"cover", flexShrink:0 }} />
  );

  return (
    <div className="flex min-h-screen bg-deep-mid dark:bg-dark-base">

      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-56 bg-white dark:bg-dark-mid border-r border-deep-light dark:border-dark-light fixed h-full z-10 shadow-sm">
        <div className="px-4 py-4 border-b border-deep-light dark:border-dark-light flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Logo size={30} />
            <div>
              <span className="text-ink dark:text-white font-black text-sm">TerraIQ<span className="text-terra text-base">+</span></span>
              <p className="text-ink-500 dark:text-gray-500 text-xs">Smart Farming</p>
            </div>
          </div>
          <Bell />
        </div>
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          {NAV.map(item => (
            <NavLink key={item.to} to={item.to}
              className={({ isActive }) => `${base} ${isActive ? active : inactive}`}>
              <span className="text-sm w-4 text-center shrink-0">{item.icon}</span>
              <span className="truncate">{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="px-2 py-3 border-t border-deep-light dark:border-dark-light space-y-0.5">
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-ink-500 dark:text-gray-400 text-xs">Dark mode</span>
            <ThemeToggle />
          </div>
          <NavLink to="/profile" className={({ isActive }) => `${base} ${isActive ? active : inactive}`}>
            <span className="text-sm w-4 text-center">◎</span><span>Profile</span>
          </NavLink>
          <button onClick={handleLogout}
            className={`w-full ${base} text-ink-500 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-danger/10 hover:text-danger`}>
            <span className="text-sm w-4 text-center">→</span>Sign out
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-20 bg-white dark:bg-dark-mid border-b border-deep-light dark:border-dark-light shadow-sm"
        style={{ height:48, display:"flex", alignItems:"center",
          paddingLeft:10, paddingRight:10, gap:6, overflow:"hidden" }}>
        <div style={{ display:"flex", alignItems:"center", gap:6, flexShrink:0 }}>
          <Logo size={26} />
          <span style={{ fontWeight:900, fontSize:13, whiteSpace:"nowrap" }}>
            <span className="text-ink dark:text-white">TerraIQ</span>
            <span className="text-terra" style={{ fontSize:15 }}>+</span>
          </span>
        </div>
        <div style={{ flex:1, minWidth:0 }} />
        <Bell small />
        <ThemeToggle />
        <button onClick={() => setMenuOpen(!menuOpen)}
          style={{ width:32, height:32, borderRadius:8, border:"none",
            backgroundColor:"transparent", cursor:"pointer",
            display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, fontSize:17 }}
          className="text-ink-400 dark:text-gray-400 hover:bg-deep-mid dark:hover:bg-dark-mid transition-colors">
          {menuOpen ? "✕" : "☰"}
        </button>
      </div>

      {/* Mobile drawer */}
      {menuOpen && (
        <>
          <div className="md:hidden fixed inset-0 z-20 bg-black/30" onClick={() => setMenuOpen(false)} />
          <div className="md:hidden fixed left-0 right-0 bottom-0 z-30 bg-white dark:bg-dark-mid overflow-y-auto" style={{ top:48 }}>
            <nav className="px-3 py-3 space-y-0.5">
              {NAV.map(item => (
                <NavLink key={item.to} to={item.to} onClick={() => setMenuOpen(false)}
                  className={({ isActive }) => `${base} ${isActive ? active : inactive}`}>
                  <span className="text-sm w-4 text-center shrink-0">{item.icon}</span>
                  {item.label}
                </NavLink>
              ))}
            </nav>
            <div className="px-3 py-3 border-t border-deep-light dark:border-dark-light space-y-0.5">
              <NavLink to="/profile" onClick={() => setMenuOpen(false)}
                className={({ isActive }) => `${base} ${isActive ? active : inactive}`}>
                <span className="text-sm w-4 text-center">◎</span>Profile
              </NavLink>
              <button onClick={() => { setMenuOpen(false); handleLogout(); }}
                className={`w-full ${base} text-danger hover:bg-red-50 dark:hover:bg-danger/10`}>
                <span className="text-sm w-4 text-center">→</span>Sign out
              </button>
            </div>
          </div>
        </>
      )}

      {/* Content */}
      <main className="flex-1 md:ml-56 min-h-screen" style={{ paddingTop:48 }}>
        <div className="max-w-4xl mx-auto py-5 md:py-8"
          style={{ paddingLeft:"clamp(10px,3vw,24px)", paddingRight:"clamp(10px,3vw,24px)", overflowX:"hidden" }}>
          {children}
        </div>
      </main>
    </div>
  );
}
