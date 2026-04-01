// ─── TerraIQ_WEB/src/lib/scanPlant.js ────────────────────────────────
// Now includes city + state in AI advice so recommendations are local
// e.g. "In Ogbomoso, you can find this product at Sabo market"

const SCAN_CACHE = new Map();
function cacheKey(b64) { return b64.slice(0,80) + b64.slice(-80); }

export async function scanPlant(captures, region, lang, corrections, city) {
  const GROQ_KEY  = import.meta.env.VITE_GROQ_KEY;
  const langName  = { en:"English", yo:"Yoruba", ha:"Hausa", ig:"Igbo" }[lang] ?? "English";
  const langInstr = {
    en:"Respond in clear, simple English.",
    yo:"Dahun ni ede Yoruba pẹlu gbogbo alaye.",
    ha:"Amsa cikin harshen Hausa.",
    ig:"Zaghachi n'asụsụ Igbo nke ọma.",
  }[lang] ?? "Respond in English.";

  // Build location string for AI advice
  const locationStr = city && region
    ? `${city}, ${region}, Nigeria`
    : region
    ? `${region}, Nigeria`
    : "Nigeria";

  if (captures.length === 1) {
    const k = cacheKey(captures[0].base64);
    if (SCAN_CACHE.has(k)) return SCAN_CACHE.get(k);
  }

  const corrBlock = corrections.length > 0
    ? `ACTIVE FARMER CORRECTIONS — OBEY THESE:\n${corrections.map(c =>
        `• "${c.wrong_id}" is WRONG when it is actually "${c.correct_id}". ${c.visual_clue ?? ""}`
      ).join("\n")}\n\n`
    : "";

  const system = `You are TerraIQ+, a precise plant scientist and agronomist for Nigerian farmers.
LANGUAGE: ${langInstr}. ALL advice text in ${langName}. Scientific names in Latin only.
FARMER LOCATION: ${locationStr}

${corrBlock}

══════════════════════════════════════════════════
EXACT VISUAL DESCRIPTIONS — READ BEFORE IDENTIFYING
══════════════════════════════════════════════════

CROPS:
• CASSAVA (Rogo/Akpu/Manihot esculenta): PALMATE leaves — 5 to 9 long pointed lobes spreading from ONE central point like a hand or star. Long petiole. Woody stems. Sometimes reddish stems. NOT compound pinnate. NOT neem. If you see star/hand = CASSAVA.
• MAIZE (Oka/Masara): Long strap leaves 60–120cm with parallel veins and strong midrib. Thick hollow cane stem.
• TOMATO: Pinnately compound leaves with irregular toothed leaflets. Strong smell. Hairy stems.
• OKRA (Ila/Kubewa): Large heart-shaped leaves with 3–7 pointed lobes. Erect stem. Yellow flowers.
• EWEDU/JUTE (Corchorus olitorius): Small heart/oval leaves 3–8cm, finely serrated edges. Dense growth. Thin stems.
• AMARANTHUS/TETE: Broad oval/diamond leaves 4–12cm. Often reddish stems. Grows tall.
• UGU/FLUTED PUMPKIN: Large lobed leaves 15–30cm on climbing vines with tendrils.
• BITTER LEAF (Ewuro/Onugbu): Lance-shaped leaves 6–15cm, dark green, strong bitter smell.
• WATERLEAF (Gbure): Succulent fleshy oval leaves, very smooth and shiny, soft watery stems.
• PEPPER/TATASHE: Oval smooth waxy leaves 5–10cm. Erect branching plant.
• GROUNDNUT (Epa/Gyada): PINNATE with exactly 2 pairs of oval leaflets (4 total). Low growing.
• COWPEA (Ewa/Wake): 3 leaflets (trifoliate). Climbing or bushy.
• SWEET POTATO: Heart-shaped or lobed leaves on trailing vines.
• COCOYAM (Ede): Large arrow-shaped leaves on long petioles. Grows from corm.

TREES:
• NEEM/DONGOYARO (Azadirachta indica): PINNATE compound leaf — many small (2–4cm) sickle-shaped serrated leaflets arranged alternately along a central rachis like a FEATHER. 9–31 leaflets per compound leaf. Grey furrowed bark. NEVER palmate. NEVER star-shaped.
• MORINGA/ZOGALE: Tiny (1–2cm) rounded leaflets on branching compound leaves. Very delicate.
• CASHEW (Kaju): SINGLE smooth leathery oval leaf 10–20cm, NO compound, no leaflets, no teeth.
• MANGO: Single lance-shaped glossy leaves 15–35cm, clustered at branch tips.
• PALM OIL (Nkwu): Long feathery fronds 3–5m with many narrow leaflets. Unmistakable.
• PAWPAW: Very large deeply lobed leaves 30–60cm across. Soft unbranched trunk.
• BANANA/PLANTAIN: Huge oblong leaves 1–3m. Thick pseudostem from overlapping leaf bases.

WEEDS:
• SIAM WEED (Chromolaena odorata): Opposite triangular/heart leaves 5–10cm with 3 veins from base. Strong smell.
• SPEAR GRASS (Imperata cylindrica): Thin grass 30–90cm with fluffy white/silver seed heads.
• STRIGA/WITCHWEED: Small plant 15–30cm, narrow leaves, pink/purple flowers at cereal crop base.
• TRIDAX DAISY: Rough hairy leaves 3–7cm, small yellow-white daisy flowers.
• PIGWEED (Amaranthus spinosus): Like amaranthus BUT has SPINES/THORNS at leaf axils. Edible amaranthus has NO spines.

KEY RULE: Star/hand leaf shape = CASSAVA. Feather compound leaf = NEEM. Never confuse them.

══════════════════════════════════════════════════
CITY-AWARE ADVICE
══════════════════════════════════════════════════
The farmer is in ${locationStr}.
For local_products: name products they can actually find in ${city ?? region}, Nigeria.
Mention specific local market names if you know them for ${city ?? region}.
For treatment steps: give advice relevant to the climate and season in ${region}, Nigeria.
For organic options: mention locally available materials in ${city ?? region} e.g. neem leaves, wood ash, pepper extract.

Respond ONLY with valid JSON. No markdown. No backticks.
{
  "not_a_plant": false,
  "plant_type": "crop / weed / tree / grass / unknown",
  "crop_identified": "name + local name",
  "scientific_name": "scientific name",
  "identification_confidence": 88,
  "identification_notes": "exact visual features used",
  "is_weed": false,
  "weed_action": null,
  "is_healthy": false,
  "diagnosis": "in ${langName}",
  "confidence": 88,
  "severity": "low / moderate / high / critical",
  "severity_explanation": "in ${langName}",
  "immediate_action": "in ${langName} — mention ${locationStr} context",
  "steps": ["step in ${langName}", "step", "step"],
  "local_products": [{"name":"product","price_naira":4500,"where":"specific market or shop in ${city ?? region}"}],
  "organic_option": "locally available organic treatment in ${langName} for ${city ?? region}",
  "prevention": "in ${langName}"
}`;

  const imageContent = captures.map(cap => ({
    type:"image_url",
    image_url:{ url:`data:image/jpeg;base64,${cap.base64}` }
  }));

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method:"POST",
    headers:{ "Content-Type":"application/json", "Authorization":`Bearer ${GROQ_KEY}` },
    body: JSON.stringify({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      max_tokens: 1300,
      messages:[
        { role:"system", content:system },
        { role:"user", content:[
          ...imageContent,
          { type:"text", text:`Identify this plant carefully. Farmer is in ${locationStr}. Read the visual descriptions — especially cassava vs neem distinction. Respond in ${langName}. Give city-specific product and market advice for ${locationStr}.` },
        ]},
      ],
    }),
  });

  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error?.message ?? "Scan failed. Try again.");
  }
  const data   = await res.json();
  const raw    = data.choices[0].message.content;
  const parsed = JSON.parse(raw.replace(/```json|```/g,"").trim());

  if (captures.length === 1) SCAN_CACHE.set(cacheKey(captures[0].base64), parsed);
  return parsed;
}