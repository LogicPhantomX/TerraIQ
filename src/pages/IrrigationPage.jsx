import Layout from "@/components/Layout";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { getWeatherForecast } from "@/lib/api";
import { useFarmerLanguage } from "@/hooks/useFarmerLanguage";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";

const LANG_INSTRUCTION = {
  en: "Respond in clear, simple English easy to understand for a Nigerian farmer.",
  yo: "Dahun ni ede Yoruba.",
  ha: "Amsa cikin harshen Hausa.",
  ig: "Zaghachi n'asụsụ Igbo.",
};

const COORDS = {
  "oyo":[7.3775,3.9470],"kano":[12.0022,8.5920],"lagos":[6.5244,3.3792],
  "kaduna":[10.5105,7.4165],"rivers":[4.8156,7.0498],"kwara":[8.4966,4.5421],
  "ogun":[7.1600,3.3500],"enugu":[6.4584,7.5464],"delta":[5.8904,5.6800],
  "osun":[7.5629,4.5200],"default":[9.0820,8.6753],
};

// Water rate lookup — litres per m² per day
// Based on FAO guidelines adapted for Nigerian conditions
const WATER_RATES = {
  seedling:   { sandy:1.5, loamy:1.0, clay:0.8, sandy_loam:1.2, clay_loam:0.9 },
  vegetative: { sandy:2.5, loamy:1.8, clay:1.4, sandy_loam:2.0, clay_loam:1.6 },
  flowering:  { sandy:3.5, loamy:2.5, clay:2.0, sandy_loam:3.0, clay_loam:2.2 },
  fruiting:   { sandy:4.0, loamy:3.0, clay:2.4, sandy_loam:3.5, clay_loam:2.8 },
  maturity:   { sandy:2.0, loamy:1.5, clay:1.2, sandy_loam:1.8, clay_loam:1.4 },
};

const SEASON_MULTIPLIER = { dry:1.4, transitional:1.0, wet:0.5 };

const GROWTH_LABELS = {
  seedling:   "Seedling / Germination (0–3 weeks)",
  vegetative: "Vegetative / Leaf growth (3–8 weeks)",
  flowering:  "Flowering / Tasseling (8–12 weeks)",
  fruiting:   "Fruiting / Pod filling (12–18 weeks)",
  maturity:   "Maturity / Near harvest (18+ weeks)",
};

const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

