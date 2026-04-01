// ─── Soil Parameter Classification ────────────────────────────────────
// Based on Nigerian/West African agronomic standards
// Each parameter is categorised into 4 levels before being sent to the AI
// This ensures the AI knows the actual status of each reading, not just the number

// ── Nitrogen (mg/kg) ──────────────────────────────────────────────────
// Nigerian soils: critical level ~0.15%, converted to mg/kg approx
export function classifyNitrogen(value) {
  const v = +value;
  if (v < 10)          return { level: "critically_low",  label: "Critically Low",  score: 1, advice: "Severe nitrogen deficiency. Crops will show yellowing and stunted growth. Urgent nitrogen application needed." };
  if (v < 20)          return { level: "low",             label: "Low",             score: 2, advice: "Below sufficient range. Apply nitrogen-based fertilizer before planting." };
  if (v <= 40)         return { level: "sufficient",      label: "Sufficient",      score: 4, advice: "Within the adequate range for most Nigerian crops." };
  if (v <= 60)         return { level: "high",            label: "High",            score: 3, advice: "Slightly elevated. Reduce nitrogen application. Monitor for excessive vegetative growth." };
  return               { level: "too_high",               label: "Too High",        score: 2, advice: "Excess nitrogen. Risk of burning crops and groundwater contamination. Do not add more nitrogen." };
}

// ── Phosphorus (mg/kg) ────────────────────────────────────────────────
// Critical level for West African soils: ~10 mg/kg (Bray method)
export function classifyPhosphorus(value) {
  const v = +value;
  if (v < 5)           return { level: "critically_low",  label: "Critically Low",  score: 1, advice: "Severe phosphorus deficiency. Root development will be poor. Apply superphosphate immediately." };
  if (v < 12)          return { level: "low",             label: "Low",             score: 2, advice: "Below critical level. Phosphorus application required for good root and fruit development." };
  if (v <= 30)         return { level: "sufficient",      label: "Sufficient",      score: 4, advice: "Good phosphorus level. Adequate for most crops." };
  if (v <= 60)         return { level: "high",            label: "High",            score: 3, advice: "Elevated phosphorus. Reduce P application. May cause zinc and iron deficiency." };
  return               { level: "too_high",               label: "Too High",        score: 2, advice: "Excess phosphorus. Can lock out micronutrients. Avoid any additional P fertilizer." };
}

// ── Potassium (mg/kg) ─────────────────────────────────────────────────
// Critical level for Nigerian soils: ~80 mg/kg
export function classifyPotassium(value) {
  const v = +value;
  if (v < 40)          return { level: "critically_low",  label: "Critically Low",  score: 1, advice: "Severe potassium deficiency. Crops will have weak stems and be highly disease-prone. Apply MOP or SOP immediately." };
  if (v < 80)          return { level: "low",             label: "Low",             score: 2, advice: "Below critical level. Apply potassium fertilizer before planting." };
  if (v <= 180)        return { level: "sufficient",      label: "Sufficient",      score: 4, advice: "Good potassium level. Supports strong stem and disease resistance." };
  if (v <= 300)        return { level: "high",            label: "High",            score: 3, advice: "Elevated potassium. Reduce K application. Can cause magnesium deficiency." };
  return               { level: "too_high",               label: "Too High",        score: 2, advice: "Excess potassium. Will antagonise calcium and magnesium uptake." };
}

// ── pH ────────────────────────────────────────────────────────────────
// Optimal for most Nigerian crops: 5.5–6.8
export function classifyPH(value) {
  const v = +value;
  if (v < 4.5)         return { level: "too_acidic",      label: "Strongly Acidic", score: 1, advice: "Highly acidic soil. Most nutrients are unavailable. Apply agricultural lime urgently — 2–4 tonnes/ha." };
  if (v < 5.5)         return { level: "acidic",          label: "Acidic",          score: 2, advice: "Below optimal range. Apply dolomitic lime at 1–2 tonnes/ha. Limits availability of phosphorus and molybdenum." };
  if (v <= 6.8)        return { level: "optimal",         label: "Optimal",         score: 4, advice: "Ideal pH range for most Nigerian crops. Nutrients are freely available." };
  if (v <= 7.5)        return { level: "slightly_alkaline",label: "Slightly Alkaline", score: 3, advice: "Slightly above optimal. Minor nutrient availability issues. Add organic matter to buffer pH." };
  return               { level: "too_alkaline",           label: "Strongly Alkaline", score: 1, advice: "Highly alkaline soil. Iron, manganese, zinc, copper and boron become unavailable. Requires sulphur application." };
}

