// ─── src/lib/scanPlant.js ─────────────────────────────────────────────
// Clean vision-first approach — minimal prompt, maximum accuracy.
// The Llama-4 Scout vision model is powerful enough to identify any plant
// correctly when you stop overloading it with text rules that fight its vision.

const SCAN_CACHE = new Map();
function cacheKey(b64) { return b64.slice(0, 80) + b64.slice(-80); }

export async function scanPlant(captures, region, lang, corrections, city) {
  const GROQ_KEY  = import.meta.env.VITE_GROQ_KEY;
  const langName  = { en:"English", yo:"Yoruba", ha:"Hausa", ig:"Igbo" }[lang] ?? "English";
  const langInstr = {
    en: "Respond in clear simple English.",
    yo: "Gbogbo awọn idahun ni Yoruba.",
    ha: "Duk amsa a cikin Hausa.",
    ig: "Zaghachi niile n'Igbo.",
  }[lang] ?? "Respond in English.";

  const locationStr = city && region ? `${city}, ${region}, Nigeria`
    : region ? `${region}, Nigeria` : "Nigeria";

  // Cache single-image scans
  if (captures.length === 1) {
    const k = cacheKey(captures[0].base64);
    if (SCAN_CACHE.has(k)) return SCAN_CACHE.get(k);
  }

  // Past corrections the farmer made — injected as a short note, not a wall of rules
  const corrNote = corrections.length > 0
    ? `\nNote: This farmer previously corrected these misidentifications — avoid them: ${corrections.map(c => `"${c.wrong_id}" should be "${c.correct_id}"`).join("; ")}.`
    : "";

  // ── SYSTEM PROMPT — short, clear, vision-first ────────────────────
  // The model's vision is the primary tool. We only tell it the OUTPUT FORMAT
  // and language. We do NOT describe crops — that fights the vision.
  const system = `You are an expert botanist and plant pathologist with encyclopaedic knowledge of all plants worldwide — crops, weeds, ornamentals, trees, wild plants, grasses, herbs, everything. You can identify any plant from a photo just like a top AI vision model would.

${langInstr}
The farmer is in ${locationStr}.${corrNote}

Look at the image carefully and identify EXACTLY what plant this is — do not guess based on location bias. Trust what you actually SEE in the image. A guava is a guava. A rose is a rose. An ornamental plant is an ornamental plant. Do not default to common farm crops if the visual evidence shows something else.

After identifying the plant, assess its health condition honestly:
- If the plant looks perfectly healthy: say so
- If you see disease symptoms, pests, or deficiencies: describe them specifically
- If it is a weed species: say it is a weed and what action to take

Respond ONLY with valid JSON. No markdown. No backticks. No extra text outside the JSON.

{
  "not_a_plant": false,
  "plant_type": "crop OR weed OR tree OR ornamental OR grass OR herb OR unknown",
  "crop_identified": "Exact common name of the plant",
  "scientific_name": "Latin binomial name",
  "identification_confidence": 90,
  "identification_notes": "What specific visual features in this image led to your identification",
  "is_weed": false,
  "weed_action": null,
  "is_healthy": true,
  "health_summary": "One sentence about overall health",
  "diagnosis": "Disease/pest/deficiency name OR plant name + 'appears healthy' OR weed impact",
  "confidence": 90,
  "severity": "none",
  "severity_explanation": "Why this severity",
  "immediate_action": "Most urgent single action the farmer must do TODAY — be very specific (e.g. 'Remove and burn all infected leaves immediately before 6pm to stop the disease from spreading to healthy plants')",
  "steps": [
    "Day 1 — Immediate: Specific urgent action with exact detail",
    "Day 2-3 — Containment: Follow-up step with exact quantities or method",
    "Days 4-7 — Treatment: First treatment application with dosage and how to apply it",
    "Week 2 — Monitoring: What signs to look for and how to check if treatment is working",
    "Week 3 — Second treatment: Repeat or adjusted treatment based on progress",
    "Ongoing — Prevention: Long-term management practice to keep the crop healthy"
  ],
  "local_products": [
    {"name": "Product name", "price_naira": 2000, "where": "Specific agro-dealer or market type in Nigeria", "how_to_use": "Exact dosage and application instructions"},
    {"name": "Alternative product", "price_naira": 1500, "where": "Where to find it", "how_to_use": "How and when to apply"}
  ],
  "organic_option": "Specific local organic or traditional remedy with exact preparation steps (e.g. 'Boil 10 neem leaves in 2L water for 20 minutes, cool, strain and spray on affected leaves every 2 days')",
  "prevention": "List 3-4 specific prevention measures: crop rotation advice, spacing, soil health, and early warning signs to watch for"
}

If the image does not contain a plant, set "not_a_plant": true and "message": "Ask the farmer to take a photo of a plant."
severity must be "none" for healthy plants, "low/moderate/high/critical" for problems.
is_healthy must be false for weeds regardless of how green they look.`;

  const imageContent = captures.map(cap => ({
    type: "image_url",
    image_url: {
      url: `data:image/jpeg;base64,${cap.base64}`,
      detail: "high"
    }
  }));

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${GROQ_KEY}`
    },
    body: JSON.stringify({
      model: "meta-llama/llama-4-maverick-17b-128e-instruct",
      max_tokens: 2000,
      temperature: 0.1,
      messages: [
        { role: "system", content: system },
        {
          role: "user",
          content: [
            ...imageContent,
            {
              type: "text",
              text: `Identify this plant. Farmer is in ${locationStr}. Look carefully at the actual visual features — leaf shape, texture, colour, structure. Identify exactly what you see, not what is most common in Nigeria. Give detailed step-by-step advice with at least 6 steps. Respond in ${langName}.`
            }
          ]
        }
      ]
    })
  });

  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    // If maverick model unavailable, fall back to scout
    if (res.status === 404 || res.status === 400) {
      return scanWithFallback(captures, system, locationStr, langName, GROQ_KEY);
    }
    throw new Error(e.error?.message ?? "Scan failed. Check your internet and try again.");
  }

  const data = await res.json();
  const raw  = data.choices[0].message.content;

  let parsed;
  try {
    parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
  } catch {
    // Sometimes the model wraps in text — extract JSON block
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      parsed = JSON.parse(match[0]);
    } else {
      throw new Error("Could not read scan result. Please try again.");
    }
  }

  // Safety net — enforce logical consistency
  if (parsed.is_weed) {
    parsed.is_healthy = false;
    if (!parsed.severity || parsed.severity === "none" || parsed.severity === "low") {
      parsed.severity = "moderate";
    }
  }
  if (parsed.is_healthy) parsed.severity = "none";
  if (parsed.severity === "none" && !parsed.is_healthy && !parsed.is_weed) {
    parsed.severity = "low";
  }

  if (captures.length === 1) SCAN_CACHE.set(cacheKey(captures[0].base64), parsed);
  return parsed;
}

// ── Fallback to scout model if maverick unavailable ───────────────────
async function scanWithFallback(captures, system, locationStr, langName, GROQ_KEY) {
  const imageContent = captures.map(cap => ({
    type: "image_url",
    image_url: { url: `data:image/jpeg;base64,${cap.base64}`, detail: "high" }
  }));

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${GROQ_KEY}` },
    body: JSON.stringify({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      max_tokens: 2000,
      temperature: 0.1,
      messages: [
        { role: "system", content: system },
        {
          role: "user",
          content: [
            ...imageContent,
            { type: "text", text: `Identify this plant. Farmer is in ${locationStr}. Give detailed 6-step treatment advice. Respond in ${langName}.` }
          ]
        }
      ]
    })
  });

  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error?.message ?? "Scan failed. Check your internet and try again.");
  }

  const data = await res.json();
  const raw  = data.choices[0].message.content;
  try {
    return JSON.parse(raw.replace(/```json|```/g, "").trim());
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error("Could not read scan result. Please try again.");
  }
}