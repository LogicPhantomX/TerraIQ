// ─── Soil Parameter Classification ────────────────────────────────────
// Based on IITA, FMANR Nigeria, and West African agronomic lab standards
// Reference: IITA Soil Fertility Guidelines for West Africa (2023)
//            Nigeria Federal Ministry of Agriculture soil testing standards

// ── Total Nitrogen (%) — converted from lab report ──────────────────
// Nigerian soils critical level: 0.15% Total N
// Converted to available N equivalent for classification
export function classifyNitrogen(value) {
  const v = +value;
  // Accepts both % (0.05–0.5) and mg/kg (5–500) formats
  const norm = v > 3 ? v : v * 1000; // convert % to mg/kg if needed
  if (norm < 50)        return { level:"critically_low", label:"Critically Low", score:1, advice:"< 50 mg/kg — Severe N deficiency. Yellowing (chlorosis) from oldest leaves. Apply urea (46-0-0) at 60 kg/ha immediately. Organic: 5+ tonnes/ha cow dung or compost." };
  if (norm < 100)       return { level:"low",            label:"Low",            score:2, advice:"50–100 mg/kg — Below critical threshold. Apply NPK 15-15-15 at 200 kg/ha or urea at 45 kg/ha before planting." };
  if (norm <= 200)      return { level:"sufficient",     label:"Sufficient",     score:4, advice:"100–200 mg/kg — Adequate for most Nigerian crops including maize, cassava, yam, and vegetables." };
  if (norm <= 400)      return { level:"high",           label:"High",           score:3, advice:"200–400 mg/kg — Elevated. Reduce N application by 30%. Risk of excessive vegetative growth and lodging." };
  return                { level:"too_high",              label:"Too High",       score:2, advice:"> 400 mg/kg — Excess N. Do NOT apply more nitrogen. Risk of crop burn and groundwater pollution." };
}

// ── Available Phosphorus (mg/kg Bray-1 or Olsen) ─────────────────────
// Nigeria critical level: 10 mg/kg (Bray), 7 mg/kg (Olsen)
// IITA standard ranges for West African soils
export function classifyPhosphorus(value) {
  const v = +value;
  if (v < 5)            return { level:"critically_low", label:"Critically Low", score:1, advice:"< 5 mg/kg — Severe P deficiency. Poor root development, purple-red coloring. Apply SSP (18% P₂O₅) at 250 kg/ha or TSP at 150 kg/ha." };
  if (v < 12)           return { level:"low",            label:"Low",            score:2, advice:"5–12 mg/kg — Below critical level. Apply DAP (18-46-0) at 100 kg/ha. Rock phosphate at 300 kg/ha as organic option." };
  if (v <= 25)          return { level:"sufficient",     label:"Sufficient",     score:4, advice:"12–25 mg/kg — Optimal range for West African soils. Supports good root development and fruit set." };
  if (v <= 50)          return { level:"high",           label:"High",           score:3, advice:"25–50 mg/kg — Elevated. Reduce P input. May cause Zn and Fe deficiency by antagonism." };
  return                { level:"too_high",              label:"Too High",       score:2, advice:"> 50 mg/kg — Excess P. No P fertilizer needed. Can block uptake of zinc, iron, and copper." };
}

// ── Exchangeable Potassium (mg/kg or cmol/kg) ─────────────────────────
// Nigeria critical level: 0.15 cmol/kg = ~58 mg/kg
// Optimal range: 0.2–0.4 cmol/kg = 78–156 mg/kg
export function classifyPotassium(value) {
  const v = +value;
  // Accepts mg/kg; if value looks like cmol/kg (< 3), convert
  const norm = v < 3 ? v * 391 : v; // 1 cmol/kg K = 391 mg/kg
  if (norm < 58)        return { level:"critically_low", label:"Critically Low", score:1, advice:"< 58 mg/kg — Severe K deficiency. Leaf scorch (brown edges/tips), weak stems, disease-prone. Apply MOP (60% K₂O) at 100 kg/ha or SOP." };
  if (norm < 117)       return { level:"low",            label:"Low",            score:2, advice:"58–117 mg/kg — Below critical. Apply NPK 15-15-15 or muriate of potash (MOP). Organic: wood ash at 2 tonnes/ha." };
  if (norm <= 235)      return { level:"sufficient",     label:"Sufficient",     score:4, advice:"117–235 mg/kg — Good K level. Strong stems, good disease resistance, improved drought tolerance." };
  if (norm <= 391)      return { level:"high",           label:"High",           score:3, advice:"235–391 mg/kg — Elevated K. Reduce K fertilizer. Can cause Mg and Ca deficiency (antagonism)." };
  return                { level:"too_high",              label:"Too High",       score:2, advice:"> 391 mg/kg — Excess K. Antagonises calcium and magnesium. No K fertilizer. Leach with heavy irrigation if possible." };
}