export function IrrigationPage() {
  const { t }   = useTranslation();
  const lang    = useFarmerLanguage();
  const [loading, setLoading] = useState(false);
  const [plan,    setPlan]    = useState(null);
  const [region,  setRegion]  = useState("");

  const [form, setForm] = useState({
    crop:         "",
    growth_stage: "vegetative",
    farm_size:    "500",
    soil_type:    "loamy",
    season:       "dry",
    population:   "",
  });

  const set = (k) => (e) => setForm(p => ({...p, [k]: e.target.value}));

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from("profiles").select("region").eq("id", user.id).single();
        if (data?.region) setRegion(data.region);
      }
    })();
  }, []);

  const generate = async () => {
    if (!form.crop) { toast.error("Enter your crop name"); return; }
    setLoading(true);
    const tid = toast.loading("Building your 7-day irrigation plan...");

    try {
      // Get weather for farmer's region
      const key = Object.keys(COORDS).find(k =>
        k !== "default" && region?.toLowerCase().includes(k)
      ) ?? "default";
      const [lat, lon] = COORDS[key];
      const weather = await getWeatherForecast(lat, lon);

      // Pull 7 days of weather data
      const weekData = [];
      for (let i = 0; i < 7; i++) {
        const entry = weather.list?.[i * 2] ?? weather.list?.[i] ?? weather.list?.[0];
        weekData.push({
          day:        DAYS[i],
          temp:       Math.round(entry?.main?.temp ?? 28),
          rain_chance:Math.round((entry?.pop ?? 0) * 100),
          humidity:   entry?.main?.humidity ?? 60,
          rain_mm:    Math.round((entry?.rain?.["3h"] ?? 0) * 8),
        });
      }

      // Calculate base water rate from growth stage and soil type
      const baseRate    = WATER_RATES[form.growth_stage]?.[form.soil_type] ?? 2.0;
      const seasonMult  = SEASON_MULTIPLIER[form.season] ?? 1.0;
      const farmSize    = +form.farm_size || 500;

      // Build each day
      const daily_plan = weekData.map((d, i) => {
        // Adjust for weather
        let rate = baseRate * seasonMult;

        // Heavy rain — skip
        if (d.rain_chance > 75 || d.rain_mm > 8) {
          return {
            day:         d.day,
            action:      "skip",
            reason:      `Rain expected (${d.rain_chance}% chance${d.rain_mm > 0 ? `, ~${d.rain_mm}mm` : ""}). No irrigation needed.`,
            litres_per_sqm:     0,
            total_litres:       0,
            best_time:   "N/A",
            weather:     `${d.temp}°C · ${d.rain_chance}% rain`,
          };
        }

        // Reduce for moderate rain
        if (d.rain_chance > 40) rate *= 0.6;

        // Adjust for high temperature
        if (d.temp > 35) rate *= 1.15;
        if (d.temp < 22) rate *= 0.85;

        // Round to 1 decimal
        rate = Math.round(rate * 10) / 10;
        const totalLitres = Math.round(rate * farmSize);

        return {
          day:               d.day,
          action:            "water",
          litres_per_sqm:    rate,
          total_litres:      totalLitres,
          best_time:         d.temp > 32 ? "5:30am – 7:00am" : "6:00am – 7:30am",
          reason:            buildReason(form.growth_stage, d, rate, lang),
          weather:           `${d.temp}°C · ${d.rain_chance}% rain · ${d.humidity}% humidity`,
        };
      });

      const waterDays    = daily_plan.filter(d => d.action === "water");
      const weeklyTotal  = waterDays.reduce((s, d) => s + d.total_litres, 0);
      const avgRate      = waterDays.length > 0
        ? Math.round((waterDays.reduce((s,d) => s+d.litres_per_sqm, 0) / waterDays.length) * 10) / 10
        : 0;

      setPlan({
        crop:          form.crop,
        growth_stage:  form.growth_stage,
        region:        region || "Nigeria",
        farm_size:     farmSize,
        base_rate:     baseRate,
        season:        form.season,
        soil_type:     form.soil_type,
        daily_plan,
        weekly_total:  weeklyTotal,
        avg_rate:      avgRate,
        water_days:    waterDays.length,
        skip_days:     7 - waterDays.length,
        summary:       buildSummary(form, baseRate, seasonMult, region),
      });

      toast.dismiss(tid);
      toast.success("7-day irrigation plan ready!");
    } catch(e) { toast.dismiss(tid); toast.error(e.message); }
    setLoading(false);
  };

  const iClass = "w-full bg-white dark:bg-dark-mid rounded-xl px-4 h-12 text-ink dark:text-white border border-deep-light dark:border-dark-light focus:border-terra outline-none text-sm shadow-sm";

  return (
    <Layout>
      <h1 className="text-ink dark:text-white text-3xl font-black mb-2">{t("irrigation.title")}</h1>
      <p className="text-ink-500 dark:text-gray-400 mb-6">
        Precise 7-day plan based on your crop's growth stage, soil type, season, and live weather.
      </p>

      <div className="bg-white dark:bg-dark-surface rounded-2xl border border-deep-light dark:border-dark-light p-6 mb-5 shadow-card space-y-4">

        {/* Crop */}
        <div>
          <label className="text-ink-500 dark:text-gray-400 text-sm mb-1.5 block">Crop *</label>
          <input value={form.crop} onChange={set("crop")} placeholder="e.g. Maize, Tomato, Ewedu, Pepper" className={iClass} />
        </div>

        {/* Growth stage — most important input */}
        <div>
          <label className="text-ink-500 dark:text-gray-400 text-sm mb-2 block">
            Growth stage * <span className="text-xs text-terra font-semibold ml-1">— affects water volume significantly</span>
          </label>
          <div className="space-y-2">
            {Object.entries(GROWTH_LABELS).map(([key, label]) => (
              <button key={key} onClick={() => setForm(p => ({...p, growth_stage:key}))}
                className={`w-full text-left px-4 py-3 rounded-xl border transition-all text-sm ${
                  form.growth_stage === key
                    ? "bg-terra text-white border-terra font-semibold"
                    : "bg-white dark:bg-dark-mid text-ink-500 dark:text-gray-400 border-deep-light dark:border-dark-light hover:border-terra"
                }`}
              >
                <div className="flex justify-between items-center">
                  <span>{label}</span>
                  {form.growth_stage === key && (
                    <span className="text-white/80 text-xs">
                      ~{WATER_RATES[key]?.[form.soil_type] ?? "–"} L/m²/day base
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Row — farm size + plant population */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="text-ink-500 dark:text-gray-400 text-sm mb-1.5 block">Farm size (m²)</label>
            <input type="number" value={form.farm_size} onChange={set("farm_size")} placeholder="e.g. 500" className={iClass} />
            <p className="text-ink-500 dark:text-gray-500 text-xs mt-1">Used to calculate total litres per day</p>
          </div>
          <div>
            <label className="text-ink-500 dark:text-gray-400 text-sm mb-1.5 block">Plant population (optional)</label>
            <input type="number" value={form.population} onChange={set("population")} placeholder="e.g. 400 plants" className={iClass} />
          </div>
        </div>

        {/* Row — soil type + season */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="text-ink-500 dark:text-gray-400 text-sm mb-1.5 block">Soil type</label>
            <select value={form.soil_type} onChange={set("soil_type")} className={iClass}>
              <option value="sandy">Sandy — drains fast, needs more water</option>
              <option value="sandy_loam">Sandy loam — drains moderately</option>
              <option value="loamy">Loamy — balanced (most common)</option>
              <option value="clay_loam">Clay loam — holds water well</option>
              <option value="clay">Clay — holds water longest</option>
            </select>
          </div>
          <div>
            <label className="text-ink-500 dark:text-gray-400 text-sm mb-1.5 block">Season</label>
            <select value={form.season} onChange={set("season")} className={iClass}>
              <option value="dry">Dry season (Nov–Mar) — +40% water need</option>
              <option value="transitional">Transitional — normal rate</option>
              <option value="wet">Wet season (Apr–Oct) — –50% water need</option>
            </select>
          </div>
        </div>

        <button onClick={generate} disabled={loading}
          className="w-full bg-terra text-white h-12 rounded-xl font-bold hover:bg-terra-dark disabled:opacity-50 transition-colors shadow-sm"
        >
          {loading ? "Building plan..." : "Generate 7-Day Irrigation Plan"}
        </button>
      </div>

      {/* ── RESULTS ─────────────────────────────────────────────────── */}
      {plan && (
        <div className="space-y-4">

          {/* Summary card */}
          <div className="bg-sky/10 dark:bg-sky/5 rounded-2xl p-5 border border-sky/20">
            <p className="text-sky font-bold mb-1">{plan.crop} · {GROWTH_LABELS[plan.growth_stage]?.split(" (")[0]}</p>
            <p className="text-ink dark:text-white text-sm">{plan.summary}</p>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { value:`${plan.avg_rate}`,     unit:"L/m²/day avg",    color:"text-sky"   },
              { value:`${plan.weekly_total?.toLocaleString()}`, unit:"total litres week", color:"text-terra" },
              { value:`${plan.water_days}/7`, unit:"days to water",   color:"text-amber" },
            ].map((s,i) => (
              <div key={i} className="bg-white dark:bg-dark-surface rounded-2xl p-4 border border-deep-light dark:border-dark-light shadow-card text-center">
                <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                <p className="text-ink-500 dark:text-gray-400 text-xs mt-1">{s.unit}</p>
              </div>
            ))}
          </div>

          {/* 7-day plan */}
          <div className="space-y-3">
            {plan.daily_plan.map((d, i) => (
              <div key={i} className={`rounded-2xl border shadow-card overflow-hidden ${
                d.action === "water"
                  ? "bg-white dark:bg-dark-surface border-sky/30"
                  : "bg-deep-mid dark:bg-dark-mid border-deep-light dark:border-dark-light"
              }`}>
                <div className="px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-black ${
                      d.action === "water" ? "bg-sky text-white" : "bg-deep-light dark:bg-dark-light text-ink-500 dark:text-gray-400"
                    }`}>
                      {i + 1}
                    </div>
                    <div>
                      <p className="text-ink dark:text-white font-bold text-sm">{d.day}</p>
                      <p className="text-ink-500 dark:text-gray-500 text-xs">{d.weather}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    {d.action === "water" ? (
                      <>
                        <p className="text-sky font-black text-base">{d.litres_per_sqm} L/m²</p>
                        <p className="text-ink-500 dark:text-gray-400 text-xs">{d.total_litres?.toLocaleString()} L total</p>
                      </>
                    ) : (
                      <p className="text-ink-500 dark:text-gray-400 text-sm font-semibold">Skip</p>
                    )}
                  </div>
                </div>
                <div className="px-4 pb-3 flex justify-between items-center">
                  <p className="text-ink-500 dark:text-gray-400 text-xs flex-1">{d.reason}</p>
                  {d.action === "water" && (
                    <span className="text-xs text-sky font-semibold ml-3 shrink-0">{d.best_time}</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Water rate reference */}
          <div className="bg-white dark:bg-dark-surface rounded-2xl p-5 border border-deep-light dark:border-dark-light shadow-card">
            <p className="text-ink dark:text-white font-bold mb-3 text-sm">Why these amounts?</p>
            <div className="space-y-2">
              {[
                [`Growth stage (${GROWTH_LABELS[plan.growth_stage]?.split(" (")[0]})`, `Base: ${plan.base_rate} L/m²/day`],
                [`${plan.soil_type.replace("_"," ")} soil`, "Adjusted retention factor"],
                [`${plan.season} season`, `×${SEASON_MULTIPLIER[plan.season]} multiplier`],
                ["Live weather", "Adjusted daily per rain chance and temperature"],
              ].map(([label, value], i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-ink-500 dark:text-gray-400">{label}</span>
                  <span className="text-ink dark:text-white font-medium">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────
function buildReason(stage, weather, rate, lang) {
  const hot  = weather.temp > 33;
  const mild = weather.temp < 24;
  const humid = weather.humidity > 75;

  const stageNotes = {
    seedling:   "Seedlings need gentle, consistent moisture — do not overwater or roots will rot.",
    vegetative: "Active leaf growth requires steady moisture for nutrient uptake.",
    flowering:  "Flowering is the most water-sensitive stage — consistent moisture is critical.",
    fruiting:   "Fruit development requires good water supply but avoid waterlogging.",
    maturity:   "Reduce water as crop matures — too much water at this stage reduces quality.",
  };

  const weatherNote = hot ? ` High temperature (${weather.temp}°C) increases evaporation.`
    : mild ? ` Mild temperature reduces water need slightly.`
    : humid ? ` High humidity reduces evaporation.` : "";

  return `${stageNotes[stage] ?? ""}${weatherNote} Apply ${rate} L/m² in the early morning.`;
}

function buildSummary(form, baseRate, seasonMult, region) {
  const stageName = GROWTH_LABELS[form.growth_stage]?.split(" (")[0];
  const adjRate   = Math.round(baseRate * seasonMult * 10) / 10;
  return `${form.crop} at ${stageName.toLowerCase()} stage on ${form.soil_type.replace("_"," ")} soil in ${region}. `
    + `Base water need is ${baseRate} L/m²/day, adjusted to ~${adjRate} L/m²/day for the ${form.season} season. `
    + `Days with expected rain are automatically skipped.`;
}

export default IrrigationPage;