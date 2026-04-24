import { useState, useEffect } from "react";
import { askGroq } from "@/lib/api";

// Fallback prices — calibrated to April 2026 Nigerian market data
// Sources: Supermart.ng, Jiji.ng, Selina Wamucii, Google AI Overview April 2026
const FALLBACK_PRICES = [
  { crop:"Maize",     price:850,  trend:"up",    unit:"kg" }, // wholesale ₦546–₦1,160/kg
  { crop:"Cassava",   price:224,  trend:"stable", unit:"kg" }, // retail ₦179–₦269/kg
  { crop:"Tomato",    price:1600, trend:"up",    unit:"kg" }, // retail ₦1,200–₦2,500/kg
  { crop:"Yam",       price:1200, trend:"stable", unit:"kg" }, // varies by size/variety
  { crop:"Rice",      price:1800, trend:"up",    unit:"kg" }, // ₦1,400–₦3,500+/kg
  { crop:"Groundnut", price:4000, trend:"up",    unit:"kg" }, // ₦2,600–₦7,000/kg
  { crop:"Pepper",    price:5500, trend:"down",  unit:"kg" }, // fresh ₦3,500–₦10,000+/kg
  { crop:"Soybean",   price:3000, trend:"stable", unit:"kg" }, // ₦2,500–₦4,000+/kg
];

const TREND_ICON = { up:"↑", down:"↓", stable:"→" };
const TREND_COLOR = {
  up:     "text-green-600 dark:text-green-400",
  down:   "text-danger",
  stable: "text-amber",
};

async function fetchPrices(location) {
  const system = `You are a Nigerian agricultural market analyst with up-to-date 2026 market data.
Respond ONLY with valid JSON array. No markdown. No backticks. No explanation.

Return retail market prices per kg in Naira for these crops in ${location}, Nigeria.
Use these verified April 2026 Nigerian market benchmarks as your baseline — adjust slightly for regional location:
- Maize: ₦546–₦1,160/kg (wholesale to retail)
- Cassava (fresh): ₦179–₦269/kg retail
- Tomato: ₦1,200–₦2,500/kg retail (urban markets)
- Yam: ₦800–₦1,500/kg depending on size
- Rice: ₦1,400–₦3,500/kg (local to imported brands)
- Groundnut: ₦2,600–₦7,000/kg (raw to processed)
- Pepper (fresh habanero/rodo): ₦3,500–₦10,000+/kg
- Soybean: ₦2,500–₦4,000/kg

Return exactly this JSON shape (array of 8 objects):
[
  {"crop":"Maize","price":850,"trend":"up","unit":"kg"},
  {"crop":"Cassava","price":224,"trend":"stable","unit":"kg"},
  {"crop":"Tomato","price":1600,"trend":"up","unit":"kg"},
  {"crop":"Yam","price":1100,"trend":"stable","unit":"kg"},
  {"crop":"Rice","price":1800,"trend":"up","unit":"kg"},
  {"crop":"Groundnut","price":4000,"trend":"up","unit":"kg"},
  {"crop":"Pepper","price":5500,"trend":"down","unit":"kg"},
  {"crop":"Soybean","price":3000,"trend":"stable","unit":"kg"}
]
Adjust prices to reflect ${location}'s local market conditions.
trend must be one of: up, down, stable.`;

  const raw = await askGroq(system, `Give current crop prices for ${location}, Nigeria`, 400);
  try {
    const clean = raw.replace(/```json|```/g, "").trim();
    return JSON.parse(clean);
  } catch {
    return FALLBACK_PRICES;
  }
}

export default function CropPriceTicker({ location }) {
  const [prices,  setPrices]  = useState(FALLBACK_PRICES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchPrices(location ?? "Nigeria");
        if (Array.isArray(data) && data.length > 0) setPrices(data);
      } catch {
        // use fallback
      } finally {
        setLoading(false);
      }
    })();
  }, [location]);

  return (
    <div className="bg-white dark:bg-dark-surface rounded-2xl border border-deep-light dark:border-dark-light shadow-card overflow-hidden">
      <div className="px-5 py-4 border-b border-deep-light dark:border-dark-light flex justify-between items-center">
        <h3 className="text-ink dark:text-white font-bold">Market Prices</h3>
        <span className="text-ink-500 dark:text-gray-400 text-xs">{location ?? "Nigeria"} · per kg</span>
      </div>

      {loading ? (
        <div className="px-5 py-4 space-y-3">
          {[1,2,3,4].map(i => (
            <div key={i} className="flex justify-between animate-pulse">
              <div className="h-4 bg-deep-light dark:bg-dark-light rounded w-20" />
              <div className="h-4 bg-deep-light dark:bg-dark-light rounded w-16" />
            </div>
          ))}
        </div>
      ) : (
        <div className="divide-y divide-deep-light dark:divide-dark-light">
          {prices.map((p, i) => (
            <div key={i} className="px-5 py-3 flex items-center justify-between hover:bg-deep-mid dark:hover:bg-dark-mid transition-colors">
              <span className="text-ink dark:text-white text-sm font-medium">{p.crop}</span>
              <div className="flex items-center gap-2">
                <span className="text-ink dark:text-white text-sm font-bold">
                  ₦{p.price?.toLocaleString()}
                </span>
                <span className={`text-xs font-bold ${TREND_COLOR[p.trend] ?? TREND_COLOR.stable}`}>
                  {TREND_ICON[p.trend] ?? "→"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="px-5 py-3 border-t border-deep-light dark:border-dark-light">
        <p className="text-ink-500 dark:text-gray-500 text-xs">AI-estimated prices · Updated on load · Visit Market Advisor for detailed analysis</p>
      </div>
    </div>
  );
}