// ── Soil pH (1:2.5 water suspension) ─────────────────────────────────
// Optimal for Nigerian crops: 5.8–6.8
// Most nutrients maximally available at 6.0–6.5
export function classifyPH(value) {
  const v = +value;
  if (v < 4.5)          return { level:"too_acidic",        label:"Strongly Acidic",  score:1, advice:"pH < 4.5 — Highly acidic. Al³⁺ and Mn²⁺ toxicity. Most nutrients unavailable. Apply agricultural lime at 3–5 tonnes/ha. Wait 6 weeks before planting." };
  if (v < 5.5)          return { level:"acidic",            label:"Moderately Acidic",score:2, advice:"pH 4.5–5.5 — Acidic. P, Ca, Mg, Mo availability limited. Apply dolomitic limestone at 1.5–3 tonnes/ha. Add organic matter." };
  if (v < 5.8)          return { level:"slightly_acidic",   label:"Slightly Acidic",  score:3, advice:"pH 5.5–5.8 — Slightly below optimal. Apply 0.5–1 tonne/ha agricultural lime. Suitable for acid-tolerant crops (cassava, sweet potato, pineapple)." };
  if (v <= 6.8)         return { level:"optimal",           label:"Optimal",          score:4, advice:"pH 5.8–6.8 — Ideal for Nigerian crops. Maximum nutrient availability. Maintain with lime as needed." };
  if (v <= 7.5)         return { level:"slightly_alkaline", label:"Slightly Alkaline",score:3, advice:"pH 6.8–7.5 — Slightly alkaline. Minor Fe, Mn, Zn availability issues. Add organic matter. Suitable for beans, maize." };
  if (v <= 8.5)         return { level:"alkaline",          label:"Alkaline",         score:2, advice:"pH 7.5–8.5 — Alkaline. Fe, Mn, Zn, Cu, B all deficient. Apply sulphur at 200–500 kg/ha. Add compost heavily." };
  return                { level:"too_alkaline",             label:"Strongly Alkaline",score:1, advice:"pH > 8.5 — Highly alkaline. Severe micronutrient unavailability. Apply elemental sulphur + gypsum. Specialist intervention needed." };
}

// ── Organic Carbon % (Walkley-Black or LOI method) ────────────────────
// IITA critical level for West African soils: 1.0% OC
// Below 0.5% = severely degraded soil
export function classifyOrganicCarbon(value) {
  const v = +value;
  if (!v || v === 0)    return null;
  if (v < 0.3)          return { level:"critically_low", label:"Critically Low", score:1, advice:"< 0.3% OC — Severely degraded soil. No biological activity. Apply 10+ tonnes/ha compost. Plant cover crops urgently. Soil cannot support crops without amendment." };
  if (v < 0.8)          return { level:"low",            label:"Low",            score:2, advice:"0.3–0.8% OC — Poor organic matter. Weak soil structure, poor water retention. Apply 4–6 tonnes/ha compost or farmyard manure annually." };
  if (v < 1.5)          return { level:"moderate",       label:"Moderate",       score:3, advice:"0.8–1.5% OC — Moderate. Improving but still below IITA optimal for West Africa (1.5%). Continue compost applications at 2–3 tonnes/ha." };
  if (v <= 2.5)         return { level:"good",           label:"Good",           score:4, advice:"1.5–2.5% OC — Good organic matter level. Good soil structure and biological activity. Maintain with annual compost." };
  if (v <= 4.0)         return { level:"high",           label:"High",           score:4, advice:"2.5–4.0% OC — Excellent. High biological activity, good water retention and nutrient cycling. Maintain current practices." };
  return                { level:"very_high",             label:"Very High",      score:4, advice:"> 4.0% OC — Very high organic carbon. Excellent soil health. Typical of virgin forest soils. Maintain carefully." };
}

