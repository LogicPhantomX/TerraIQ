// ─── Drop this into Scanner.jsx replacing the scanPlant function ──────
// Key improvements:
// 1. AI now defaults to finding issues, not declaring healthy
// 2. Weeds are told to be removed unless they have a purpose
// 3. Response is cached by image hash to save data
// 4. Groq prompt has full plant knowledge context

const SCAN_CACHE = new Map(); // in-memory cache per session

function hashBase64(str) {
  // Quick hash for cache key — first 100 + last 100 chars
  return str.slice(0,100) + str.slice(-100);
}

async function scanPlant(base64, region, lang, corrections) {
  const GROQ_KEY  = import.meta.env.VITE_GROQ_KEY;
  const langName  = { en:"English", yo:"Yoruba", ha:"Hausa", ig:"Igbo" }[lang] ?? "English";
  const langInstr = {
    en:"Respond in clear, simple English suitable for a Nigerian farmer.",
    yo:"Dahun ni ede Yoruba. Je ki ede naa rọrun fun agbẹ.",
    ha:"Amsa cikin harshen Hausa tare da cikakken bayani.",
    ig:"Zaghachi n'asụsụ Igbo nke ọma.",
  }[lang] ?? "Respond in English.";

  // ── Cache check — avoid re-analysing same image twice ─────────────
  const cacheKey = hashBase64(base64);
  if (SCAN_CACHE.has(cacheKey)) {
    return SCAN_CACHE.get(cacheKey);
  }

  // ── Community corrections block ───────────────────────────────────
  const correctionBlock = corrections.length > 0
    ? `COMMUNITY CORRECTIONS — DO NOT MAKE THESE MISTAKES:\n${corrections.map(c =>
        `• NEVER call "${c.wrong_id}" — it is "${c.correct_id}". ${c.visual_clue ?? ""}`
      ).join("\n")}\n\n`
    : "";

  const system = `You are TerraIQ+, a precise plant scientist and agronomist for Nigerian farmers.
LANGUAGE: ${langInstr}. ALL advice text in ${langName}. Scientific names stay in Latin.

${correctionBlock}

PLANT KNOWLEDGE — you know ALL plant types:
Crops: maize, rice, cassava, yam, tomato, pepper, okra, ewedu (Corchorus olitorius), tete/amaranthus (Amaranthus hybridus), ugu/fluted pumpkin (Telfairia occidentalis), bitter leaf (Vernonia amygdalina), waterleaf (Talinum triangulare), cowpea, groundnut, plantain, banana, watermelon, pineapple, pawpaw, mango, orange, soybean, cocoa, palm oil, cotton, ginger, sesame, cabbage, onion, carrot, cucumber, garden egg, sweet potato, cocoyam, irish potato, sorghum, millet

Weeds: siam weed (Chromolaena odorata), spear grass (Imperata cylindrica), striga/witchweed (Striga hermonthica), tridax daisy (Tridax procumbens), water hyacinth (Eichhornia crassipes), goat weed (Ageratum conyzoides), crabgrass (Digitaria sanguinalis), sedge (Cyperus rotundus), pigweed (Amaranthus spinosus — note: different from edible amaranthus), black nightshade (Solanum nigrum), mimosa/sensitive plant (Mimosa pudica)

Trees: neem/dongoyaro (Azadirachta indica — compound pinnate leaves with many small serrated leaflets — NOT cashew), moringa (Moringa oleifera — compound leaves, small oval leaflets), mango, cashew (smooth oval leaves), palm, cocoa, pawpaw, orange, guava, breadfruit, locust bean (Parkia biglobosa), iroko, teak, bamboo

CRITICAL IDENTIFICATION RULES:
1. Neem/Dongoyaro has COMPOUND leaves — many small leaflets on one stem. Cashew has SINGLE smooth oval leaves. NEVER confuse them.
2. Edible amaranthus (Tete) is a vegetable. Pigweed (Amaranthus spinosus) is a spiny weed. They look similar but spinosus has thorns.
3. If you see spear grass, striga, siam weed, or crabgrass — these are harmful weeds. Say so clearly.
4. Ewedu has small heart-shaped serrated leaves. It is a vegetable, not a weed.
5. If a plant is unfamiliar, describe what you see accurately. Do not force a food crop identification.

DISEASE/HEALTH ASSESSMENT — BE HONEST AND CRITICAL:
- Look carefully for: leaf spots, yellowing, wilting, lesions, powdery coating, rust, blight, holes from insects, abnormal growth, stunting
- If you see ANY of these signs, do NOT say healthy. Identify the issue.
- Most farm plants have some form of stress. Only say "healthy" if the plant is genuinely vigorous with no visible issues.
- Mild stress should be reported as low severity — not ignored.

WEED RULE:
If the plant is a weed with no agricultural value — say to remove it immediately.
If the weed has a value (e.g. Chromolaena can be used as mulch, some weeds are medicinal), mention that value briefly but still advise on managing it.

Respond ONLY with valid JSON. No markdown. No backticks.
{
  "not_a_plant": false,
  "plant_type": "crop / weed / tree / grass / unknown",
  "crop_identified": "name + local name e.g. Neem (Dongoyaro)",
  "scientific_name": "scientific name",
  "identification_confidence": 85,
  "identification_notes": "what visual features you used",
  "is_weed": false,
  "weed_action": null,
  "is_healthy": false,
  "diagnosis": "specific issue name in ${langName} — be precise",
  "confidence": 85,
  "severity": "low / moderate / high / critical",
  "severity_explanation": "in ${langName}",
  "immediate_action": "in ${langName}",
  "steps": ["step in ${langName}", "step", "step"],
  "local_products": [{"name":"product","price_naira":4500,"where":"where to buy in Nigeria"}],
  "organic_option": "in ${langName}",
  "prevention": "in ${langName}"
}

For weed_action: if is_weed is true, write "REMOVE IMMEDIATELY — [reason why it harms crops] in ${langName}" OR if it has a use, write "MANAGE — [it harms crops but can be used as mulch/medicine etc] in ${langName}"`;

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method:"POST",
    headers:{ "Content-Type":"application/json", "Authorization":`Bearer ${GROQ_KEY}` },
    body: JSON.stringify({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      max_tokens: 1100,
      messages:[
        { role:"system", content:system },
        { role:"user", content:[
          { type:"image_url", image_url:{ url:`data:image/jpeg;base64,${base64}` } },
          { type:"text", text:`Identify this plant carefully. Farmer is in ${region}, Nigeria. Check for any disease, pest, or stress carefully — do not default to healthy. Language: ${langName}.` },
        ]},
      ],
    }),
  });

  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error?.message ?? "Scan failed. Please try again.");
  }

  const data   = await res.json();
  const raw    = data.choices[0].message.content;
  const parsed = JSON.parse(raw.replace(/```json|```/g,"").trim());

  // Cache result for this session
  SCAN_CACHE.set(cacheKey, parsed);

  return parsed;
}

export { scanPlant };
