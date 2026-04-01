// ─── SoilParameterStatus Component ───────────────────────────────────
// Add this to your SmartSoil result section to show per-parameter status
// Import at the top of SmartSoil.jsx:
// import SoilParameterStatus from "@/components/SoilParameterStatus";

const LEVEL_STYLE = {
  critically_low:    { bg:"bg-red-100 dark:bg-red-900/30",    text:"text-red-700 dark:text-red-400",    border:"border-red-200 dark:border-red-800",    bar:"bg-red-500",    label:"Critically Low"    },
  too_acidic:        { bg:"bg-red-100 dark:bg-red-900/30",    text:"text-red-700 dark:text-red-400",    border:"border-red-200 dark:border-red-800",    bar:"bg-red-500",    label:"Too Acidic"        },
  too_alkaline:      { bg:"bg-red-100 dark:bg-red-900/30",    text:"text-red-700 dark:text-red-400",    border:"border-red-200 dark:border-red-800",    bar:"bg-red-500",    label:"Too Alkaline"      },
  too_high:          { bg:"bg-red-100 dark:bg-red-900/30",    text:"text-red-700 dark:text-red-400",    border:"border-red-200 dark:border-red-800",    bar:"bg-red-500",    label:"Too High"          },
  waterlogged:       { bg:"bg-red-100 dark:bg-red-900/30",    text:"text-red-700 dark:text-red-400",    border:"border-red-200 dark:border-red-800",    bar:"bg-red-500",    label:"Waterlogged"       },
  critically_dry:    { bg:"bg-red-100 dark:bg-red-900/30",    text:"text-red-700 dark:text-red-400",    border:"border-red-200 dark:border-red-800",    bar:"bg-red-500",    label:"Critically Dry"    },
  low:               { bg:"bg-orange-100 dark:bg-orange-900/30", text:"text-orange-700 dark:text-orange-400", border:"border-orange-200 dark:border-orange-800", bar:"bg-orange-500", label:"Low"          },
  acidic:            { bg:"bg-orange-100 dark:bg-orange-900/30", text:"text-orange-700 dark:text-orange-400", border:"border-orange-200 dark:border-orange-800", bar:"bg-orange-500", label:"Acidic"       },
  dry:               { bg:"bg-orange-100 dark:bg-orange-900/30", text:"text-orange-700 dark:text-orange-400", border:"border-orange-200 dark:border-orange-800", bar:"bg-orange-500", label:"Dry"          },
  sufficient:        { bg:"bg-green-100 dark:bg-green-900/30",   text:"text-green-700 dark:text-green-400",   border:"border-green-200 dark:border-green-800",   bar:"bg-green-500",   label:"Sufficient"   },
  optimal:           { bg:"bg-green-100 dark:bg-green-900/30",   text:"text-green-700 dark:text-green-400",   border:"border-green-200 dark:border-green-800",   bar:"bg-green-500",   label:"Optimal"      },
  adequate:          { bg:"bg-green-100 dark:bg-green-900/30",   text:"text-green-700 dark:text-green-400",   border:"border-green-200 dark:border-green-800",   bar:"bg-green-500",   label:"Adequate"     },
  moderate:          { bg:"bg-green-100 dark:bg-green-900/30",   text:"text-green-700 dark:text-green-400",   border:"border-green-200 dark:border-green-800",   bar:"bg-green-500",   label:"Moderate"     },
  high:              { bg:"bg-yellow-100 dark:bg-yellow-900/30", text:"text-yellow-700 dark:text-yellow-400", border:"border-yellow-200 dark:border-yellow-800", bar:"bg-yellow-500",  label:"High"         },
  slightly_alkaline: { bg:"bg-yellow-100 dark:bg-yellow-900/30", text:"text-yellow-700 dark:text-yellow-400", border:"border-yellow-200 dark:border-yellow-800", bar:"bg-yellow-500",  label:"Slightly Alkaline" },
  wet:               { bg:"bg-yellow-100 dark:bg-yellow-900/30", text:"text-yellow-700 dark:text-yellow-400", border:"border-yellow-200 dark:border-yellow-800", bar:"bg-yellow-500",  label:"Wet"          },
  very_high:         { bg:"bg-green-100 dark:bg-green-900/30",   text:"text-green-700 dark:text-green-400",   border:"border-green-200 dark:border-green-800",   bar:"bg-green-500",   label:"Very High"    },
};

const SCORE_TO_PCT = { 1:15, 2:35, 3:65, 4:90 };

const PARAM_LABELS = {
  nitrogen:       "Nitrogen",
  phosphorus:     "Phosphorus",
  potassium:      "Potassium",
  ph:             "pH Level",
  organic_carbon: "Organic Carbon",
  moisture:       "Moisture",
};

export default function SoilParameterStatus({ classifications }) {
  if (!classifications) return null;

  const items = Object.entries(classifications).filter(([,v]) => v !== null && v !== undefined);
  if (!items.length) return null;

  return (
    <div className="bg-white dark:bg-dark-surface rounded-2xl border border-deep-light dark:border-dark-light p-6 shadow-card">
      <h3 className="text-ink dark:text-white font-bold text-base mb-4">Parameter Analysis</h3>
      <div className="space-y-4">
        {items.map(([key, cls]) => {
          const style = LEVEL_STYLE[cls.level] ?? LEVEL_STYLE.sufficient;
          const pct   = SCORE_TO_PCT[cls.score] ?? 50;
          return (
            <div key={key}>
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-ink dark:text-white text-sm font-semibold">{PARAM_LABELS[key] ?? key}</span>
                <span className={`text-xs px-2.5 py-0.5 rounded-lg font-semibold border ${style.bg} ${style.text} ${style.border}`}>
                  {style.label}
                </span>
              </div>
              {/* Status bar */}
              <div className="h-2 bg-deep-light dark:bg-dark-light rounded-full overflow-hidden mb-1.5">
                <div className={`h-full rounded-full transition-all duration-700 ${style.bar}`} style={{ width:`${pct}%` }} />
              </div>
              {/* Advice */}
              <p className="text-ink-500 dark:text-gray-400 text-xs leading-relaxed">{cls.advice}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
