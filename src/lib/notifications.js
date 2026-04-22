// ─── TerraIQ_WEB/src/lib/notifications.js ────────────────────────────
// Fixes:
// 1. Uses getSession() not getUser() — no lock errors
// 2. Only ONE notification per harvest per day (no 3x repeat)
// 3. Only notifies during morning/afternoon/evening windows
// 4. Harvest days computed LIVE from harvested_at + shelf_life_days
// 5. Once expired — no more notifications for that harvest

import { supabase } from "@/lib/supabase";
import { getWeatherForecast } from "@/lib/api";

// ── Time windows: morning, afternoon, evening ─────────────────────────
function isNotificationWindow() {
  const h = new Date().getHours();
  return (h >= 6 && h <= 9) || (h >= 12 && h <= 14) || (h >= 18 && h <= 20);
}

// ── Live days from dates — never use stored column ────────────────────
function liveDays(harvestedAt, shelfLifeDays) {
  if (!harvestedAt || !shelfLifeDays) return null;
  const expiry = new Date(harvestedAt);
  expiry.setDate(expiry.getDate() + shelfLifeDays);
  const today = new Date();
  today.setHours(0,0,0,0); expiry.setHours(0,0,0,0);
  return Math.floor((expiry - today) / 86400000);
}

// ── Dedup: one notification per harvest per calendar day ──────────────
async function notifiedTodayForHarvest(userId, harvestId) {
  const since = new Date(); since.setHours(0,0,0,0);
  // Use a unique key based on harvest ID in the title
  const { data } = await supabase
    .from("notifications")
    .select("id")
    .eq("user_id", userId)
    .eq("type", "harvest")
    .ilike("body", `%${harvestId}%`)
    .gte("created_at", since.toISOString())
    .maybeSingle();
  return !!data;
}

async function notifiedTodayWeather(userId, weatherType) {
  const since = new Date(); since.setHours(0,0,0,0);
  const { data } = await supabase
    .from("notifications")
    .select("id")
    .eq("user_id", userId)
    .eq("type", "weather")
    .ilike("title", `%${weatherType}%`)
    .gte("created_at", since.toISOString())
    .maybeSingle();
  return !!data;
}

// ── Harvest: one per harvest per day, live days, stops when expired ───
async function checkHarvests(userId) {
  const { data } = await supabase
    .from("harvests")
    .select("id, crop, quantity_kg, harvested_at, shelf_life_days")
    .eq("user_id", userId);

  for (const h of data ?? []) {
    const days = liveDays(h.harvested_at, h.shelf_life_days);

    // Expired or null — stop notifying
    if (days === null || days <= 0) continue;

    // Only notify for 1, 2, 3, 5 days remaining
    if (![1, 2, 3, 5].includes(days)) continue;

    // Already sent one today for this harvest?
    if (await notifiedTodayForHarvest(userId, h.id)) continue;

    let title, body;
    if (days === 1) {
      title = `${h.crop} expires TOMORROW`;
      body  = `Your ${h.quantity_kg}kg of ${h.crop} expires tomorrow. Sell or process today. [ref:${h.id}]`;
    } else if (days <= 3) {
      title = `${h.crop} — ${days} days left`;
      body  = `Your ${h.quantity_kg}kg of ${h.crop} has ${days} days remaining. Open Market Advisor for the best price. [ref:${h.id}]`;
    } else {
      title = `${h.crop} — sell within ${days} days`;
      body  = `${days} days left on your ${h.quantity_kg}kg of ${h.crop}. Start looking for buyers this week. [ref:${h.id}]`;
    }

    await supabase.from("notifications").insert({
      user_id:userId, type:"harvest", title, body, read:false
    });
  }
}

// ── Weather: one per type per day ────────────────────────────────────
const COORDS = {
  "oyo":[7.38,3.95],"kano":[12.0,8.59],"lagos":[6.52,3.38],
  "kaduna":[10.51,7.42],"rivers":[4.82,7.05],"kwara":[8.50,4.54],
  "ogun":[7.16,3.35],"enugu":[6.46,7.55],"delta":[5.89,5.68],
  "osun":[7.56,4.52],"ondo":[7.25,5.20],"default":[9.08,8.67],
};

async function checkWeather(userId, region) {
  try {
    const k = Object.keys(COORDS).find(k => k!=="default" && region?.toLowerCase().includes(k)) ?? "default";
    const [lat,lon] = COORDS[k];
    const weather = await getWeatherForecast(lat, lon);
    const d = weather.list?.[0]; if (!d) return;

    const rain  = Math.round((d.pop ?? 0) * 100);
    const temp  = Math.round(d.main.temp);
    const humid = d.main.humidity;

    if (rain > 75 && !await notifiedTodayWeather(userId, "Heavy rain")) {
      await supabase.from("notifications").insert({
        user_id:userId, type:"weather",
        title:`Heavy rain today — ${region}`,
        body:`${rain}% rain chance. Skip irrigation. Check drainage on tomato and pepper beds.`,
        read:false,
      });
    } else if (temp > 37 && !await notifiedTodayWeather(userId, "Extreme heat")) {
      await supabase.from("notifications").insert({
        user_id:userId, type:"weather",
        title:`Extreme heat — ${temp}°C in ${region}`,
        body:`Water all crops before 7am. Avoid field work 11am–3pm.`,
        read:false,
      });
    } else if (humid > 88 && !await notifiedTodayWeather(userId, "High humidity")) {
      await supabase.from("notifications").insert({
        user_id:userId, type:"weather",
        title:`High humidity — disease risk in ${region}`,
        body:`${humid}% humidity. High fungal blight risk. Inspect tomato, pepper, cassava today.`,
        read:false,
      });
    }
  } catch { }
}

// ── Critical scans ────────────────────────────────────────────────────
async function checkScans(userId) {
  const since = new Date(); since.setDate(since.getDate()-1);
  const { data } = await supabase
    .from("scans").select("id,crop,result,severity")
    .eq("user_id", userId).eq("severity","critical")
    .gte("created_at", since.toISOString()).limit(2);

  for (const s of data ?? []) {
    const { data:existing } = await supabase.from("notifications").select("id")
      .eq("user_id", userId).eq("type","disease")
      .ilike("title", `%${s.result?.slice(0,12)}%`)
      .gte("created_at", new Date(Date.now()-86400000).toISOString()).maybeSingle();
    if (existing) continue;
    await supabase.from("notifications").insert({
      user_id:userId, type:"disease",
      title:`Critical: ${s.result} on ${s.crop}`,
      body:`Open Scan History for the treatment plan immediately before it spreads.`,
      read:false,
    });
  }
}

// ── Main export ───────────────────────────────────────────────────────
export async function checkAndNotify(userId, region, forced = false) {
  if (!userId) return;
  if (!forced && !isNotificationWindow()) return;
  Promise.all([
    checkHarvests(userId),
    checkWeather(userId, region ?? "Nigeria"),
    checkScans(userId),
  ]).catch(() => {});
}