// ── Soil Moisture % (gravimetric or volumetric) ───────────────────────
export function classifyMoisture(value) {
  const v = +value;
  if (v < 10)           return { level:"critically_dry", label:"Critically Dry", score:1, advice:"< 10% — Bone dry. Permanent wilting point reached. Urgent irrigation: 50–80mm water. Do NOT plant." };
  if (v < 25)           return { level:"dry",            label:"Dry",            score:2, advice:"10–25% — Below field capacity. Irrigation needed (25–40mm). Germination will be poor without water." };
  if (v <= 55)          return { level:"adequate",       label:"Adequate",       score:4, advice:"25–55% — Field capacity range. Good growing conditions. Maintain with 15–20mm irrigation every 5–7 days in dry season." };
  if (v <= 70)          return { level:"wet",            label:"Wet",            score:3, advice:"55–70% — Above field capacity. Drainage needed. Risk of root rot, fungal diseases (Pythium, Phytophthora). Avoid heavy irrigation." };
  return                { level:"waterlogged",           label:"Waterlogged",    score:1, advice:"> 70% — Saturated/waterlogged. Severe O₂ depletion at roots. Immediate drainage: raised beds, drainage channels. Crops will die without action." };
}

// ── Cation Exchange Capacity (cmol/kg) — optional ─────────────────────
export function classifyCEC(value) {
  const v = +value;
  if (v < 5)            return { level:"very_low",  label:"Very Low CEC",  score:1, advice:"< 5 cmol/kg — Very sandy, low retention capacity. Nutrients leach rapidly. Heavy organic matter amendments essential." };
  if (v < 12)           return { level:"low",       label:"Low CEC",       score:2, advice:"5–12 cmol/kg — Low nutrient retention. Split fertilizer applications (3–4 times per season). Add compost to increase CEC." };
  if (v <= 25)          return { level:"medium",    label:"Medium CEC",    score:3, advice:"12–25 cmol/kg — Moderate. Typical for loamy Nigerian soils. Good balance of drainage and retention." };
  return                { level:"high",             label:"High CEC",      score:4, advice:"> 25 cmol/kg — High clay content. Good nutrient retention. May need drainage improvement." };
}

// ── Overall soil score ─────────────────────────────────────────────────
export function overallSoilRating(classifications) {
  const scores = Object.values(classifications).filter(Boolean).map(c => c.score);
  if (!scores.length) return "fair";
  const avg = scores.reduce((a,b) => a+b, 0) / scores.length;
  // Any critically_low parameter prevents excellent/good rating
  const hasCritical = Object.values(classifications).filter(Boolean)
    .some(c => c.level === "critically_low" || c.level === "too_acidic" || 
               c.level === "too_alkaline" || c.level === "waterlogged" ||
               c.level === "critically_dry" || c.level === "too_high");
  if (hasCritical) return avg >= 2.5 ? "fair" : "poor";
  if (avg >= 3.8) return "excellent";
  if (avg >= 3.0) return "good";
  if (avg >= 2.0) return "fair";
  return "poor";
}

// ── IITA Optimal ranges reference ─────────────────────────────────────
export const OPTIMAL_RANGES = {
  nitrogen:       { min:100,  max:200,  unit:"mg/kg", label:"Total N",           method:"Kjeldahl / Colorimetric" },
  phosphorus:     { min:12,   max:25,   unit:"mg/kg", label:"Available P",       method:"Bray-1 or Olsen" },
  potassium:      { min:117,  max:235,  unit:"mg/kg", label:"Exchangeable K",    method:"Ammonium acetate extraction" },
  ph:             { min:5.8,  max:6.8,  unit:"",      label:"Soil pH",           method:"1:2.5 water suspension" },
  organic_carbon: { min:1.5,  max:2.5,  unit:"%",     label:"Organic Carbon",    method:"Walkley-Black / LOI" },
  moisture:       { min:25,   max:55,   unit:"%",     label:"Moisture Content",  method:"Gravimetric" },
};

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
    .map(([key, cls]) => {
      const opt = OPTIMAL_RANGES[key];
      return `${key.toUpperCase()} (${opt?.method ?? ""}): ${cls.label} (${cls.level})\n  Your value: ${params[key]}${opt?.unit ?? ""} | Optimal: ${opt?.min}–${opt?.max}${opt?.unit ?? ""}\n  Action: ${cls.advice}`;
    })
    .join("\n\n");

  return { classifications, rating, summary };
}
