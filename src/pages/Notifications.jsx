import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

const TYPE_STYLE = {
  disease: "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800",
  weather: "bg-blue-50 dark:bg-blue-900/20 text-sky border-blue-200 dark:border-blue-800",
  market:  "bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800",
  harvest: "bg-orange-50 dark:bg-orange-900/20 text-amber border-orange-200 dark:border-orange-800",
  system:  "bg-deep-mid dark:bg-dark-mid text-ink-500 dark:text-gray-400 border-deep-light dark:border-dark-light",
  general: "bg-terra-light dark:bg-terra/10 text-terra border-green-200 dark:border-terra/20",
};

export default function NotificationsPage() {
  const { t } = useTranslation();
  const [notifications, setNotifications] = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [unread,        setUnread]        = useState(0);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    const { data: { session: _authSess } } = await supabase.auth.getSession();
      const user = _authSess?.user;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending:false })
      .limit(50);
    setNotifications(data ?? []);
    setUnread((data ?? []).filter(n => !n.read).length);
    setLoading(false);
  };

  const markAllRead = async () => {
    const { data: { session: _authSess } } = await supabase.auth.getSession();
      const user = _authSess?.user;
    await supabase.from("notifications")
      .update({ read:true })
      .eq("user_id", user.id)
      .eq("read", false);
    setNotifications(prev => prev.map(n => ({ ...n, read:true })));
    setUnread(0);
  };

  const markOneRead = async (id) => {
    await supabase.from("notifications").update({ read:true }).eq("id", id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read:true } : n));
    setUnread(prev => Math.max(0, prev - 1));
  };

  return (
    <Layout>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-ink dark:text-white text-3xl font-black">{t("nav.notifications") || "Notifications"}</h1>
          {unread > 0 && (
            <p className="text-ink-500 dark:text-gray-400 mt-1 text-sm">{unread} unread</p>
          )}
        </div>
        {unread > 0 && (
          <button onClick={markAllRead}
            className="text-terra text-sm font-semibold hover:underline"
          >
            Mark all as read
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3,4].map(i => (
            <div key={i} className="bg-white dark:bg-dark-surface rounded-2xl border border-deep-light dark:border-dark-light p-5 animate-pulse">
              <div className="h-4 bg-deep-light dark:bg-dark-light rounded w-32 mb-3" />
              <div className="h-3 bg-deep-light dark:bg-dark-light rounded w-full mb-2" />
              <div className="h-3 bg-deep-light dark:bg-dark-light rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="bg-white dark:bg-dark-surface rounded-2xl border border-deep-light dark:border-dark-light p-16 text-center shadow-card">
          <div className="w-14 h-14 rounded-2xl bg-deep-mid dark:bg-dark-mid flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ink-500 dark:text-gray-400">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
          </div>
          <p className="text-ink dark:text-white font-bold">No notifications yet</p>
          <p className="text-ink-500 dark:text-gray-400 text-sm mt-2">
            Cooperative alerts, harvest reminders, and market updates will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map(n => (
            <div
              key={n.id}
              onClick={() => { if (!n.read) markOneRead(n.id); }}
              className={`rounded-2xl border p-5 shadow-card cursor-pointer transition-all ${
                n.read
                  ? "bg-white dark:bg-dark-surface border-deep-light dark:border-dark-light"
                  : "bg-terra-light dark:bg-terra/5 border-green-200 dark:border-terra/20"
              }`}
            >
              <div className="flex justify-between items-start gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  {/* Unread dot */}
                  <div className="shrink-0 mt-1.5">
                    {!n.read ? (
                      <div className="w-2 h-2 rounded-full bg-terra" />
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-transparent" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`text-xs px-2.5 py-0.5 rounded-lg font-semibold capitalize border ${TYPE_STYLE[n.type] ?? TYPE_STYLE.general}`}>
                        {n.type}
                      </span>
                      <span className="text-ink-500 dark:text-gray-500 text-xs">
                        {format(new Date(n.created_at), "MMM d · h:mm a")}
                      </span>
                    </div>
                    <p className={`font-semibold text-sm ${n.read ? "text-ink-400 dark:text-gray-300" : "text-ink dark:text-white"}`}>
                      {n.title}
                    </p>
                    <p className="text-ink-500 dark:text-gray-400 text-sm mt-1 leading-relaxed">{n.body}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {notifications.length > 0 && (
        <p className="text-center text-ink-500 dark:text-gray-500 text-xs mt-6">
          Showing last 50 notifications · Tap any to mark as read
        </p>
      )}
    </Layout>
  );
}
