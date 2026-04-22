import { useState, useEffect } from "react";
import { askGroq } from "@/lib/api";

// Fallback prices if AI call fails
const FALLBACK_PRICES = [
  { crop:"Maize",     price:320, trend:"up",   unit:"kg"  },
  { crop:"Cassava",   price:185, trend:"stable",unit:"kg" },
  { crop:"Tomato",    price:480, trend:"down",  unit:"kg" },
  { crop:"Yam",       price:950, trend:"up",    unit:"kg" },
  { crop:"Rice",      price:1200,trend:"stable",unit:"kg" },
  { crop:"Groundnut", price:760, trend:"up",    unit:"kg" },
  { crop:"Pepper",    price:1400,trend:"down",  unit:"kg" },
  { crop:"Soybean",   price:580, trend:"stable",unit:"kg" },
];

const TREND_ICON = { up:"↑", down:"↓", stable:"→" };
const TREND_COLOR = {
  up:     "text-green-600 dark:text-green-400",
  down:   "text-danger",
  stable: "text-amber",
};

async function fetchPrices(location) {
  const system = `You are a Nigerian agricultural market analyst.
Respond ONLY with valid JSON. No markdown. No backticks.
Return current approximate market prices for these crops in ${location}, Nigeria.
[
  {"crop":"Maize","price":320,"trend":"up","unit":"kg"},
  {"crop":"Cassava","price":185,"trend":"stable","unit":"kg"},
  {"crop":"Tomato","price":480,"trend":"down","unit":"kg"},
  {"crop":"Yam","price":950,"trend":"up","unit":"kg"},
  {"crop":"Rice","price":1200,"trend":"stable","unit":"kg"},
  {"crop":"Groundnut","price":760,"trend":"up","unit":"kg"},
  {"crop":"Pepper","price":1400,"trend":"down","unit":"kg"},
  {"crop":"Soybean","price":580,"trend":"stable","unit":"kg"}
]
Prices should be realistic current Naira prices per kg for ${location}.
trend must be: up, down, or stable.`;

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
