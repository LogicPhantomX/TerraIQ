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
    { to:"/scans",       icon:"◧", label:"Scan History" },
    { to:"/soil",        icon:"⊕", label:"Soil"         },
    { to:"/irrigation",  icon:"◎", label:"Irrigation"   },
    { to:"/harvest",     icon:"❧", label:"Harvest"      },
    { to:"/market",      icon:"◆", label:"Market"       },
    { to:"/cooperative", icon:"◉", label:"Cooperative"  },
    { to:"/analytics",   icon:"▦", label:"Analytics"    },
  ];

  const handleLogout = async () => { await supabase.auth.signOut(); navigate("/login"); };

  useEffect(() => {
    loadUnread();
    // Realtime subscription — bell updates instantly when new notification
    const channel = supabase.channel("notif_bell")
      .on("postgres_changes", { event:"INSERT", schema:"public", table:"notifications" },
        (payload) => {
          supabase.auth.getUser().then(({ data: { user } }) => {
            if (user && payload.new.user_id === user.id) {
              setUnreadCount(c => c + 1);
            }
          });
        }
      )
      .subscribe();
    const interval = setInterval(loadUnread, 60000);
    return () => { supabase.removeChannel(channel); clearInterval(interval); };
  }, []);

  const loadUnread = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { count } = await supabase.from("notifications")
      .select("id", { count:"exact", head:true })
      .eq("user_id", user.id).eq("read", false);
    setUnreadCount(count ?? 0);
  };

  const active   = "bg-terra text-white";
  const inactive = "text-ink-500 dark:text-gray-400 hover:bg-deep-mid dark:hover:bg-dark-mid hover:text-ink dark:hover:text-white";
  const base     = "flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all";

  const Bell = () => (
    <Link to="/notifications" className="relative flex items-center justify-center w-9 h-9 rounded-xl hover:bg-deep-mid dark:hover:bg-dark-mid transition-colors">
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" className="text-ink-500 dark:text-gray-400">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
      </svg>
      {unreadCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-xs font-black flex items-center justify-center border border-white dark:border-dark-mid" style={{ fontSize:8 }}>
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </Link>
  );

  const Logo = ({ size = 32 }) => (
    <img src="/icon.png" alt="TerraIQ+" style={{ width:size, height:size, borderRadius:size*0.28, objectFit:"cover", flexShrink:0 }} />
  );

  return (
    <div className="flex min-h-screen bg-deep-mid dark:bg-dark-base">

      {/* ── Sidebar (desktop only) ─────────────────────────────────── */}
      <aside className="hidden md:flex flex-col w-56 bg-white dark:bg-dark-mid border-r border-deep-light dark:border-dark-light fixed h-full z-10 shadow-sm">
        <div className="px-4 py-4 border-b border-deep-light dark:border-dark-light flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Logo size={32} />
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
          <button onClick={handleLogout} className={`w-full ${base} text-ink-500 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-danger/10 hover:text-danger`}>
            <span className="text-sm w-4 text-center">→</span>Sign out
          </button>
        </div>
      </aside>

      {/* ── Mobile header ──────────────────────────────────────────── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-20 bg-white dark:bg-dark-mid border-b border-deep-light dark:border-dark-light px-3 py-2.5 flex items-center justify-between shadow-sm" style={{ minHeight:52 }}>
        <div className="flex items-center gap-2">
          <Logo size={28} />
          <span className="text-ink dark:text-white font-black text-sm">TerraIQ<span className="text-terra text-base">+</span></span>
        </div>
        <div className="flex items-center gap-1">
          <Bell />
          <ThemeToggle />
          <button onClick={() => setMenuOpen(!menuOpen)}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-ink-400 dark:text-gray-400 hover:bg-deep-mid dark:hover:bg-dark-mid text-lg">
            {menuOpen ? "✕" : "☰"}
          </button>
        </div>
      </div>

      {/* Mobile menu — slim full-screen drawer */}
      {menuOpen && (
        <>
          {/* Backdrop */}
          <div className="md:hidden fixed inset-0 z-20 bg-black/30" onClick={() => setMenuOpen(false)} />
          <div className="md:hidden fixed top-[52px] left-0 right-0 bottom-0 z-30 bg-white dark:bg-dark-mid overflow-y-auto">
            <nav className="px-3 py-3 space-y-0.5">
              {NAV.map(item => (
                <NavLink key={item.to} to={item.to} onClick={() => setMenuOpen(false)}
                  className={({ isActive }) => `${base} ${isActive ? active : inactive}`}>
                  <span className="text-sm w-4 text-center shrink-0">{item.icon}</span>
                  {item.label}
                </NavLink>
              ))}
            </nav>
            <div className="px-3 py-3 border-t border-deep-light dark:border-dark-light space-y-0.5 mt-2">
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

      {/* ── Content ────────────────────────────────────────────────── */}
      <main className="flex-1 md:ml-56 min-h-screen" style={{ paddingTop:52 }}>
        <div className="max-w-4xl mx-auto px-3 md:px-6 py-6 md:pt-8">
          {children}
        </div>
      </main>
    </div>
  );
}
