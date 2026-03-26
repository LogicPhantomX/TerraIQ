// ─── TerraIQ+ API Layer ───────────────────────────────────────────────
// All AI responses now match the farmer's selected language.
// Language is passed to every function and injected into the system prompt.

const GROQ_KEY    = import.meta.env.VITE_GROQ_KEY    ?? "";
const WEATHER_KEY = import.meta.env.VITE_WEATHER_KEY ?? "";
const GROQ_URL    = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL  = "llama-3.3-70b-versatile";

// ── Language instructions injected into every prompt ─────────────────
const LANG_INSTRUCTION = {
  en: "Respond in clear, simple English. Keep language easy to understand for a Nigerian farmer.",
  yo: "Dahun ni ede Yoruba. Je ki ede naa rọrun fun agbẹ ara Nigeria. Gbogbo alaye gbọdọ wa ni Yoruba.",
  ha: "Amsa cikin harshen Hausa. Yi amfani da kalmomin sauƙi da manoman Najeriya za su fahimta. Duk bayani ya kamata ya kasance cikin Hausa.",
  ig: "Zaghachi n'asụsụ Igbo. Jiri okwu dị mfe nke ndị ọrụ ugbo Nigeria ga-ghọta. Nzaghachi niile kwesịrị ịbụ n'Igbo.",
};

// ── Language names for prompts ────────────────────────────────────────
const LANG_NAME = {
  en: "English",
  yo: "Yoruba",
  ha: "Hausa",
  ig: "Igbo",
};

// ── Core Groq call ────────────────────────────────────────────────────
export async function askGroq(systemPrompt, userMessage, maxTokens = 1000) {
  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type":  "application/json",
      "Authorization": `Bearer ${GROQ_KEY}`,
    },
    body: JSON.stringify({
      model:      GROQ_MODEL,
      max_tokens: maxTokens,
      messages: [
        { role:"system", content: systemPrompt },
        { role:"user",   content: userMessage  },
      ],
    }),
  });
  if (!res.ok) {
    const e = await res.json();
    throw new Error(e.error?.message ?? `Groq error: ${res.status}`);
  }
  const data = await res.json();
  return data.choices[0].message.content;
}

function parseJSON(raw) {
  try { return JSON.parse(raw.replace(/```json|```/g, "").trim()); }
  catch { return null; }
}

// ── Get farmer language from Supabase profile ─────────────────────────
// Call this in any page to get the farmer's saved language
import { supabase } from "@/lib/supabase";

export async function getFarmerLanguage() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return "en";
    const { data } = await supabase.from("profiles").select("language").eq("id", user.id).single();
    return data?.language ?? "en";
  } catch {
    return "en";
  }
}

// ── 1. Crop Disease Treatment Plan ───────────────────────────────────

export async function getTreatmentPlan(crop, disease, severity, region, lang = "en") {
  const langInstr = LANG_INSTRUCTION[lang] ?? LANG_INSTRUCTION.en;
  const langName  = LANG_NAME[lang] ?? "English";

  const system = `You are TerraIQ+, an expert agronomist for Nigerian farmers.
LANGUAGE RULE: ${langInstr}
ALL text in your response including field values must be in ${langName}.

Respond ONLY with a valid JSON object. No markdown. No backticks. No explanation outside the JSON.
{
  "immediate_action": "string in ${langName}",
  "steps": ["step in ${langName}", "step in ${langName}", "step in ${langName}", "step in ${langName}"],
  "local_products": [{"name":"product name","price_naira":4500,"where":"Nigerian market or agro store"}],
  "organic_option": "string in ${langName}",
  "prevention": "string in ${langName}"
}

Product names and market locations should stay in English or common Nigerian usage.
Prices must be in Naira.`;

  const raw = await askGroq(system, `Crop:${crop} Disease:${disease} Severity:${severity} Region:${region},Nigeria`, 800);
  return parseJSON(raw) ?? { immediate_action: raw, steps: [], local_products: [], organic_option: "", prevention: "" };
}

// ── 2. Soil Analysis ─────────────────────────────────────────────────

