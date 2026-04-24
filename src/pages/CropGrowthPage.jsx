// ─── src/pages/CropGrowthPage.jsx ────────────────────────────────────
// Crop Growth Predictor — tells the farmer exactly when their crop will
// germinate, grow, flower, fruit, and be harvest-ready, with real calendar
// dates based on planting date + crop + region + soil condition.
// Fully multilingual: EN / YO / HA / IG

import { useState, useEffect } from "react";
import React from "react";
import Layout from "@/components/Layout";
import { supabase } from "@/lib/supabase";
import { askGroq } from "@/lib/api";
import { useFarmerLanguage } from "@/hooks/useFarmerLanguage";
import { useTranslation } from "react-i18next";
import { NIGERIAN_CROPS } from "@/lib/nigerianCrops";
import toast from "react-hot-toast";

// ── Language config ───────────────────────────────────────────────────
const LANG_INSTRUCTION = {
  en: "Respond in clear, simple English suitable for a Nigerian farmer.",
  yo: "Dahun ni ede Yoruba pẹlu gbogbo alaye pataki.",
  ha: "Amsa cikin harshen Hausa tare da cikakken bayani.",
  ig: "Zaghachi n'asụsụ Igbo nke ọma.",
};
const LANG_NAME = { en:"English", yo:"Yoruba", ha:"Hausa", ig:"Igbo" };

