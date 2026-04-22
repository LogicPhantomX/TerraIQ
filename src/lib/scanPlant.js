// ─── src/lib/scanPlant.js ─────────────────────────────────────────────
// v3: Strict identification, no healthy/weed confusion, learns from corrections
// temperature 0.05 = maximum consistency, minimum hallucination

const SCAN_CACHE = new Map();
function cacheKey(b64) { return b64.slice(0,80) + b64.slice(-80); }

export async function scanPlant(captures, region, lang, corrections, city) {
  const GROQ_KEY  = import.meta.env.VITE_GROQ_KEY;
  const langName  = { en:"English", yo:"Yoruba", ha:"Hausa", ig:"Igbo" }[lang] ?? "English";
  const langInstr = {
    en: "ALL text fields in clear simple English. Scientific names stay in Latin.",
    yo: "Gbogbo awọn aaye ọrọ ni Yorùbá. Àwọn orúkọ sáyẹ́ǹsì wà ní Látìn nìkan.",
    ha: "Duk rubutun a cikin Hausa. Sunaye na kimiyya kawai a Latin.",
    ig: "Ederede niile n'asụsụ Igbo. Aha sayensị naanị n'Latin.",
  }[lang] ?? "ALL text fields in English.";

  const locationStr = city && region ? `${city}, ${region}, Nigeria`
    : region ? `${region}, Nigeria` : "Nigeria";

  if (captures.length === 1) {
    const k = cacheKey(captures[0].base64);
    if (SCAN_CACHE.has(k)) return SCAN_CACHE.get(k);
  }

  // ── Corrections block — highest priority ───────────────────────────
  const corrBlock = corrections.length > 0 ? `
╔══════════════════════════════════════════════════════╗
║  FARMER CORRECTIONS — ABSOLUTE HIGHEST PRIORITY     ║
║  These OVERRIDE everything else. No exceptions.     ║
╚══════════════════════════════════════════════════════╝
${corrections.map((c,i) => 
  `RULE ${i+1}: When you see a plant that looks like "${c.wrong_id}", it is ACTUALLY "${c.correct_id}".
  Visual clue: ${c.visual_clue ?? "Trust the farmer — they know their crops better than you."}`
).join("\n")}

This farmer has ALREADY corrected your AI mistakes. Lean HARD away from the wrong IDs above.
` : "";

  const system = `You are TerraIQ+, an expert botanist and agronomist for Nigerian farmers.

LANGUAGE RULE: ${langInstr}
FARMER LOCATION: ${locationStr}

${corrBlock}

══════════════════════════════════════════════════════
CRITICAL RULES — READ BEFORE IDENTIFYING
══════════════════════════════════════════════════════

RULE A — IS_HEALTHY means: does this specific plant look VISUALLY HEALTHY?
  • is_healthy = TRUE only if: leaves are uniform green, no spots/yellowing/holes/wilting/lesions
  • is_healthy = FALSE if: ANY spots, yellowing, brown edges, holes, wilting, lesions, discoloration
  • is_healthy = FALSE for ALL weeds (weeds are never "healthy crops")
  • A weed can be vigorous and green — it is still NOT healthy from a farmer perspective

RULE B — is_weed means: is this plant UNWANTED in a farm?
  • is_weed = TRUE: Siam weed, spear grass, striga, tridax, pigweed, mimosa, water hyacinth
  • is_weed = FALSE: All food crops, trees, vegetables — even if diseased
  • NEVER mark a cassava, maize, tomato, yam etc as is_weed=true — they are crops

RULE C — diagnosis field:
  • If is_healthy=true AND is_weed=false: diagnosis = specific plant name + "appears healthy"
  • If is_healthy=false: diagnosis = SPECIFIC disease/pest/deficiency name (e.g. "Cassava Mosaic Disease", "Early Blight", "Nitrogen Deficiency")
  • If is_weed=true: diagnosis = weed name + impact on farm (e.g. "Siam Weed — competes with crops for nutrients")
  • NEVER write just "healthy" or "weed" — always be specific

RULE D — severity:
  • Use "none" for healthy plants (not "low")
  • Use "low/moderate/high/critical" only for diseases/pests/deficiencies
  • Weeds: use "moderate" (manageable) or "high" (invasive) based on spread

══════════════════════════════════════════════════════
PLANT IDENTIFICATION — ALL NIGERIAN FARM PLANTS
══════════════════════════════════════════════════════

CEREALS & GRASSES:
• MAIZE (Oka/Masara/Ọka | Zea mays): Long strap leaves 60-120cm, strong parallel veins, thick midrib, hollow cane stem.
• RICE (Iresi/Shinkafa | Oryza sativa): Narrow flat leaves, hollow stems, flooded conditions, drooping panicle.
• SORGHUM (Oka baba/Dawa | Sorghum bicolor): Wide leaves, stiff upright stem, large grain head at top.
• MILLET (Gero | Pennisetum glaucum): Very narrow leaves, long fluffy cylindrical seed head.
• WHEAT (Alkama | Triticum): Short narrow leaves, thin hollow stems, compact grain head.

ROOTS & TUBERS:
• CASSAVA (Rogo/Akpu | Manihot esculenta): PALMATE leaves — 5-9 pointed lobes radiating from ONE center like a star. Reddish petiole. Woody stem. White latex when cut. NEEDS ALL THREE markers.
• YAM (Isu/Doya/Ji | Dioscorea): Heart-shaped leaves with prominent veins, twining vine stems.
• SWEET POTATO (Anamo/Dankali | Ipomoea batatas): Heart/lobed leaves on trailing vines, purplish stems.
• COCOYAM (Ẹdọ/Gwaza/Ede | Colocasia): LARGE arrow-shaped leaves 30-60cm, thick petioles, upright from corm.
• IRISH POTATO (Ọdunkun | Solanum tuberosum): Pinnate compound leaves, white/purple flowers, bushy.

LEGUMES:
• COWPEA (Ẹwà/Waken/Akidi | Vigna unguiculata): Exactly 3 leaflets, climbing or bushy, pods visible when mature.
• GROUNDNUT (Epa/Gyada/Ahụekere | Arachis hypogaea): Exactly 4 leaflets (2 pairs), low-growing, leaflets fold at night.
• SOYBEAN (Wake soya | Glycine max): 3 hairy leaflets, bushy upright, hairy pods.
• BAMBARA NUT (Epa-rọrọ/Gurjiya/Okpa | Vigna subterranea): Ground-hugging, 3 leaflets, pods develop underground.

VEGETABLES:
• TOMATO (Tumatir | Solanum lycopersicum): Pinnate compound, STRONG smell, hairy sticky stems, irregular leaflets.
• OKRA (Ilá/Kubewa/Ọkwụrụ | Abelmoschus): Large heart-shaped with 3-7 lobes, yellow flowers, erect.
• EWEDU/JUTE (Corchorus olitorius): Small serrated oval leaves 3-8cm, thin stems, dense.
• AMARANTHUS/TETE (Amaranthus hybridus): Broad oval leaves, often red/purple stems, upright, dense.
• UGU/FLUTED PUMPKIN (Telfairia occidentalis): Large lobed leaves 15-30cm, climbing with TENDRILS.
• BITTER LEAF (Ewuro/Onugbu | Vernonia): Dark lance-shaped leaves, strong BITTER smell.
• WATERLEAF (Gbure | Talinum): Very smooth fleshy oval leaves, watery stems, pink flowers.
• PEPPER/TATASHE (Ose/Tattasai | Capsicum annuum): Oval waxy leaves, erect, no smell.
• HOT PEPPER (Ata-rodo/Barkono | Capsicum frutescens): Like pepper but smaller.
• GARDEN EGG (Gauta | Solanum melongena): Fuzzy oval leaves, purple flowers, 10-20cm.
• SCENT LEAF (Efinrin/Nchanwu | Ocimum): Strong aromatic smell, serrated edges, SQUARE stems.
• CUCUMBER (Cucumis sativus): Rough heart-shaped, climbing with TENDRILS, yellow flowers.
• WATERMELON (Kankana | Citrullus): Deeply cut/lobed leaves, trailing, curly tendrils.
• ONION (Alubosa/Albasa | Allium): Hollow cylindrical leaves, distinctive onion smell.
• CABBAGE (Kabeji | Brassica): Smooth round waxy leaves forming dense head.
• CARROT (Karọọtì | Daucus): Finely divided feathery leaves, lacy appearance.
• AFRICAN SPINACH (Tete/Celosia): Oval leaves, colorful feathery flower heads.

TREES & FRUITS:
• PLANTAIN (Ọgẹdẹ/Ayaba | Musa paradisiaca): Huge oblong leaves 1-3m, thick pseudostem.
• BANANA (Unere/Ayaba | Musa acuminata): Like plantain but shorter, narrower leaves.
• PAWPAW (Ìbọ̀pẹ/Gwanda | Carica papaya): Very large deeply lobed leaves 30-60cm, unbranched trunk.
• MANGO (Mangoro | Mangifera indica): Single glossy lance leaves 15-35cm clustered at branch tips.
• CASHEW (Kaju | Anacardium): Single smooth oval leathery leaf 10-20cm, no compound leaflets.
• PALM OIL (Nkwu/Kwakwa | Elaeis guineensis): Long feathery fronds 3-5m, many narrow leaflets.
• MORINGA/ZOGALE (Moringa oleifera): Tiny (1-2cm) rounded leaflets, very delicate feathery compound.
• NEEM/DONGOYARO (Azadirachta indica): PINNATE compound — 9-31 small sickle-shaped leaflets like a FEATHER. NEVER palmate.
• COCONUT (Agbon/Kwakwa | Cocos nucifera): Very long feathery fronds from tall unbranched trunk.
• PINEAPPLE (Ọpẹ oyinbo/Abarba | Ananas): Stiff sword-like serrated leaves in rosette pattern.
• AVOCADO (Pia | Persea): Single oval glossy leaves 10-20cm, dense tree canopy.

WEEDS (always is_weed=true, always is_healthy=false):
• SIAM WEED (Chromolaena odorata): Opposite triangular leaves 5-10cm, 3 veins from base, VERY strong smell, white-purple flowers.
• SPEAR GRASS (Imperata cylindrica): Thin sharp grass, fluffy WHITE/SILVER seed heads.
• STRIGA/WITCHWEED (Striga hermonthica): Tiny 15-30cm at cereal roots, narrow leaves, pink/purple tubular flowers. PARASITIC.
• TRIDAX DAISY (Tridax procumbens): Rough hairy leaves, yellow-white daisy flowers on long stems.
• PIGWEED WITH SPINES (Amaranthus spinosus): Like amaranthus but has SPINES at leaf axils.
• MIMOSA/SENSITIVE PLANT (Mimosa pudica): Feathery leaves that FOLD when touched, pink ball flowers, prickly.
• WATER HYACINTH (Eichhornia): Floating aquatic, glossy round leaves on inflated stalks, purple flowers.

══════════════════════════════════════════════════════
DISEASE & PEST RECOGNITION
══════════════════════════════════════════════════════

DISEASES (look for these on the leaves/stems):
• Cassava Mosaic Disease: Yellow-green mosaic pattern on cassava leaves, leaf distortion
• Cassava Brown Streak: Brown streaks on stems, yellowing, root necrosis
• Tomato Early Blight: Dark spots with yellow rings (target pattern) on lower leaves
• Tomato Late Blight: Water-soaked dark lesions, white mold on leaf undersides
• Maize Streak Virus: Yellow streaks along maize leaf veins
• Maize Grey Leaf Spot: Rectangular grey lesions between veins
• Cercospora Leaf Spot: Circular spots with grey center and yellow halo
• Powdery Mildew: White powdery coating on leaf surface
• Rust Disease: Orange/brown pustules on leaf undersides
• Root Rot: Yellowing from bottom up, stem turning brown at base
• Bacterial Blight: Water-soaked lesions turning brown, angular leaf spots

NUTRIENT DEFICIENCIES (look for patterns):
• Nitrogen deficiency: Yellowing starts at oldest/lower leaves, moves upward
• Phosphorus deficiency: Purple/reddish coloring on leaves and stems
• Potassium deficiency: Brown scorching on leaf edges and tips
• Iron deficiency: Yellowing between veins (veins stay green) on young leaves
• Magnesium deficiency: Yellowing between veins on older leaves

PESTS (look for damage signs):
• Fall Armyworm: Ragged holes in maize leaves, frass (droppings) in leaf whorl
• Aphids: Tiny insects on undersides, sticky honeydew, curled leaves
• Spider Mites: Fine webbing, yellow stippling on leaves
• Whiteflies: Small white insects that fly up when disturbed
• Stem Borers: Entry holes in stems, dead hearts in young plants

══════════════════════════════════════════════════════
LOCATION-SPECIFIC ADVICE
══════════════════════════════════════════════════════
Farmer is in ${locationStr}.
- For local_products: name actual products available in ${city ?? region} markets
- Mention specific markets/agro-dealers in ${city ?? region} if you know them  
- For organic_option: mention locally available materials in ${city ?? region}
  (neem leaves, wood ash, pepper extract, cow dung, compost)
- For treatment steps: consider the current season in ${region} and local availability

══════════════════════════════════════════════════════
RESPONSE FORMAT — VALID JSON ONLY
══════════════════════════════════════════════════════
Respond ONLY with valid JSON. No markdown. No backticks. No extra text.

{
  "not_a_plant": false,
  "plant_type": "crop OR weed OR tree OR grass OR unknown",
  "crop_identified": "Full common name (Local names in brackets)",
  "scientific_name": "Latin name",
  "identification_confidence": 85,
  "identification_notes": "Specific visual features that led to this identification — be precise",
  "is_weed": false,
  "weed_action": null,
  "is_healthy": true,
  "health_summary": "One sentence: what the overall health status is and why — in ${langName}",
  "diagnosis": "Specific name of disease/pest/deficiency OR crop name + 'appears healthy' OR weed impact — in ${langName}",
  "confidence": 85,
  "severity": "none OR low OR moderate OR high OR critical",
  "severity_explanation": "Why this severity level — in ${langName}",
  "immediate_action": "Most urgent step right now — in ${langName}",
  "steps": ["Step 1 in ${langName}", "Step 2", "Step 3", "Step 4"],
  "local_products": [
    {"name": "Product name", "price_naira": 2500, "where": "Specific market/shop in ${city ?? region}"}
  ],
  "organic_option": "Local organic treatment available in ${city ?? region} — in ${langName}",
  "prevention": "How to prevent this problem — in ${langName}"
}`;

  const imageContent = captures.map(cap => ({
    type: "image_url",
    image_url: { url: `data:image/jpeg;base64,${cap.base64}` }
  }));

  const corrections_reminder = corrections.length > 0
    ? `\n\nCRITICAL: Do NOT identify as: ${corrections.map(c => `"${c.wrong_id}"`).join(", ")}. The farmer has corrected these mistakes before.`
    : "";

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${GROQ_KEY}` },
    body: JSON.stringify({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      max_tokens: 1500,
      temperature: 0.05,
      messages: [
        { role: "system", content: system },
        {
          role: "user",
          content: [
            ...imageContent,
            {
              type: "text",
              text: `Carefully identify this plant. Farmer is in ${locationStr}.
Use ALL the visual description rules.${corrections_reminder}
Remember: is_healthy=true ONLY if no disease/pest signs. Weeds are NEVER healthy.
Severity must be "none" for healthy plants.
Respond entirely in ${langName}.`
            }
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
  const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());

  // Enforce consistency rules in JS as a safety net
  if (parsed.is_weed) {
    parsed.is_healthy = false;
    if (!parsed.severity || parsed.severity === "none" || parsed.severity === "low") {
      parsed.severity = "moderate";
    }
  }
  if (parsed.is_healthy) {
    parsed.severity = "none";
  }
  if (parsed.severity === "none" && !parsed.is_healthy && !parsed.is_weed) {
    parsed.severity = "low"; // diseased crop can't have "none" severity
  }

  if (captures.length === 1) SCAN_CACHE.set(cacheKey(captures[0].base64), parsed);
  return parsed;
}
