// ─── TerraIQ_WEB/src/context/AuthContext.jsx ─────────────────────────
// Root cause of the lock error: every component calls getUser() independently
// and they race each other. This context calls it ONCE and shares the result.

import { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

const AuthContext = createContext({ user: null, profile: null, loading: true });

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Use getSession() — does NOT use the navigator lock, safe to call anywhere
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) loadProfile(session.user.id);
      else setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) loadProfile(session.user.id);
      else { setProfile(null); setLoading(false); }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadProfile = async (userId) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    setProfile(data);
    setLoading(false);
  };

  const refreshProfile = async () => {
    if (!user) return;
    await loadProfile(user.id);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
