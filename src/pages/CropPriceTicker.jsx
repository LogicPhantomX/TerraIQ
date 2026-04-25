import { useState, useEffect } from "react";
import { fetchSharedPrices, FALLBACK_PRICES } from "@/lib/marketPrices";

const TREND_ICON  = { up: "↑", down: "↓", stable: "→" };
const TREND_COLOR = {
  up:     "text-green-600 dark:text-green-400",
  down:   "text-danger",
  stable: "text-amber",
};

export default function CropPriceTicker({ location }) {
  const [prices,  setPrices]  = useState(FALLBACK_PRICES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchSharedPrices(location ?? "Nigeria");
        if (Array.isArray(data) && data.length > 0) setPrices(data);
      } catch {
        // keep fallback
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
                <div className="text-right">
                  <span className="text-ink dark:text-white text-sm font-bold">
                    ₦{p.price?.toLocaleString()}
                  </span>
                  {p.min && p.max && (
                    <p className="text-ink-500 dark:text-gray-500 text-xs">
                      ₦{p.min.toLocaleString()}–₦{p.max.toLocaleString()}
                    </p>
                  )}
                </div>
                <span className={`text-xs font-bold ${TREND_COLOR[p.trend] ?? TREND_COLOR.stable}`}>
                  {TREND_ICON[p.trend] ?? "→"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="px-5 py-3 border-t border-deep-light dark:border-dark-light">
        <p className="text-ink-500 dark:text-gray-500 text-xs">
          April 2026 verified benchmarks · Same prices used in Market Advisor
        </p>
      </div>
    </div>
  );
}
