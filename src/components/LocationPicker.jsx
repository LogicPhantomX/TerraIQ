import { useState, useEffect } from "react";
import { NIGERIAN_STATES, getCitiesForState } from "@/lib/nigeriaLocations";

// ── Reusable location picker ──────────────────────────────────────────
// Props:
//   state, city — current values
//   onStateChange(state) — callback
//   onCityChange(city)   — callback
//   required — show * on labels
//   compact  — smaller labels for tight layouts

export default function LocationPicker({
  state = "", city = "",
  onStateChange, onCityChange,
  required = false, compact = false,
  className = "",
}) {
  const [cities, setCities] = useState([]);

  useEffect(() => {
    if (state) {
      const c = getCitiesForState(state);
      setCities(c);
      // Reset city if it is not in the new state's list
      if (city && !c.includes(city)) onCityChange?.("");
    } else {
      setCities([]);
      onCityChange?.("");
    }
  }, [state]);

  const iClass = `w-full bg-white dark:bg-dark-mid rounded-xl px-4 h-12 text-ink dark:text-white border border-deep-light dark:border-dark-light focus:border-terra outline-none text-sm shadow-sm ${className}`;
  const labelClass = `text-ink-500 dark:text-gray-400 ${compact ? "text-xs" : "text-sm"} mb-1.5 block`;

  return (
    <div className="grid grid-cols-2 gap-3">
      {/* State */}
      <div>
        <label className={labelClass}>
          State{required && " *"}
        </label>
        <select
          value={state}
          onChange={e => onStateChange?.(e.target.value)}
          className={iClass}
        >
          <option value="">Select state</option>
          {NIGERIAN_STATES.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* City / LGA */}
      <div>
        <label className={labelClass}>
          City / LGA{required && " *"}
        </label>
        <select
          value={city}
          onChange={e => onCityChange?.(e.target.value)}
          className={iClass}
          disabled={!state}
        >
          <option value="">{state ? "Select city" : "Select state first"}</option>
          {cities.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
