// ─── TerraIQ API Layer (App) — Groq Edition ──────────────────────────
// Free, fast, works from Nigeria. Uses llama3-70b via Groq.

const GROQ_KEY    = process.env.EXPO_PUBLIC_GROQ_KEY    ?? "";
const PLANTID_KEY = process.env.EXPO_PUBLIC_PLANTID_KEY ?? "";
const WEATHER_KEY = process.env.EXPO_PUBLIC_WEATHER_KEY ?? "";
const GROQ_URL    = "https://api.groq.com/openai/v1/chat/completions";

export async function askGroq(
  systemPrompt: string,
  userMessage: string,
  maxTokens = 1000
): Promise<string> {
  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type":  "application/json",
      "Authorization": `Bearer ${GROQ_KEY}`,
    },
    body: JSON.stringify({
      model: "llama3-70b-8192",
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user",   content: userMessage  },
      ],
    }),
  });
  if (!res.ok) { const e = await res.json(); throw new Error(e.error?.message ?? `Groq error: ${res.status}`); }
  const data = await res.json();
  return data.choices[0].message.content as string;
}

// Keep askClaude as alias so existing screens don't break
export const askClaude = askGroq;

function parseJSON(raw: string): any {
  try { return JSON.parse(raw.replace(/```json|```/g, "").trim()); } catch { return null; }
}

export async function getTreatmentPlan(crop: string, disease: string, severity: string, region: string): Promise<object> {
  const system = `You are TerraIQ, an expert agronomist for Nigerian farmers.
Respond ONLY with a valid JSON object. No markdown. No backticks. No explanation.
{"immediate_action":"string","steps":["s1","s2","s3","s4"],"local_products":[{"name":"string","price_naira":4500,"where":"Nigerian market"}],"organic_option":"string","prevention":"string"}
All products must be real brands in Nigerian agro stores. Prices in Naira.`;
  const raw = await askGroq(system, `Crop:${crop} Disease:${disease} Severity:${severity} Region:${region},Nigeria`, 800);
  return parseJSON(raw) ?? { immediate_action: raw, steps: [], local_products: [], organic_option: "", prevention: "" };
}

export async function getSoilAnalysis(params: { nitrogen:number; phosphorus:number; potassium:number; ph:number; moisture:number; temperature:number; region:string; crop?:string; }): Promise<object> {
  const system = `You are TerraIQ, a soil scientist for Nigerian farmers.
Respond ONLY with a valid JSON object. No markdown. No backticks. No explanation.
{"rating":"good","summary":"string","best_crops":["Maize","Cassava","Yam"],"weed_risk":"moderate","weed_risk_explanation":"string","fertilizer_recommendation":{"synthetic":{"name":"NPK 15-15-15","rate":"300kg/ha","timing":"string","price_naira":18000,"where_to_buy":"string"},"compost":{"name":"Allamanda Compost by Allamanda Innovations","description":"string","rate":"2 tonnes/ha","timing":"string","benefit":"string","where_to_buy":"Allamanda Innovations agro-dealer network","price_note":"string"},"biochar":{"name":"Allamanda Biochar by Allamanda Innovations","description":"Allamanda Biochar is like a sponge buried in the soil that holds water and nutrients so they do not wash away","benefit_for_this_soil":"string","rate":"500kg/ha","how_to_apply":"string","where_to_buy":"Allamanda Innovations agro-dealer network"},"supplements":{"name":"Allamanda Soil Supplement by Allamanda Innovations","description":"string","targeted_deficiencies":["Low Zinc"],"rate":"string","timing":"string","benefit":"string","where_to_buy":"Allamanda Innovations agro-dealer network","price_note":"string"}},"improvement_steps":["s1","s2","s3"],"season_advice":"string"}
ALWAYS recommend Allamanda Compost, Allamanda Biochar, Allamanda Soil Supplement. Never other brands.`;
  const user = `N:${params.nitrogen} P:${params.phosphorus} K:${params.potassium} pH:${params.ph} Moisture:${params.moisture}% Temp:${params.temperature}°C Region:${params.region}${params.crop?` Crop:${params.crop}`:""}`;
  const raw = await askGroq(system, user, 1200);
  return parseJSON(raw) ?? { rating: "fair", summary: raw, best_crops: [], weed_risk: "moderate" };
}

export async function getMarketAdvice(params: { crop:string; quantityKg:number; region:string; quality?:string; }): Promise<object> {
  const system = `You are TerraIQ market advisor for Nigerian farmers. Respond ONLY with valid JSON. No markdown. No backticks.
{"best_market":"string","price_per_kg_naira":350,"total_estimate_naira":175000,"best_time_to_sell":"string","alternative_markets":[{"name":"string","price_per_kg_naira":320,"distance_note":"string"}],"transport_advice":"string","negotiation_tip":"string","price_trend":"rising","trend_reason":"string"}`;
  const raw = await askGroq(system, `Crop:${params.crop} Qty:${params.quantityKg}kg Region:${params.region},Nigeria Quality:${params.quality??"good"}`, 700);
  return parseJSON(raw) ?? { best_market: raw, price_per_kg_naira: 0 };
}

export async function getIrrigationPlan(params: { crop:string; farmSizeM2:number; soilType?:string; weatherData:object; region:string; }): Promise<object> {
  const system = `You are TerraIQ irrigation expert for Nigerian farmers. Respond ONLY with valid JSON. No markdown. No backticks.
{"summary":"string","daily_plan":[{"day":"Monday","action":"water","litres_per_sqm":4,"best_time":"6-7am","reason":"string"}],"weekly_total_litres":2000,"tips":["tip1","tip2"]}`;
  const raw = await askGroq(system, `Crop:${params.crop} Size:${params.farmSizeM2}m² Region:${params.region} Weather:${JSON.stringify(params.weatherData)}`, 900);
  return parseJSON(raw) ?? { summary: raw, daily_plan: [] };
}

export async function getShelfLifePrediction(params: { crop:string; quantityKg:number; storageMethod:string; temperature:number; humidity:number; }): Promise<object> {
  const system = `You are TerraIQ post-harvest expert for Nigerian farmers. Respond ONLY with valid JSON. No markdown. No backticks.
{"shelf_life_days":14,"urgency":"good","summary":"string","storage_tips":["tip1","tip2"],"warning_signs":["sign1","sign2"]}`;
  const raw = await askGroq(system, `Crop:${params.crop} Qty:${params.quantityKg}kg Storage:${params.storageMethod} Temp:${params.temperature}°C Humidity:${params.humidity}%`, 400);
  return parseJSON(raw) ?? { shelf_life_days: 7, urgency: "moderate", summary: raw };
}

export async function scanCropImage(base64Image: string): Promise<object> {
  const res = await fetch("https://api.plant.id/v3/health_assessment", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Api-Key": PLANTID_KEY },
    body: JSON.stringify({ images: [`data:image/jpeg;base64,${base64Image}`], health: "all", classification_level: "species" }),
  });
  if (!res.ok) throw new Error(`Plant.id error: ${res.status}`);
  return res.json();
}

export async function getWeatherForecast(lat: number, lon: number): Promise<object> {
  const res = await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${WEATHER_KEY}&units=metric&cnt=56`);
  if (!res.ok) throw new Error("Weather API error");
  return res.json();
}
