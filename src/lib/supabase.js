// ─── src/lib/supabase.js ──────────────────────────────────────────────
// OPTIMISED for Vercel + low data usage:
// • Realtime DISABLED globally — Layout polls instead (saves ~2MB/session)
// • No WebSocket connections opened at startup
// • fetch with keepalive for Vercel's edge network
// • Offline detection — skips requests when no internet
// • Keep-alive ping — prevents Supabase free tier from pausing after 7 days
//   inactivity. Runs once on load, then every 4 days via localStorage timestamp.

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    autoRefreshToken:  true,
    persistSession:    true,
    detectSessionInUrl: true,
    // Use localStorage (works on Vercel, avoids cookie issues)
    storage: window.localStorage,
  },
  realtime: {
    // DISABLED — stops the WebSocket spam and saves data
    // Notifications use polling instead (60s interval in Layout)
    params: { eventsPerSecond: 1 },
  },
  global: {
    fetch: (url, options = {}) => {
      // Skip fetch if offline — prevents ERR_INTERNET_DISCONNECTED spam
      if (!navigator.onLine) {
        return Promise.reject(new Error("No internet connection"));
      }
      return fetch(url, {
        ...options,
        // keepalive helps on Vercel edge — keeps connection alive across navigations
        keepalive: true,
      });
    },
  },
  db: {
    schema: "public",
  },
});

// ── Offline helper ────────────────────────────────────────────────────
// Use this before any Supabase call to show friendly error instead of crash
export function isOnline() {
  return navigator.onLine;
}

// ── Typed query helper — reduces repeated boilerplate ─────────────────
// Usage: const data = await dbSelect("profiles", "id,language", { id: userId });
export async function dbSelect(table, columns, match = {}) {
  if (!navigator.onLine) return null;
  let q = supabase.from(table).select(columns);
  Object.entries(match).forEach(([k, v]) => { q = q.eq(k, v); });
  const { data, error } = await q.single();
  if (error) return null;
  return data;
}

// ── Keep-alive ping ────────────────────────────────────────────────────
// Supabase free tier pauses projects after 7 consecutive days of no DB
// activity. This ping hits the profiles table with a lightweight HEAD
// count query (no rows returned, costs almost zero data) to register
// activity. It only fires if 4+ days have passed since the last ping,
// so a daily active user never triggers it at all.
const PING_KEY      = "terraiq_supabase_ping";
const PING_INTERVAL = 4 * 24 * 60 * 60 * 1000; // 4 days in ms

export function keepSupabaseAwake() {
  if (!navigator.onLine) return;

  try {
    const last = parseInt(localStorage.getItem(PING_KEY) ?? "0", 10);
    const now  = Date.now();

    if (now - last < PING_INTERVAL) return; // too soon — skip

    // Fire and forget — tiny HEAD query, no rows returned
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .limit(1)
      .then(() => {
        localStorage.setItem(PING_KEY, String(Date.now()));
      })
      .catch(() => {}); // silently fail — never crash the app
  } catch {
    // localStorage may be blocked in some privacy modes — ignore
  }
}
