// ─── TerraIQ+ Notification Triggers ──────────────────────────────────
// Import this in any page that should trigger smart notifications.
// Call checkAndNotify(userId) once after login or on dashboard load.

import { supabase } from "@/lib/supabase";
import { getWeatherForecast } from "@/lib/api";

// Prevent duplicate notifications within 24 hours for same type
async function alreadyNotifiedToday(userId, type, title) {
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  const { data } = await supabase
    .from("notifications")
    .select("id")
    .eq("user_id", userId)
    .eq("type", type)
    .ilike("title", `%${title.slice(0, 20)}%`)
    .gte("created_at", since.toISOString())
    .maybeSingle();
  return !!data;
}

async function notify(userId, type, title, body) {
  const already = await alreadyNotifiedToday(userId, type, title);
  if (already) return;
  await supabase.from("notifications").insert({ user_id:userId, type, title, body, read:false });
}

// ── 1. Harvest spoilage warnings ─────────────────────────────────────
async function checkHarvests(userId) {
  const { data: harvests } = await supabase
    .from("harvests")
    .select("*")
    .eq("user_id", userId)
    .gt("days_remaining", 0)
    .order("days_remaining", { ascending:true });

  for (const h of harvests ?? []) {
    if (h.days_remaining <= 1) {
      await notify(userId, "harvest",
        `${h.crop} expires today`,
        `Your ${h.quantity_kg}kg of ${h.crop} expires today or tomorrow. Go to the market immediately or find a buyer now.`
      );
    } else if (h.days_remaining <= 3) {
      await notify(userId, "harvest",
        `${h.crop} spoiling in ${h.days_remaining} days`,
        `Your ${h.quantity_kg}kg of ${h.crop} has only ${h.days_remaining} days left. Check the Market Advisor for the best price now.`
      );
    } else if (h.days_remaining <= 7 && h.urgency === "urgent") {
      await notify(userId, "harvest",
        `Urgent: ${h.crop} needs attention`,
        `Your ${h.quantity_kg}kg of ${h.crop} is stored under urgent conditions with ${h.days_remaining} days remaining. Consider selling soon.`
      );
    }
  }
}

// ── 2. Weather alerts ─────────────────────────────────────────────────
async function checkWeather(userId, region) {
  const REGION_COORDS = {
    "oyo":      { lat:7.3775,  lon:3.9470  },
    "kano":     { lat:12.0022, lon:8.5920  },
    "lagos":    { lat:6.5244,  lon:3.3792  },
    "kaduna":   { lat:10.5105, lon:7.4165  },
    "rivers":   { lat:4.8156,  lon:7.0498  },
    "kwara":    { lat:8.4966,  lon:4.5421  },
    "ogun":     { lat:7.1600,  lon:3.3500  },
    "enugu":    { lat:6.4584,  lon:7.5464  },
    "delta":    { lat:5.8904,  lon:5.6800  },
    "osun":     { lat:7.5629,  lon:4.5200  },
  };
  const key = Object.keys(REGION_COORDS).find(k => region?.toLowerCase().includes(k));
  const coords = REGION_COORDS[key] ?? { lat:9.0820, lon:8.6753 };

  try {
    const weather = await getWeatherForecast(coords.lat, coords.lon);
    const today   = weather.list?.[0];
    const tonight = weather.list?.[2];
    if (!today) return;

    const rainChance = Math.round((today.pop ?? 0) * 100);
    const temp       = Math.round(today.main.temp);
    const humidity   = today.main.humidity;

    if (rainChance > 80) {
      await notify(userId, "weather",
        "Heavy rain expected today",
        `${rainChance}% chance of heavy rain in ${region}. Skip all irrigation today. Check drainage around your tomato and pepper beds to prevent root rot.`
      );
    } else if (temp > 38) {
      await notify(userId, "weather",
        "Extreme heat warning",
        `Temperature reaching ${temp}°C in ${region} today. Water all crops early morning before 7am. Avoid any field work between 11am and 3pm.`
      );
    } else if (humidity > 85) {
      await notify(userId, "weather",
        "High humidity — disease risk",
        `Humidity at ${humidity}% in ${region}. High risk of fungal diseases like blight and mildew. Inspect your tomato and cassava crops today.`
      );
    } else if (rainChance < 10 && temp > 33) {
      await notify(userId, "weather",
        "Dry and hot conditions",
        `Low rainfall chance (${rainChance}%) and ${temp}°C in ${region}. Irrigate all crops today, especially seedlings and transplants.`
      );
    }
  } catch {
    // weather check is non-critical, fail silently
  }
}

// ── 3. Recent scan alerts ─────────────────────────────────────────────
async function checkRecentScans(userId) {
  const since = new Date();
  since.setDate(since.getDate() - 1);

  const { data: scans } = await supabase
    .from("scans")
    .select("*")
    .eq("user_id", userId)
    .in("severity", ["critical", "high"])
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending:false })
    .limit(3);

  for (const scan of scans ?? []) {
    if (scan.severity === "critical") {
      await notify(userId, "disease",
        `Critical: ${scan.result} on your ${scan.crop}`,
        `Your recent scan detected a critical ${scan.result} infection on your ${scan.crop}. Act immediately — check the treatment plan in Scan History before it spreads.`
      );
    }
  }
}

// ── Main function — call this once on dashboard load ─────────────────
export async function checkAndNotify(userId, region) {
  if (!userId) return;
  try {
    await Promise.all([
      checkHarvests(userId),
      checkWeather(userId, region ?? "Nigeria"),
      checkRecentScans(userId),
    ]);
  } catch {
    // never crash the app over notifications
  }
}