// ── Organic Carbon (%) ────────────────────────────────────────────────
// Nigerian soils are often low in OC due to high temperatures
export function classifyOrganicCarbon(value) {
  const v = +value;
  if (!v || v === 0)   return null; // not provided
  if (v < 0.5)         return { level: "critically_low",  label: "Critically Low",  score: 1, advice: "Critically low organic carbon. Soil biology is severely depleted. Apply heavy compost — 5+ tonnes/ha." };
  if (v < 1.0)         return { level: "low",             label: "Low",             score: 2, advice: "Low organic carbon. Poor soil structure and water retention. Apply Allamanda Compost at 2–3 tonnes/ha." };
  if (v <= 2.5)        return { level: "moderate",        label: "Moderate",        score: 3, advice: "Moderate organic carbon. Good biological activity. Maintain with annual compost applications." };
  if (v <= 4.0)        return { level: "high",            label: "High",            score: 4, advice: "Good organic carbon level. Excellent soil health indicator." };
  return               { level: "very_high",              label: "Very High",       score: 4, advice: "Very high organic carbon. Excellent soil. Maintain current management practices." };
}

// ── Moisture (%) ──────────────────────────────────────────────────────
export function classifyMoisture(value) {
  const v = +value;
  if (v < 15)          return { level: "critically_dry",  label: "Critically Dry",  score: 1, advice: "Critically dry. Urgent irrigation needed. Do not plant until soil moisture is restored." };
  if (v < 30)          return { level: "dry",             label: "Dry",             score: 2, advice: "Below field capacity. Irrigation recommended before planting." };
  if (v <= 60)         return { level: "adequate",        label: "Adequate",        score: 4, advice: "Good soil moisture level. Suitable for planting and crop growth." };
  if (v <= 75)         return { level: "wet",             label: "Wet",             score: 3, advice: "High moisture. Improve drainage. Risk of root rot and fungal disease." };
  return               { level: "waterlogged",            label: "Waterlogged",     score: 1, advice: "Waterlogged. Severe drainage problem. Crops will suffer oxygen stress. Add raised beds or drainage channels." };
}

// ── Overall soil score ─────────────────────────────────────────────────
export function overallSoilRating(classifications) {
  const scores = Object.values(classifications).filter(Boolean).map(c => c.score);
  if (!scores.length) return "fair";
  const avg = scores.reduce((a,b) => a+b, 0) / scores.length;
  if (avg >= 3.8) return "excellent";
  if (avg >= 3.0) return "good";
  if (avg >= 2.0) return "fair";
  return "poor";
}

// ── Build classification summary for AI prompt ─────────────────────────
export function buildSoilClassificationSummary(params) {
  const classifications = {
    nitrogen:       classifyNitrogen(params.nitrogen),
    phosphorus:     classifyPhosphorus(params.phosphorus),
    potassium:      classifyPotassium(params.potassium),
    ph:             classifyPH(params.ph),
    organic_carbon: params.organic_carbon ? classifyOrganicCarbon(params.organic_carbon) : null,
    moisture:       classifyMoisture(params.moisture),
  };

  const rating = overallSoilRating(classifications);

  const summary = Object.entries(classifications)
    .filter(([,v]) => v !== null)
    .map(([key, cls]) => `${key.toUpperCase()}: ${cls.label} (${cls.level}) — ${cls.advice}`)
    .join("\n");

  return { classifications, rating, summary };
}