export async function getSoilAnalysis(params) {
  const lang      = params.lang ?? "en";
  const langInstr = LANG_INSTRUCTION[lang] ?? LANG_INSTRUCTION.en;
  const langName  = LANG_NAME[lang] ?? "English";

  const system = `You are TerraIQ+, a soil scientist for Nigerian farmers.
LANGUAGE RULE: ${langInstr}
ALL descriptive text in your response must be in ${langName}. Product names stay in English.

Respond ONLY with a valid JSON object. No markdown. No backticks.
{
  "rating": "good",
  "summary": "2 sentences in ${langName}",
  "best_crops": ["Maize","Cassava","Yam"],
  "weed_risk": "moderate",
  "weed_risk_explanation": "string in ${langName}",
  "fertilizer_recommendation": {
    "synthetic": {
      "name": "NPK 15-15-15",
      "rate": "300kg/ha",
      "timing": "string in ${langName}",
      "price_naira": 18000,
      "where_to_buy": "string"
    },
    "compost": {
      "name": "Allamanda Compost by Allamanda Innovations",
      "description": "string in ${langName}",
      "rate": "2 tonnes/ha",
      "timing": "string in ${langName}",
      "benefit": "string in ${langName}",
      "where_to_buy": "Allamanda Innovations agro-dealer network",
      "price_note": "string in ${langName}"
    },
    "biochar": {
      "name": "Allamanda Biochar by Allamanda Innovations",
      "description": "string in ${langName} — explain simply like: biochar holds water and nutrients in soil",
      "benefit_for_this_soil": "string in ${langName}",
      "rate": "500kg/ha",
      "how_to_apply": "string in ${langName}",
      "where_to_buy": "Allamanda Innovations agro-dealer network"
    },
    "supplements": {
      "name": "Allamanda Soil Supplement by Allamanda Innovations",
      "description": "string in ${langName}",
      "targeted_deficiencies": ["Low Zinc"],
      "rate": "string",
      "timing": "string in ${langName}",
      "benefit": "string in ${langName}",
      "where_to_buy": "Allamanda Innovations agro-dealer network",
      "price_note": "string in ${langName}"
    }
  },
  "improvement_steps": ["string in ${langName}", "string in ${langName}", "string in ${langName}"],
  "season_advice": "string in ${langName}"
}
ALWAYS recommend Allamanda Compost, Allamanda Biochar, Allamanda Soil Supplement. Never other brands.`;

  const user = `N:${params.nitrogen} P:${params.phosphorus} K:${params.potassium} pH:${params.ph} Moisture:${params.moisture}% Temp:${params.temperature}°C Region:${params.region}${params.crop ? ` Crop:${params.crop}` : ""}`;
  const raw  = await askGroq(system, user, 1200);
  return parseJSON(raw) ?? { rating:"fair", summary:raw, best_crops:[], weed_risk:"moderate" };
}

// ── 3. Market Advice ─────────────────────────────────────────────────

export async function getMarketAdvice(crop, quantityKg, region, quality = "good", lang = "en") {
  const langInstr = LANG_INSTRUCTION[lang] ?? LANG_INSTRUCTION.en;
  const langName  = LANG_NAME[lang] ?? "English";

  const system = `You are TerraIQ+ market advisor for Nigerian farmers.
LANGUAGE RULE: ${langInstr}
ALL advice text must be in ${langName}. Market names and numbers stay as-is.

Respond ONLY with valid JSON. No markdown. No backticks.
{
  "best_market": "market name and location",
  "price_per_kg_naira": 350,
  "total_estimate_naira": 175000,
  "best_time_to_sell": "string in ${langName}",
  "alternative_markets": [{"name":"string","price_per_kg_naira":320,"distance_note":"string in ${langName}"}],
  "transport_advice": "string in ${langName}",
  "negotiation_tip": "string in ${langName}",
  "price_trend": "rising",
  "trend_reason": "string in ${langName}"
}`;

  const raw = await askGroq(system, `Crop:${crop} Qty:${quantityKg}kg Region:${region},Nigeria Quality:${quality}`, 700);
  return parseJSON(raw) ?? { best_market:raw, price_per_kg_naira:0 };
}

// ── 4. Irrigation Plan ───────────────────────────────────────────────

