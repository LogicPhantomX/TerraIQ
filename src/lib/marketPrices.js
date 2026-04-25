// ─── src/lib/marketPrices.js ──────────────────────────────────────────
// Single source of truth for Nigerian crop prices.
// Both CropPriceTicker (dashboard) and MarketPage (advisor) import from here.
// The AI is called ONCE per session per location — result is cached and shared.
// This guarantees the dashboard and market advisor always show the same prices.

import { askGroq } from "@/lib/api";

// ── Verified April 2026 Nigerian market benchmarks ────────────────────
// Sources: Supermart.ng, Jiji.ng, Selina Wamucii, AFEX, trader reports
// These are the mid-point retail prices per kg in major Nigerian cities.
// Regional adjustment is ±10–20% applied by the AI for the farmer's city.
export const PRICE_BENCHMARKS = {
  Maize:     { min: 546,  mid: 850,  max: 1160, unit: "kg", trend: "up"     },
  Cassava:   { min: 179,  mid: 224,  max: 269,  unit: "kg", trend: "stable" },
  Tomato:    { min: 1200, mid: 1600, max: 2500, unit: "kg", trend: "up"     },
  Yam:       { min: 800,  mid: 1200, max: 1500, unit: "kg", trend: "stable" },
  Rice:      { min: 1400, mid: 1800, max: 3500, unit: "kg", trend: "up"     },
  Groundnut: { min: 2600, mid: 4000, max: 7000, unit: "kg", trend: "up"     },
  Pepper:    { min: 3500, mid: 5500, max: 10000,unit: "kg", trend: "down"   },
  Soybean:   { min: 2500, mid: 3000, max: 4000, unit: "kg", trend: "stable" },
  Onion:     { min: 800,  mid: 1200, max: 2000, unit: "kg", trend: "up"     },
  Plantain:  { min: 500,  mid: 800,  max: 1200, unit: "kg", trend: "stable" },
};

// Flat array for ticker display (mid-point fallback values)
export const FALLBACK_PRICES = Object.entries(PRICE_BENCHMARKS).map(([crop, b]) => ({
  crop, price: b.mid, trend: b.trend, unit: b.unit,
  min: b.min, max: b.max,
}));

// ── Cache: location → { prices, timestamp } ──────────────────────────
const _cache = new Map();
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

// ── Build the benchmark block injected into every AI prompt ──────────
// Both the ticker and market advisor include this same block, so the AI
// is anchored to the exact same reference prices no matter which feature calls it.
export function buildPriceBenchmarkBlock(location) {
  const lines = Object.entries(PRICE_BENCHMARKS)
    .map(([crop, b]) => `  - ${crop}: ₦${b.min.toLocaleString()}–₦${b.max.toLocaleString()}/kg (mid ₦${b.mid.toLocaleString()})`)
    .join("\n");

  return `VERIFIED APRIL 2026 NIGERIAN PRICE BENCHMARKS (adjust ±15% max for ${location}):
${lines}
RULE: Your prices MUST stay within the min–max range above. Never go outside these bounds.
RULE: Use the mid-point as your default, adjust slightly for ${location}'s local market conditions.`;
}

// ── Single shared fetch function ──────────────────────────────────────
// Returns array of { crop, price, trend, unit, min, max }
// Cached per location for 15 minutes so multiple components share one call.
export async function fetchSharedPrices(location = "Nigeria") {
  const key = location.toLowerCase().trim();

  // Return cached result if still fresh
  const cached = _cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.prices;
  }

  const benchmarkBlock = buildPriceBenchmarkBlock(location);

  const system = `You are a Nigerian agricultural market analyst with live 2026 market data.
${benchmarkBlock}

Respond ONLY with a valid JSON array. No markdown. No backticks. No explanation.
Return exactly this shape for all 10 crops:
[
  {"crop":"Maize","price":850,"trend":"up","unit":"kg","min":546,"max":1160},
  {"crop":"Cassava","price":224,"trend":"stable","unit":"kg","min":179,"max":269},
  {"crop":"Tomato","price":1600,"trend":"up","unit":"kg","min":1200,"max":2500},
  {"crop":"Yam","price":1200,"trend":"stable","unit":"kg","min":800,"max":1500},
  {"crop":"Rice","price":1800,"trend":"up","unit":"kg","min":1400,"max":3500},
  {"crop":"Groundnut","price":4000,"trend":"up","unit":"kg","min":2600,"max":7000},
  {"crop":"Pepper","price":5500,"trend":"down","unit":"kg","min":3500,"max":10000},
  {"crop":"Soybean","price":3000,"trend":"stable","unit":"kg","min":2500,"max":4000},
  {"crop":"Onion","price":1200,"trend":"up","unit":"kg","min":800,"max":2000},
  {"crop":"Plantain","price":800,"trend":"stable","unit":"kg","min":500,"max":1200}
]
Adjust 'price' within the min–max range for ${location} local conditions. trend = up/down/stable.`;

  try {
    const raw = await askGroq(system, `Current crop prices in ${location}, Nigeria. April 2026.`, 600);
    const clean = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);
    if (Array.isArray(parsed) && parsed.length >= 8) {
      // Clamp each price to its benchmark range to prevent AI hallucination
      const clamped = parsed.map(p => {
        const bench = PRICE_BENCHMARKS[p.crop];
        if (bench) {
          p.price = Math.max(bench.min, Math.min(bench.max, p.price));
          p.min   = bench.min;
          p.max   = bench.max;
        }
        return p;
      });
      _cache.set(key, { prices: clamped, timestamp: Date.now() });
      return clamped;
    }
  } catch {
    // fall through to fallback
  }

  // Cache fallback too so we don't spam API on repeated errors
  _cache.set(key, { prices: FALLBACK_PRICES, timestamp: Date.now() });
  return FALLBACK_PRICES;
}

// ── Get price for a specific crop from the shared cache ──────────────
// Used by Market Advisor to pull the same price the ticker already fetched.
export function getCachedCropPrice(location, cropName) {
  const key = location.toLowerCase().trim();
  const cached = _cache.get(key);
  if (!cached) return null;

  const cropLower = cropName.toLowerCase();
  return cached.prices.find(p => p.crop.toLowerCase() === cropLower) ?? null;
}
