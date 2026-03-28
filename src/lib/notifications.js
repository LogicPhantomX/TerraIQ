import { supabase } from "@/lib/supabase";
import { getWeatherForecast } from "@/lib/api";

async function alreadyNotifiedToday(userId, type, keyword) {
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  const { data } = await supabase
    .from("notifications")
    .select("id")
    .eq("user_id", userId)
    .eq("type", type)
    .ilike("title", `%${keyword}%`)
    .gte("created_at", since.toISOString())
    .maybeSingle();
  return !!data;
}

async function push(userId, type, title, body) {
  try {
    const already = await alreadyNotifiedToday(userId, type, title.slice(0, 15));
    if (already) return;
    await supabase.from("notifications").insert({
      user_id: userId, type, title, body, read: false,
    });
  } catch { /* silent */ }
}

// ── Harvest spoilage warnings ─────────────────────────────────────────
async function checkHarvests(userId) {
  const { data } = await supabase
    .from("harvests")
    .select("*")
    .eq("user_id", userId)
    .order("days_remaining", { ascending: true });

  for (const h of data ?? []) {
    const days = h.days_remaining ?? 0;
    if (days <= 0) continue;
    if (days <= 1) {
      await push(userId, "harvest",
        `${h.crop} expires today`,
        `Your ${h.quantity_kg}kg of ${h.crop} expires today or tomorrow. Find a buyer immediately or it will be lost.`
      );
    } else if (days <= 3) {
      await push(userId, "harvest",
        `${h.crop} spoiling in ${days} days`,
        `Your ${h.quantity_kg}kg of ${h.crop} has only ${days} days left. Open Market Advisor now to find the best price.`
      );
    }
  }
}

// ── Weather alerts ────────────────────────────────────────────────────
const COORDS = {
  "oyo":     [7.3775,  3.9470],
  "kano":    [12.0022, 8.5920],
  "lagos":   [6.5244,  3.3792],
  "kaduna":  [10.5105, 7.4165],
  "rivers":  [4.8156,  7.0498],
  "kwara":   [8.4966,  4.5421],
  "ogun":    [7.1600,  3.3500],
  "enugu":   [6.4584,  7.5464],
  "delta":   [5.8904,  5.6800],
  "osun":    [7.5629,  4.5200],
  "ondo":    [7.2500,  5.1950],
  "ekiti":   [7.7190,  5.3110],
  "default": [9.0820,  8.6753],
};

async function checkWeather(userId, region) {
  try {
    const key = Object.keys(COORDS).find(k =>
      k !== "default" && region?.toLowerCase().includes(k)
    ) ?? "default";
    const [lat, lon] = COORDS[key];

    const weather = await getWeatherForecast(lat, lon);
    const today   = weather.list?.[0];
    if (!today) return;

    const rain  = Math.round((today.pop ?? 0) * 100);
    const temp  = Math.round(today.main.temp);
    const humid = today.main.humidity;

    if (rain > 80) {
      await push(userId, "weather",
        "Heavy rain expected today",
        `${rain}% chance of heavy rain in ${region}. Skip irrigation today. Check drainage around tomato and pepper beds to prevent root rot.`
      );
    } else if (temp > 38) {
      await push(userId, "weather",
        `Extreme heat — ${temp}°C today`,
        `Temperature reaching ${temp}°C in ${region}. Water all crops before 7am. Avoid field work between 11am and 3pm.`
      );
    } else if (humid > 85) {
      await push(userId, "weather",
        "High humidity — fungal disease risk",
        `Humidity at ${humid}% in ${region}. High risk of blight and mildew. Inspect tomato and cassava crops today.`
      );
    } else if (rain < 10 && temp > 33) {
      await push(userId, "weather",
        "Dry and hot — irrigate today",
        `Low rain chance (${rain}%) and ${temp}°C in ${region}. Irrigate all crops today especially seedlings.`
      );
    }
  } catch { /* weather is non-critical */ }
}

// ── Critical scan alerts ──────────────────────────────────────────────
async function checkScans(userId) {
  const since = new Date();
  since.setDate(since.getDate() - 1);
  const { data } = await supabase
    .from("scans")
    .select("*")
    .eq("user_id", userId)
    .eq("severity", "critical")
    .gte("created_at", since.toISOString())
    .limit(3);

  for (const s of data ?? []) {
    await push(userId, "disease",
      `Critical: ${s.result} on ${s.crop}`,
      `Your scan detected a critical ${s.result} on your ${s.crop}. Act immediately — open Scan History for the full treatment plan before it spreads.`
    );
  }
}

// ── Main export ───────────────────────────────────────────────────────
// Call this on dashboard load. Runs silently, never crashes the app.
export async function checkAndNotify(userId, region) {
  if (!userId) return;
  Promise.all([
    checkHarvests(userId),
    checkWeather(userId, region ?? "Nigeria"),
    checkScans(userId),
  ]).catch(() => {});
}