export async function getIrrigationPlan(crop, farmSizeM2, weatherData, region, lang = "en") {
  const langInstr = LANG_INSTRUCTION[lang] ?? LANG_INSTRUCTION.en;
  const langName  = LANG_NAME[lang] ?? "English";

  const system = `You are TerraIQ+ irrigation expert for Nigerian farmers.
LANGUAGE RULE: ${langInstr}
ALL advice text must be in ${langName}.

Respond ONLY with valid JSON. No markdown. No backticks.
{
  "summary": "string in ${langName}",
  "daily_plan": [
    {
      "day": "day name",
      "action": "water",
      "litres_per_sqm": 4,
      "best_time": "6-7am",
      "reason": "string in ${langName}"
    }
  ],
  "weekly_total_litres": 2000,
  "tips": ["string in ${langName}", "string in ${langName}"]
}`;

  const raw = await askGroq(system, `Crop:${crop} Size:${farmSizeM2}m² Region:${region} Weather:${JSON.stringify(weatherData)}`, 900);
  return parseJSON(raw) ?? { summary:raw, daily_plan:[] };
}

// ── 5. Harvest Shelf Life ────────────────────────────────────────────

export async function getShelfLifePrediction(crop, quantityKg, storageMethod, temp, humidity, lang = "en") {
  const langInstr = LANG_INSTRUCTION[lang] ?? LANG_INSTRUCTION.en;
  const langName  = LANG_NAME[lang] ?? "English";

  const system = `You are TerraIQ+ post-harvest expert for Nigerian farmers.
LANGUAGE RULE: ${langInstr}
ALL text must be in ${langName}.

Respond ONLY with valid JSON. No markdown. No backticks.
{
  "shelf_life_days": 14,
  "urgency": "good",
  "summary": "string in ${langName}",
  "storage_tips": ["string in ${langName}", "string in ${langName}"],
  "warning_signs": ["string in ${langName}", "string in ${langName}"]
}`;

  const raw = await askGroq(system, `Crop:${crop} Qty:${quantityKg}kg Storage:${storageMethod} Temp:${temp}°C Humidity:${humidity}%`, 400);
  return parseJSON(raw) ?? { shelf_life_days:7, urgency:"moderate", summary:raw };
}

// ── 6. Crop Image Analysis ───────────────────────────────────────────

export async function analyseImageWithGroq(base64Image, region, lang = "en") {
  const langInstr = LANG_INSTRUCTION[lang] ?? LANG_INSTRUCTION.en;
  const langName  = LANG_NAME[lang] ?? "English";

  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type":  "application/json",
      "Authorization": `Bearer ${GROQ_KEY}`,
    },
    body: JSON.stringify({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      max_tokens: 1000,
      messages: [
        {
          role: "system",
          content: `You are TerraIQ+, an expert agronomist for Nigerian farmers.

LANGUAGE RULE: ${langInstr}
ALL advice text in your response must be in ${langName}. Product names stay in English.

CRITICAL: Only analyse crop/plant images. If not a plant return:
{"not_a_plant": true, "message": "string in ${langName} asking farmer to upload a crop photo"}

For plant images respond ONLY with valid JSON. No markdown. No backticks.
{
  "not_a_plant": false,
  "is_healthy": false,
  "crop_identified": "crop name",
  "diagnosis": "disease name in ${langName}",
  "confidence": 85,
  "severity": "high",
  "severity_explanation": "string in ${langName}",
  "immediate_action": "string in ${langName}",
  "steps": ["string in ${langName}", "string in ${langName}", "string in ${langName}", "string in ${langName}"],
  "local_products": [{"name":"product name in English","price_naira":4500,"where":"Nigerian market"}],
  "organic_option": "string in ${langName}",
  "prevention": "string in ${langName}",
  "weed_detected": false,
  "weed_name": null
}`,
        },
        {
          role: "user",
          content: [
            { type:"image_url", image_url:{ url:`data:image/jpeg;base64,${base64Image}` } },
            { type:"text", text:`Analyse this crop image. Farmer is in ${region}, Nigeria. Respond in ${langName}.` },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const e = await res.json();
    throw new Error(e.error?.message ?? "Analysis failed");
  }
  const data = await res.json();
  const raw  = data.choices[0].message.content;
  return parseJSON(raw) ?? { is_healthy:true, diagnosis:"Could not analyse", confidence:0 };
}

// ── 7. Weather Forecast ──────────────────────────────────────────────

export async function getWeatherForecast(lat, lon) {
  const res = await fetch(
    `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${WEATHER_KEY}&units=metric&cnt=56`
  );
  if (!res.ok) throw new Error("Weather API error");
  return res.json();
}