// ── SVG Icon components ───────────────────────────────────────────────
const IconSeedling = ({ size = 18, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22V12" /><path d="M12 12C12 7 8 4 3 5c0 5 3 8 9 7" /><path d="M12 12c0-5 4-8 9-7-1 5-4 8-9 7" />
  </svg>
);
const IconLeaf = ({ size = 18, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" /><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
  </svg>
);
const IconFlower = ({ size = 18, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" /><path d="M12 2a4 4 0 0 1 4 4 4 4 0 0 1-4 4 4 4 0 0 1-4-4 4 4 0 0 1 4-4" /><path d="M12 14a4 4 0 0 1 4 4 4 4 0 0 1-4 4 4 4 0 0 1-4-4 4 4 0 0 1 4-4" /><path d="M2 12a4 4 0 0 1 4-4 4 4 0 0 1 4 4 4 4 0 0 1-4 4 4 4 0 0 1-4-4" /><path d="M14 12a4 4 0 0 1 4-4 4 4 0 0 1 4 4 4 4 0 0 1-4 4 4 4 0 0 1-4-4" />
  </svg>
);
const IconApple = ({ size = 18, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20.94c1.5 0 2.75 1.06 4 1.06 3 0 6-8 6-12.22A4.91 4.91 0 0 0 17 5c-2.22 0-4 1.44-5 2-1-.56-2.78-2-5-2a4.9 4.9 0 0 0-5 4.78C2 14 5 22 8 22c1.25 0 2.5-1.06 4-1.06Z" /><path d="M10 2c1 .5 2 2 2 5" />
  </svg>
);
const IconSun = ({ size = 18, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
  </svg>
);
const IconWheat = ({ size = 18, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 22 16 8" /><path d="M3.47 12.53 5 11l1.53 1.53a3.5 3.5 0 0 1 0 4.94L5 19l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z" /><path d="M7.47 8.53 9 7l1.53 1.53a3.5 3.5 0 0 1 0 4.94L9 15l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z" /><path d="M11.47 4.53 13 3l1.53 1.53a3.5 3.5 0 0 1 0 4.94L13 11l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z" /><path d="M20 2H22v2a4 4 0 0 1-4 4h-2V6a4 4 0 0 1 4-4Z" /><path d="M11.47 17.47 13 19l-1.53 1.53a3.5 3.5 0 0 1-4.94 0L5 19l1.53-1.53a3.5 3.5 0 0 1 4.94 0Z" /><path d="M15.47 13.47 17 15l-1.53 1.53a3.5 3.5 0 0 1-4.94 0L9 15l1.53-1.53a3.5 3.5 0 0 1 4.94 0Z" /><path d="M19.47 9.47 21 11l-1.53 1.53a3.5 3.5 0 0 1-4.94 0L13 11l1.53-1.53a3.5 3.5 0 0 1 4.94 0Z" />
  </svg>
);
const IconMapPin = ({ size = 16, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" />
  </svg>
);
const IconCloud = ({ size = 20, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
  </svg>
);
const IconEye = ({ size = 12, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" />
  </svg>
);
const IconCheck = ({ size = 12, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 6 9 17l-5-5" />
  </svg>
);
const IconAlert = ({ size = 12, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><path d="M12 9v4" /><path d="M12 17h.01" />
  </svg>
);
const IconCheckCircle = ({ size = 16, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" />
  </svg>
);

// ── Stage icons & colors ──────────────────────────────────────────────
const STAGE_META = {
  germination: { icon:<IconSeedling />, color:"#22c55e", bg:"#dcfce7", darkBg:"rgba(34,197,94,0.12)" },
  vegetative:  { icon:<IconLeaf />,     color:"#16a34a", bg:"#bbf7d0", darkBg:"rgba(22,163,74,0.12)"  },
  flowering:   { icon:<IconFlower />,   color:"#f472b6", bg:"#fce7f3", darkBg:"rgba(244,114,182,0.12)"},
  fruiting:    { icon:<IconApple />,    color:"#f97316", bg:"#ffedd5", darkBg:"rgba(249,115,22,0.12)" },
  ripening:    { icon:<IconSun />,      color:"#eab308", bg:"#fef9c3", darkBg:"rgba(234,179,8,0.12)"  },
  harvest:     { icon:<IconWheat />,    color:"#1E8A4C", bg:"#dcfce7", darkBg:"rgba(30,138,76,0.15)"  },
};

const SOIL_OPTIONS = [
  { value:"good",     labelKey:"growth.soilGood"     },
  { value:"moderate", labelKey:"growth.soilModerate" },
  { value:"poor",     labelKey:"growth.soilPoor"     },
];

const SEASON_OPTIONS = [
  { value:"rainy",  labelKey:"growth.rainy"  },
  { value:"dry",    labelKey:"growth.dry"    },
  { value:"harmattan", labelKey:"growth.harmattan" },
];

// ── Dark mode helper ──────────────────────────────────────────────────
function useIsDark() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  useEffect(() => {
    const obs = new MutationObserver(() =>
      setDark(document.documentElement.classList.contains("dark"))
    );
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  return dark;
}

// ── AI function ───────────────────────────────────────────────────────
async function predictGrowth({ crop, plantingDate, region, soilCondition, season, lang }) {
  const langInstr = LANG_INSTRUCTION[lang] ?? LANG_INSTRUCTION.en;
  const langName  = LANG_NAME[lang] ?? "English";

  // Convert YYYY-MM-DD (from HTML date input) to a clear human-readable string
  // so the AI understands it unambiguously, and also compute numeric parts
  const [py, pm, pd] = plantingDate.split("-").map(Number);
  const plantingDateObj = new Date(py, pm - 1, pd);
  const plantingReadable = plantingDateObj.toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric"
  }); // e.g. "22 April 2025"

  const system = `You are TerraIQ+, an expert agronomist for Nigerian farmers with deep knowledge of Nigerian agriculture.
LANGUAGE RULE: ${langInstr}
ALL descriptive text must be in ${langName}. Numbers stay as numbers.

DATE FORMAT RULE — CRITICAL:
- The planting date is given to you as: ${plantingReadable} (${plantingDate})
- ALL dates in your response MUST use YYYY-MM-DD format (e.g. ${plantingDate})
- Compute each date by adding the correct number of days to ${plantingDate}
- Double-check every date: they must be real calendar dates in chronological order

ACCURATE NIGERIAN CROP DATA — use these verified growth periods and yields:
| Crop | Days to Harvest | Typical Yield (kg/ha) | Current Market (₦/kg) |
|------|----------------|----------------------|----------------------|
| Maize | 90–120 days | 1,500–3,000 kg/ha | 546–1,160 |
| Cassava | 270–365 days (9–12 months) | 15,000–30,000 kg/ha | 179–269 |
| Rice (local) | 120–150 days | 2,000–4,000 kg/ha | 1,400–3,500 |
| Tomato | 60–90 days | 10,000–20,000 kg/ha | 1,200–2,500 |
| Yam | 240–300 days (8–10 months) | 8,000–15,000 kg/ha | 800–1,500 |
| Groundnut | 90–120 days | 800–1,500 kg/ha | 2,600–7,000 |
| Pepper (rodo/habanero) | 90–120 days | 5,000–10,000 kg/ha | 3,500–10,000 |
| Soybean | 95–110 days | 1,000–2,000 kg/ha | 2,500–4,000 |
| Cowpea (beans) | 65–90 days | 500–1,200 kg/ha | 1,200–2,500 |
| Plantain | 300–365 days | 10,000–20,000 kg/ha | 500–1,500/kg |
| Sweet Potato | 120–150 days | 8,000–15,000 kg/ha | 400–800 |
| Watermelon | 70–90 days | 10,000–20,000 kg/ha | 150–400 |
| Okra | 55–70 days | 3,000–8,000 kg/ha | 800–2,000 |
| Cucumber | 50–70 days | 8,000–15,000 kg/ha | 500–1,500 |

SEASONAL CONTEXT FOR NIGERIA (2026):
- Rainy season: April–October (best for most crops)
- Dry season: November–March (irrigation needed)
- Harmattan: December–February (cool, dry winds, reduce irrigation frequency)
- Current month: April — early rainy season, excellent for maize, tomato, pepper, cowpea

SOIL CONDITION YIELD ADJUSTMENTS:
- Good soil: use full yield range
- Moderate soil: reduce yield by 25–35%
- Poor soil: reduce yield by 40–55%

You will predict a precise crop growth timeline for a Nigerian farmer.
Be accurate and realistic using the data above. DO NOT underestimate Nigerian cassava or yam duration — they take months, not weeks.

Respond ONLY with valid JSON. No markdown. No backticks. No explanation outside JSON.

{
  "crop_name": "full common name",
  "variety_note": "brief note about common Nigerian varieties — in ${langName}",
  "total_days_to_harvest": 90,
  "harvest_date": "YYYY-MM-DD",
  "confidence": "high",
  "season_suitability": "excellent",
  "season_note": "brief note about planting in this season — in ${langName}",
  "stages": [
    {
      "name": "germination",
      "label": "stage display name in ${langName}",
      "start_date": "YYYY-MM-DD",
      "end_date": "YYYY-MM-DD",
      "days_duration": 7,
      "what_to_expect": "what the farmer will see during this stage — in ${langName}",
      "farmer_action": "what the farmer should do during this stage — in ${langName}",
      "warning": "most common risk at this stage and how to prevent it — in ${langName}"
    }
  ],
  "yield_estimate": {
    "kg_per_hectare": 2500,
    "small_farm_kg": 625,
    "market_value_naira": 437500,
    "note": "brief yield context for Nigerian conditions — in ${langName}"
  },
  "key_milestones": [
    { "date": "YYYY-MM-DD", "event": "milestone description in ${langName}" }
  ],
  "tips": [
    "actionable tip 1 in ${langName}",
    "actionable tip 2 in ${langName}",
    "actionable tip 3 in ${langName}"
  ],
  "motivation": "one inspiring sentence for the farmer about their upcoming harvest — in ${langName}"
}

STAGE NAMES must be exactly: germination, vegetative, flowering, fruiting, ripening, harvest
(omit stages that don't apply — e.g. root crops skip flowering/fruiting)
Always include at least 4 stages. Always end with harvest stage.
Dates must be chronological. start_date of each stage = end_date of previous stage + 1 day.
harvest_date = end_date of the final harvest stage.`;

  const userMsg = `Crop: ${crop}
Planting date: ${plantingReadable} (${plantingDate})
Region: ${region}, Nigeria
Soil condition: ${soilCondition}
Season: ${season}
Predict the complete growth timeline. All dates in YYYY-MM-DD format.`;

  const raw = await askGroq(system, userMsg, 1600);
  try {
    return JSON.parse(raw.replace(/```json|```/g, "").trim());
  } catch {
    throw new Error("Could not parse growth prediction. Please try again.");
  }
}

// ── Helpers ───────────────────────────────────────────────────────────

// Robustly parse DD-MM-YYYY or YYYY-MM-DD or DD/MM/YYYY into a Date object.
// JS's native new Date("22-04-2025") returns Invalid Date — we fix that here.
function parseDate(dateStr) {
  if (!dateStr) return new Date(NaN);
  const s = String(dateStr).trim();

  // DD-MM-YYYY or DD/MM/YYYY
  const dmyDash  = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmyDash) {
    const [, d, m, y] = dmyDash;
    return new Date(+y, +m - 1, +d);
  }

  // YYYY-MM-DD (ISO — safe to pass directly)
  const isoDate = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoDate) {
    const [, y, m, d] = isoDate;
    return new Date(+y, +m - 1, +d);
  }

  // Fallback — let JS try (may still work for some formats)
  return new Date(s);
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = parseDate(dateStr);
  if (isNaN(d.getTime())) return dateStr; // return raw string if unparseable
  return d.toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
}

function daysFromNow(dateStr) {
  if (!dateStr) return null;
  const d    = parseDate(dateStr);
  if (isNaN(d.getTime())) return null;
  const today = new Date(); today.setHours(0,0,0,0);
  const target = new Date(d); target.setHours(0,0,0,0);
  return Math.ceil((target - today) / 86400000);
}

function progressPercent(startDate, endDate) {
  const now   = new Date();
  const start = parseDate(startDate);
  const end   = parseDate(endDate);
  if (isNaN(start) || isNaN(end)) return 0;
  if (now < start) return 0;
  if (now > end)   return 100;
  return Math.round(((now - start) / (end - start)) * 100);
}

function stageStatus(startDate, endDate) {
  const now   = new Date();
  const start = parseDate(startDate);
  const end   = parseDate(endDate);
  if (isNaN(start) || isNaN(end)) return "upcoming";
  if (now < start) return "upcoming";
  if (now > end)   return "done";
  return "active";
}

// ── Save to DB ────────────────────────────────────────────────────────
async function savePrediction(userId, crop, plantingDate, result) {
  try {
    await supabase.from("growth_predictions").insert({
      user_id:      userId,
      crop,
      planting_date: plantingDate,
      harvest_date:  result.harvest_date,
      total_days:    result.total_days_to_harvest,
      result:        JSON.stringify(result),
      created_at:    new Date().toISOString(),
    });
  } catch { /* non-critical */ }
}

// ═══════════════════════════════════════════════════════════════════
export default function CropGrowthPage() {
  const lang     = useFarmerLanguage();
  const { t }    = useTranslation();
  const cropList = NIGERIAN_CROPS.map(c => c.name);

  const isDark = useIsDark();

  const [form, setForm] = useState({
    crop: "", plantingDate: new Date().toISOString().slice(0, 10),
    soilCondition: "good", season: "rainy",
  });
  const [result,   setResult]   = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [profile,  setProfile]  = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [saved,    setSaved]    = useState([]);
  const [showSaved,setShowSaved]= useState(false);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const { data: p } = await supabase.from("profiles")
        .select("region, city, full_name").eq("id", session.user.id).single();
      setProfile({ ...p, id: session.user.id });

      // Load saved predictions
      const { data: preds } = await supabase.from("growth_predictions")
        .select("*").eq("user_id", session.user.id)
        .order("created_at", { ascending: false }).limit(5);
      setSaved(preds ?? []);
    })();
  }, []);

  const predict = async () => {
    if (!form.crop) { toast.error(t("growth.enterCrop")); return; }
    if (!form.plantingDate) { toast.error(t("growth.enterDate")); return; }
    setLoading(true);
    const tid = toast.loading(t("growth.predicting"));
    try {
      const data = await predictGrowth({
        crop:           form.crop,
        plantingDate:   form.plantingDate,
        region:         profile?.region ?? "Nigeria",
        soilCondition:  form.soilCondition,
        season:         form.season,
        lang,
      });
      setResult(data);
      setExpanded(null);
      toast.dismiss(tid);
      toast.success(t("growth.readyToast"));
      // Save
      if (profile?.id) {
        await savePrediction(profile.id, form.crop, form.plantingDate, data);
        const { data: preds } = await supabase.from("growth_predictions")
          .select("*").eq("user_id", profile.id)
          .order("created_at", { ascending: false }).limit(5);
        setSaved(preds ?? []);
      }
    } catch (e) {
      toast.dismiss(tid);
      toast.error(e.message);
    }
    setLoading(false);
  };

  const loadSaved = (pred) => {
    try {
      const r = JSON.parse(pred.result);
      setResult(r);
      setForm(f => ({ ...f, crop: pred.crop, plantingDate: pred.planting_date }));
      setShowSaved(false);
      setExpanded(null);
    } catch { toast.error("Could not load saved prediction"); }
  };

  // Harvest countdown
  const harvestDays = result ? daysFromNow(result.harvest_date) : null;

  const iClass = "w-full bg-white dark:bg-dark-mid rounded-xl px-4 h-12 text-ink dark:text-white border border-deep-light dark:border-dark-light focus:border-terra outline-none text-sm shadow-sm";
  const selectClass = "w-full bg-white dark:bg-dark-mid rounded-xl px-4 h-12 text-ink dark:text-white border border-deep-light dark:border-dark-light focus:border-terra outline-none text-sm shadow-sm appearance-none cursor-pointer";
  const labelClass = "text-ink-500 dark:text-gray-400 text-sm mb-1.5 block font-medium";

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-ink dark:text-white text-3xl font-black">
            {t("growth.title")}
          </h1>
          <p className="text-ink-500 dark:text-gray-400 mt-1 text-sm">
            {t("growth.subtitle")}
          </p>
        </div>

        {/* Input card */}
        <div className="bg-white dark:bg-dark-surface rounded-2xl border border-deep-light dark:border-dark-light p-6 shadow-card mb-5 space-y-4">

          {/* Crop selector */}
          <div>
            <label className={labelClass}>{t("growth.crop")}</label>
            <select value={form.crop} onChange={e => setForm(f => ({ ...f, crop: e.target.value }))}
              className={iClass}>
              <option value="">{t("growth.selectCrop")}</option>
              {cropList.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Planting date — Day / Month / Year dropdowns so farmer sees DD/MM/YYYY */}
          <div>
            <label className={labelClass}>{t("growth.plantingDate")}</label>
            <div className="grid grid-cols-3 gap-2">
              {/* Day */}
              <select
                value={form.plantingDate ? form.plantingDate.split("-")[2] : ""}
                onChange={e => {
                  const parts = (form.plantingDate || "").split("-");
                  const y = parts[0] || new Date().getFullYear();
                  const m = parts[1] || "01";
                  setForm(f => ({ ...f, plantingDate: `${y}-${m}-${e.target.value.padStart(2,"0")}` }));
                }}
                className={iClass}
              >
                <option value="">{t("growth.day")}</option>
                {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                  <option key={d} value={String(d).padStart(2,"0")}>{d}</option>
                ))}
              </select>
              {/* Month */}
              <select
                value={form.plantingDate ? form.plantingDate.split("-")[1] : ""}
                onChange={e => {
                  const parts = (form.plantingDate || "").split("-");
                  const y = parts[0] || new Date().getFullYear();
                  const d = parts[2] || "01";
                  setForm(f => ({ ...f, plantingDate: `${y}-${e.target.value}-${d}` }));
                }}
                className={iClass}
              >
                <option value="">{t("growth.month")}</option>
                {["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map((name, idx) => (
                  <option key={name} value={String(idx+1).padStart(2,"0")}>{name}</option>
                ))}
              </select>
              {/* Year */}
              <select
                value={form.plantingDate ? form.plantingDate.split("-")[0] : ""}
                onChange={e => {
                  const parts = (form.plantingDate || "").split("-");
                  const m = parts[1] || "01";
                  const d = parts[2] || "01";
                  setForm(f => ({ ...f, plantingDate: `${e.target.value}-${m}-${d}` }));
                }}
                className={iClass}
              >
                <option value="">{t("growth.year")}</option>
                {Array.from({ length: 4 }, (_, i) => new Date().getFullYear() + i - 1).map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <p className="text-ink-500 dark:text-gray-500 text-xs mt-1">
              {t("growth.plantingDateHint")}
            </p>
          </div>

          {/* Soil + Season row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>{t("growth.soilCondition")}</label>
              <div className="flex flex-col gap-1.5">
                {SOIL_OPTIONS.map(opt => (
                  <button key={opt.value} onClick={() => setForm(f => ({ ...f, soilCondition: opt.value }))}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border text-left transition-all ${
                      form.soilCondition === opt.value
                        ? "bg-terra text-white border-terra"
                        : "bg-deep-mid dark:bg-dark-mid text-ink-500 dark:text-gray-400 border-deep-light dark:border-dark-light"
                    }`}>
                    {t(opt.labelKey)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className={labelClass}>{t("growth.season")}</label>
              <div className="flex flex-col gap-1.5">
                {SEASON_OPTIONS.map(opt => (
                  <button key={opt.value} onClick={() => setForm(f => ({ ...f, season: opt.value }))}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border text-left transition-all ${
                      form.season === opt.value
                        ? "bg-terra text-white border-terra"
                        : "bg-deep-mid dark:bg-dark-mid text-ink-500 dark:text-gray-400 border-deep-light dark:border-dark-light"
                    }`}>
                    {t(opt.labelKey)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Location badge */}
          {profile?.region && (
            <div className="flex items-center gap-2 text-xs text-terra font-semibold">
              <IconMapPin size={14} color="#1E8A4C" />
              <span>{profile.city ? `${profile.city}, ` : ""}{profile.region}</span>
              <span className="text-ink-500 dark:text-gray-500 font-normal">— {t("growth.locationUsed")}</span>
            </div>
          )}

          <button onClick={predict} disabled={loading}
            className="w-full bg-terra text-white h-13 rounded-xl font-bold text-base hover:bg-terra-dark disabled:opacity-50 transition-colors shadow-md flex items-center justify-center gap-2"
            style={{ height: 52 }}>
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {t("growth.predicting")}
              </>
            ) : (
              <>{t("growth.predictBtn")} <IconSeedling size={18} color="white" /></>
            )}
          </button>
        </div>

        {/* Saved predictions */}
        {saved.length > 0 && !result && (
          <div className="mb-5">
            <button onClick={() => setShowSaved(!showSaved)}
              className="text-terra text-sm font-semibold flex items-center gap-1 mb-2 hover:underline">
              {t("growth.savedPredictions")} ({saved.length})
              <span style={{ fontSize: 10 }}>{showSaved ? "▲" : "▼"}</span>
            </button>
            {showSaved && (
              <div className="space-y-2">
                {saved.map(p => (
                  <button key={p.id} onClick={() => loadSaved(p)}
                    className="w-full bg-white dark:bg-dark-surface rounded-xl border border-deep-light dark:border-dark-light px-4 py-3 text-left hover:border-terra transition-colors shadow-sm">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-ink dark:text-white font-semibold text-sm">{p.crop}</p>
                        <p className="text-ink-500 dark:text-gray-400 text-xs mt-0.5">
                          {t("growth.planted")}: {formatDate(p.planting_date)} · {t("growth.harvest")}: {formatDate(p.harvest_date)}
                        </p>
                      </div>
                      <span className="text-terra text-xs font-bold">{t("growth.view")} →</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── RESULT ─────────────────────────────────────────────── */}
        {result && (
          <div className="space-y-4">

            {/* Hero countdown card */}
            <div style={{
              background: "linear-gradient(135deg, #1E8A4C 0%, #145F35 100%)",
              borderRadius: 20, padding: "24px 20px", position: "relative", overflow: "hidden"
            }}>
              {/* Background decoration */}
              <div style={{
                position: "absolute", top: -20, right: -20,
                width: 120, height: 120, borderRadius: "50%",
                background: "rgba(255,255,255,0.05)"
              }} />
              <div style={{
                position: "absolute", bottom: -30, left: "40%",
                width: 80, height: 80, borderRadius: "50%",
                background: "rgba(255,255,255,0.04)"
              }} />

              <div className="relative z-10">
                <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, fontWeight: 600, letterSpacing: 1.5, marginBottom: 4 }}>
                  {result.crop_name?.toUpperCase()}
                </p>
                {harvestDays !== null && harvestDays > 0 ? (
                  <>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 4 }}>
                      <p style={{ color: "white", fontSize: 40, fontWeight: 900, lineHeight: 1 }}>
                        {harvestDays}
                      </p>
                      <div>
                        <p style={{ color: "rgba(255,255,255,0.85)", fontSize: 15, fontWeight: 700 }}>
                          {t("growth.daysToHarvest")}
                        </p>
                        <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 11, fontWeight: 500, marginTop: 1 }}>
                          ≈ {(harvestDays / 30.44).toFixed(1)} months
                        </p>
                      </div>
                    </div>
                    <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 13, marginTop: 4, display: "flex", alignItems: "center", gap: 6 }}>
                      <IconWheat size={14} color="rgba(255,255,255,0.65)" /> {t("growth.harvestOn")} <strong style={{ color: "white" }}>{formatDate(result.harvest_date)}</strong>
                    </p>
                  </>
                ) : harvestDays !== null && harvestDays <= 0 ? (
                  <>
                    <p style={{ color: "#FFD700", fontSize: 32, fontWeight: 900, display: "flex", alignItems: "center", gap: 10 }}><IconWheat size={32} color="#FFD700" /> {t("growth.harvestReady")}</p>
                    <p style={{ color: "rgba(255,255,255,0.8)", fontSize: 13, marginTop: 4 }}>
                      {t("growth.harvestReadySub")}
                    </p>
                  </>
                ) : (
                  <>
                    <p style={{ color: "white", fontSize: 28, fontWeight: 900 }}>
                      {result.total_days_to_harvest} {t("growth.days")}
                    </p>
                    <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 12, marginTop: 2 }}>
                      ≈ {(result.total_days_to_harvest / 30.44).toFixed(1)} months
                    </p>
                    <p style={{ color: "rgba(255,255,255,0.8)", fontSize: 13, marginTop: 4 }}>
                      {t("growth.totalGrowthTime")} · {t("growth.harvest")}: {formatDate(result.harvest_date)}
                    </p>
                  </>
                )}

                {/* Season suitability */}
                <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <span style={{
                    background: "rgba(255,255,255,0.15)", color: "white",
                    padding: "4px 10px", borderRadius: 8, fontSize: 11, fontWeight: 700
                  }}>
                    {result.total_days_to_harvest} {t("growth.days")} · {(result.total_days_to_harvest / 30.44).toFixed(1)} mo
                  </span>
                  <span style={{
                    background: result.season_suitability === "excellent" || result.season_suitability === "good"
                      ? "rgba(255,215,0,0.2)" : "rgba(255,100,100,0.2)",
                    color: result.season_suitability === "excellent" || result.season_suitability === "good"
                      ? "#FFD700" : "#FF8080",
                    padding: "4px 10px", borderRadius: 8, fontSize: 11, fontWeight: 700,
                    textTransform: "capitalize"
                  }}>
                    {result.season_suitability} {t("growth.seasonFit")}
                  </span>
                </div>

                {/* Motivation */}
                {result.motivation && (
                  <p style={{
                    color: "rgba(255,255,255,0.8)", fontSize: 12, fontStyle: "italic",
                    marginTop: 12, lineHeight: 1.5,
                    borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 10
                  }}>
                    "{result.motivation}"
                  </p>
                )}
              </div>
            </div>

            {/* Season note */}
            {result.season_note && (
              <div className="bg-amber/10 border border-amber/30 rounded-xl p-3 flex gap-2">
                <span className="shrink-0"><IconCloud size={20} color="#f59e0b" /></span>
                <p className="text-ink-500 dark:text-gray-300 text-sm">{result.season_note}</p>
              </div>
            )}

            {/* Growth stages timeline */}
            <div className="bg-white dark:bg-dark-surface rounded-2xl border border-deep-light dark:border-dark-light shadow-card overflow-hidden">
              <div className="px-5 py-4 border-b border-deep-light dark:border-dark-light">
                <h2 className="text-ink dark:text-white font-bold">{t("growth.timeline")}</h2>
                <p className="text-ink-500 dark:text-gray-400 text-xs mt-0.5">{t("growth.tapStage")}</p>
              </div>

              <div className="divide-y divide-deep-light dark:divide-dark-light">
                {(result.stages ?? []).map((stage, i) => {
                  const meta     = STAGE_META[stage.name] ?? STAGE_META.germination;
                  const status   = stageStatus(stage.start_date, stage.end_date);
                  const progress = progressPercent(stage.start_date, stage.end_date);
                  const isOpen   = expanded === i;

                  return (
                    <div key={i}>
                      <button
                        onClick={() => setExpanded(isOpen ? null : i)}
                        className="w-full px-5 py-4 text-left flex items-start gap-3 hover:bg-deep-mid dark:hover:bg-dark-mid transition-colors"
                      >
                        {/* Stage icon */}
                        <div style={{
                          width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                          background: status === "active" ? meta.color : status === "done" ? meta.bg : "transparent",
                          border: `2px solid ${status === "upcoming" ? "#e5e7eb" : meta.color}`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 18,
                        }}
                          className={status === "active" ? "" : "dark:border-gray-700"}
                        >
                          {status === "done" ? <IconCheck size={16} color={meta.color} /> : React.cloneElement(meta.icon, { size: 18, color: status === "active" ? "white" : meta.color })}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className={`font-bold text-sm ${
                                status === "done" ? "text-ink-500 dark:text-gray-400 line-through" :
                                status === "active" ? "text-ink dark:text-white" :
                                "text-ink-500 dark:text-gray-400"
                              }`}>
                                {stage.label}
                              </p>
                              {status === "active" && (
                                <span style={{
                                  background: meta.color, color: "white",
                                  fontSize: 9, fontWeight: 800, padding: "2px 7px",
                                  borderRadius: 6, letterSpacing: 0.5
                                }}>
                                  {t("growth.now")}
                                </span>
                              )}
                            </div>
                            <span className="text-ink-500 dark:text-gray-500 text-xs shrink-0">
                              {isOpen ? "▲" : "▼"}
                            </span>
                          </div>

                          <p className="text-ink-500 dark:text-gray-400 text-xs mt-0.5">
                            {formatDate(stage.start_date)} → {formatDate(stage.end_date)}
                            <span className="mx-1.5">·</span>
                            {stage.days_duration} {t("growth.days")}
                          </p>

                          {/* Progress bar — only for active stage */}
                          {status === "active" && (
                            <div style={{ marginTop: 6, height: 4, borderRadius: 2, background: "#e5e7eb", overflow: "hidden" }}>
                              <div style={{
                                width: `${progress}%`, height: "100%",
                                background: meta.color, borderRadius: 2,
                                transition: "width 0.6s ease"
                              }} />
                            </div>
                          )}
                        </div>
                      </button>

                      {/* Expanded details */}
                      {isOpen && (
                        <div style={{
                          background: isDark ? "#162E1F" : "#f8faf9",
                          borderTop: `2px solid ${meta.color}20`,
                          padding: "16px 20px 16px 20px",
                        }}>
                          {/* What to expect */}
                          <div className="mb-3">
                            <p style={{ color: meta.color, fontSize: 11, fontWeight: 700, letterSpacing: 0.5, marginBottom: 4, display: "flex", alignItems: "center", gap: 4 }}>
                              <IconEye size={12} color={meta.color} /> {t("growth.whatToExpect").toUpperCase()}
                            </p>
                            <p style={{ color: isDark ? "#ffffff" : "#0F1F17" }} className="text-sm leading-relaxed">{stage.what_to_expect}</p>
                          </div>

                          {/* Farmer action */}
                          <div className="mb-3">
                            <p style={{ color: meta.color, fontSize: 11, fontWeight: 700, letterSpacing: 0.5, marginBottom: 4, display: "flex", alignItems: "center", gap: 4 }}>
                              <IconCheck size={12} color={meta.color} /> {t("growth.yourAction").toUpperCase()}
                            </p>
                            <p style={{ color: isDark ? "#ffffff" : "#0F1F17" }} className="text-sm leading-relaxed">{stage.farmer_action}</p>
                          </div>

                          {/* Warning */}
                          {stage.warning && (
                            <div style={{
                              background: isDark ? "rgba(239,68,68,0.18)" : "rgba(239,68,68,0.07)",
                              borderRadius: 10,
                              padding: "10px 12px", borderLeft: "3px solid #ef4444"
                            }}>
                              <p style={{ color: "#ef4444", fontSize: 11, fontWeight: 700, marginBottom: 2, display: "flex", alignItems: "center", gap: 4 }}>
                                <IconAlert size={12} color="#ef4444" /> {t("growth.watchOut").toUpperCase()}
                              </p>
                              <p style={{ color: isDark ? "#ffffff" : "#0F1F17" }} className="text-sm">{stage.warning}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Key milestones */}
            {result.key_milestones?.length > 0 && (
              <div className="bg-white dark:bg-dark-surface rounded-2xl border border-deep-light dark:border-dark-light shadow-card p-5">
                <h2 className="text-ink dark:text-white font-bold mb-4">{t("growth.milestones")}</h2>
                <div className="space-y-3">
                  {result.key_milestones.map((m, i) => {
                    const past = parseDate(m.date) < new Date();
                    // Pick icon from event text keywords — AI doesn't return icon field
                    const eventLower = (m.event || "").toLowerCase();
                    const milestoneIcon = past ? "✅" :
                      eventLower.includes("germ") || eventLower.includes("sprout") || eventLower.includes("plant") ? "🌱" :
                      eventLower.includes("flower") || eventLower.includes("blossom") ? "🌸" :
                      eventLower.includes("fruit") || eventLower.includes("pod") || eventLower.includes("tuber") ? "🍅" :
                      eventLower.includes("harvest") || eventLower.includes("ready") || eventLower.includes("mature") ? "🌾" :
                      eventLower.includes("water") || eventLower.includes("irrigat") ? "💧" :
                      eventLower.includes("fertiliz") || eventLower.includes("manure") || eventLower.includes("npk") ? "🌿" :
                      eventLower.includes("pest") || eventLower.includes("disease") || eventLower.includes("spray") ? "🔬" :
                      eventLower.includes("weed") ? "✂️" :
                      eventLower.includes("rain") || eventLower.includes("weather") ? "🌧️" :
                      eventLower.includes("leaf") || eventLower.includes("vegeta") || eventLower.includes("grow") ? "🍃" :
                      eventLower.includes("sell") || eventLower.includes("market") ? "🏪" :
                      ["🌱","🍃","🌸","🍅","🌾","💧","🌿"][i % 7];
                    return (
                      <div key={i} className="flex items-start gap-3">
                        <div style={{
                          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                          background: past ? "#f0fdf4" : "#f9fafb",
                          border: `1.5px solid ${past ? "#22c55e" : "#e5e7eb"}`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 18,
                        }} className="dark:bg-dark-mid dark:border-gray-700">
                          {milestoneIcon}
                        </div>
                        <div>
                          <p className={`text-sm font-semibold ${past ? "text-ink-500 dark:text-gray-400 line-through" : "text-ink dark:text-white"}`}>
                            {m.event}
                          </p>
                          <p className="text-ink-500 dark:text-gray-500 text-xs">{formatDate(m.date)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Yield estimate */}
            {result.yield_estimate && (
              <div className="bg-white dark:bg-dark-surface rounded-2xl border border-deep-light dark:border-dark-light shadow-card p-5">
                <h2 className="text-ink dark:text-white font-bold mb-4">{t("growth.yieldEstimate")}</h2>
                <div className="grid grid-cols-3 gap-3 mb-3">
                  {[
                    { label: t("growth.perHectare"),   value: `${(result.yield_estimate.kg_per_hectare ?? 0).toLocaleString()} kg`, color: "text-terra" },
                    { label: t("growth.smallFarm"),    value: `${(result.yield_estimate.small_farm_kg ?? 0).toLocaleString()} kg`, color: "text-sky" },
                    { label: t("growth.marketValue"),  value: `₦${(result.yield_estimate.market_value_naira ?? 0).toLocaleString()}`, color: "text-amber" },
                  ].map(stat => (
                    <div key={stat.label} className="bg-deep-mid dark:bg-dark-mid rounded-xl p-3 text-center">
                      <p className={`text-lg font-black ${stat.color}`}>{stat.value}</p>
                      <p className="text-ink-500 dark:text-gray-400 text-xs mt-0.5">{stat.label}</p>
                    </div>
                  ))}
                </div>
                {result.yield_estimate.note && (
                  <p className="text-ink-500 dark:text-gray-400 text-xs leading-relaxed">{result.yield_estimate.note}</p>
                )}
              </div>
            )}

            {/* Tips */}
            {result.tips?.length > 0 && (
              <div className="bg-terra-light dark:bg-terra/10 border border-green-200 dark:border-terra/20 rounded-2xl p-5">
                <h2 className="text-terra font-bold mb-3">{t("growth.tips")}</h2>
                <div className="space-y-2">
                  {result.tips.map((tip, i) => (
                    <div key={i} className="flex gap-2 items-start">
                      <span className="text-terra font-black text-sm shrink-0 mt-0.5">{i + 1}.</span>
                      <p className="text-ink dark:text-white text-sm leading-relaxed">{tip}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Variety note */}
            {result.variety_note && (
              <div className="bg-white dark:bg-dark-surface rounded-2xl border border-deep-light dark:border-dark-light p-4 shadow-card">
                <p className="text-ink-500 dark:text-gray-400 text-xs font-semibold uppercase tracking-wide mb-1">{t("growth.varietyNote")}</p>
                <p className="text-ink dark:text-white text-sm">{result.variety_note}</p>
              </div>
            )}

            {/* Predict another */}
            <button onClick={() => { setResult(null); setExpanded(null); }}
              className="w-full border border-terra text-terra h-12 rounded-xl font-semibold hover:bg-terra hover:text-white transition-colors">
              {t("growth.predictAnother")}
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
}
