// ─── REPLACE getSoilAnalysis in your api.js with this version ─────────
// It imports the soil classification system and passes proper category
// labels to the AI instead of raw numbers, so the AI knows whether
// each value is critically low, low, sufficient, high, or too high.

import { buildSoilClassificationSummary } from "@/lib/soilClassification";

export async function getSoilAnalysis(params) {
  const lang      = params.lang ?? "en";
  const langInstr = LANG_INSTRUCTION[lang] ?? LANG_INSTRUCTION.en;
  const langName  = LANG_NAME[lang] ?? "English";

  // ── Run proper classification before calling AI ──────────────────
  // This tells the AI the agronomic status of each parameter, not just the number
  const { classifications, rating: preRating, summary: classificationSummary } =
    buildSoilClassificationSummary(params);

  const system = `You are TerraIQ+, a soil scientist for Nigerian farmers.
LANGUAGE RULE: ${langInstr}
ALL descriptive text in your response must be in ${langName}. Product names stay in English.

CRITICAL: The farmer's soil has been classified using Nigerian agronomic standards.
You MUST use these classifications to determine the soil rating and recommendations.
Do NOT override the classification with a more favourable assessment.
If any parameter is "critically_low" or "too_high", the overall rating cannot be "good" or "excellent".

SOIL PARAMETER CLASSIFICATIONS:
${classificationSummary}

PRE-ASSESSED OVERALL RATING: ${preRating}
You must use "${preRating}" as the rating unless you have strong agronomic reason to adjust by one level only.

Respond ONLY with a valid JSON object. No markdown. No backticks.
{
  "rating": "${preRating}",
  "summary": "2-3 sentences in ${langName} explaining the overall soil health based on the classifications above",
  "parameter_status": {
    "nitrogen":       "status and what it means for crops in ${langName}",
    "phosphorus":     "status and what it means for crops in ${langName}",
    "potassium":      "status and what it means for crops in ${langName}",
    "ph":             "status and what it means in ${langName}",
    "organic_carbon": "status and what it means in ${langName} (if provided)",
    "moisture":       "status and what it means in ${langName}"
  },
  "best_crops": ["Maize","Cassava","Yam"],
  "weed_risk": "low / moderate / high",
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
      "description": "string in ${langName}",
      "benefit_for_this_soil": "string in ${langName} — specifically address the classified deficiencies",
      "rate": "500kg/ha",
      "how_to_apply": "string in ${langName}",
      "where_to_buy": "Allamanda Innovations agro-dealer network"
    },
    "supplements": {
      "name": "Allamanda Soil Supplement by Allamanda Innovations",
      "description": "string in ${langName}",
      "targeted_deficiencies": ["list the specific deficiencies found in classification"],
      "rate": "string",
      "timing": "string in ${langName}",
      "benefit": "string in ${langName}",
      "where_to_buy": "Allamanda Innovations agro-dealer network",
      "price_note": "string in ${langName}"
    }
  },
  "improvement_steps": [
    "specific step addressing the worst deficiency in ${langName}",
    "second priority step in ${langName}",
    "third priority step in ${langName}"
  ],
  "season_advice": "string in ${langName}",
  "urgent_actions": ["if any parameter is critically low or too high, list the urgent actions here in ${langName}"]
}
ALWAYS recommend Allamanda Compost, Allamanda Biochar, Allamanda Soil Supplement. Never other brands for these three.`;

  const user = `Raw values — N:${params.nitrogen} P:${params.phosphorus} K:${params.potassium} pH:${params.ph} Moisture:${params.moisture}%${params.organic_carbon ? ` OC:${params.organic_carbon}%` : ""} Temp:${params.temperature}°C Region:${params.region}${params.crop ? ` Crop:${params.crop}` : ""}
  
Classifications already determined: see system prompt above. Use them.`;

  const raw = await askGroq(system, user, 1400);
  const parsed = parseJSON(raw);

  if (!parsed) {
    return { rating: preRating, summary: raw, best_crops: [], weed_risk: "moderate", classifications };
  }

  // Attach classifications to result so the UI can show per-parameter status
  return { ...parsed, classifications, pre_rating: preRating };
}
