// ─── Nigerian Crops Database ──────────────────────────────────────────
// Used in Signup, Onboarding, and injected into the scanner AI prompt
// so the model knows local names and can identify them correctly

export const NIGERIAN_CROPS = [
  // ── Cereals ────────────────────────────────────────────────────────
  { name:"Maize",         local:["Oka (Yoruba)", "Masara (Hausa)", "Ọka (Igbo)"],          scientific:"Zea mays",               category:"cereal"    },
  { name:"Rice",          local:["Iresi (Yoruba)", "Shinkafa (Hausa)", "Ọcha (Igbo)"],      scientific:"Oryza sativa",           category:"cereal"    },
  { name:"Sorghum",       local:["Oka baba (Yoruba)", "Dawa (Hausa)", "Ọka-oji (Igbo)"],   scientific:"Sorghum bicolor",        category:"cereal"    },
  { name:"Millet",        local:["Oka (Yoruba)", "Gero (Hausa)", "Ọka obara (Igbo)"],      scientific:"Pennisetum glaucum",     category:"cereal"    },

  // ── Roots & Tubers ─────────────────────────────────────────────────
  { name:"Cassava",       local:["Ẹgbẹ (Yoruba)", "Rogo (Hausa)", "Akpu/Oji-ọcha (Igbo)"],scientific:"Manihot esculenta",      category:"tuber"     },
  { name:"Yam",           local:["Isu (Yoruba)", "Doya (Hausa)", "Ji (Igbo)"],              scientific:"Dioscorea rotundata",    category:"tuber"     },
  { name:"Sweet Potato",  local:["Anamo (Yoruba)", "Dankali (Hausa)", "Ndụ ji (Igbo)"],    scientific:"Ipomoea batatas",        category:"tuber"     },
  { name:"Cocoyam",       local:["Ẹdọ (Yoruba)", "Gwaza (Hausa)", "Ede (Igbo)"],           scientific:"Colocasia esculenta",    category:"tuber"     },
  { name:"Irish Potato",  local:["Ọdunkun (Yoruba)", "Dankali na gona (Hausa)"],           scientific:"Solanum tuberosum",      category:"tuber"     },

  // ── Legumes ────────────────────────────────────────────────────────
  { name:"Cowpea",        local:["Ẹwà (Yoruba)", "Waken soja (Hausa)", "Akidi (Igbo)"],    scientific:"Vigna unguiculata",      category:"legume"    },
  { name:"Groundnut",     local:["Epa (Yoruba)", "Gyada (Hausa)", "Ahụekere (Igbo)"],      scientific:"Arachis hypogaea",       category:"legume"    },
  { name:"Soybean",       local:["Ẹwà soybean (Yoruba)", "Wake soya (Hausa)"],             scientific:"Glycine max",            category:"legume"    },
  { name:"Bambara Nut",   local:["Epa-rọrọ (Yoruba)", "Gurjiya (Hausa)", "Okpa (Igbo)"],  scientific:"Vigna subterranea",      category:"legume"    },

  // ── Vegetables — commonly grown ────────────────────────────────────
  { name:"Tomato",        local:["Tomati (Yoruba)", "Tumatir (Hausa)", "Tọmato (Igbo)"],   scientific:"Solanum lycopersicum",   category:"vegetable" },
  { name:"Pepper (Tatashe)", local:["Tatashe (Yoruba)", "Tattasai (Hausa)", "Ose (Igbo)"],scientific:"Capsicum annuum",        category:"vegetable" },
  { name:"Hot Pepper",    local:["Ata-rodo (Yoruba)", "Barkono (Hausa)", "Ose oyibo (Igbo)"],scientific:"Capsicum frutescens",  category:"vegetable" },
  { name:"Okra",          local:["Ilá (Yoruba)", "Kubewa (Hausa)", "Ọkwụrụ (Igbo)"],      scientific:"Abelmoschus esculentus", category:"vegetable" },
  { name:"Ewedu",         local:["Ewedu (Yoruba)", "Lalo (Hausa)", "Ahịhịa ewedu (Igbo)"],scientific:"Corchorus olitorius",    category:"vegetable" },
  { name:"Amaranthus",    local:["Tete (Yoruba)", "Alefo (Hausa)", "Inine (Igbo)"],        scientific:"Amaranthus hybridus",    category:"vegetable" },
  { name:"Waterleaf",     local:["Gbure (Yoruba)", "Mgbolodi (Igbo)"],                     scientific:"Talinum triangulare",    category:"vegetable" },
  { name:"Bitter Leaf",   local:["Ewuro (Yoruba)", "Onugbu (Igbo)", "Shakwa (Hausa)"],     scientific:"Vernonia amygdalina",    category:"vegetable" },
  { name:"Ugu (Fluted Pumpkin)", local:["Ẹgúsí leaves (Yoruba)", "Ugu (Igbo)"],           scientific:"Telfairia occidentalis", category:"vegetable" },
  { name:"African Spinach", local:["Efo soko (Yoruba)", "Inine (Igbo)"],                  scientific:"Celosia argentea",       category:"vegetable" },
  { name:"Scent Leaf",    local:["Efinrin (Yoruba)", "Nchanwu (Igbo)", "Daidoya (Hausa)"], scientific:"Ocimum gratissimum",     category:"vegetable" },
  { name:"African Eggplant", local:["Ẹgúsí (Yoruba)", "Afufa (Igbo)", "Gauta (Hausa)"],  scientific:"Solanum macrocarpon",    category:"vegetable" },
  { name:"Cucumber",      local:["Kukumba (Yoruba/Hausa/Igbo)"],                           scientific:"Cucumis sativus",        category:"vegetable" },
  { name:"Cabbage",       local:["Ẹfọ oyibo (Yoruba)", "Kabeji (Hausa/Igbo)"],           scientific:"Brassica oleracea",      category:"vegetable" },
  { name:"Onion",         local:["Alubosa (Yoruba)", "Albasa (Hausa)", "Yabasị (Igbo)"],  scientific:"Allium cepa",            category:"vegetable" },
  { name:"Garden Egg",    local:["Ẹgúsí pupa (Yoruba)", "Gauta (Hausa)", "Anara (Igbo)"],scientific:"Solanum melongena",      category:"vegetable" },
  { name:"Carrot",        local:["Karọọtì (Yoruba)", "Karas (Hausa)"],                    scientific:"Daucus carota",          category:"vegetable" },

  // ── Fruits ─────────────────────────────────────────────────────────
  { name:"Plantain",      local:["Ọgẹdẹ (Yoruba)", "Ayaba (Hausa)", "Ojoko (Igbo)"],     scientific:"Musa paradisiaca",       category:"fruit"     },
  { name:"Banana",        local:["Ọgẹdẹ wewe (Yoruba)", "Ayaba (Hausa)", "Unere (Igbo)"],scientific:"Musa acuminata",         category:"fruit"     },
  { name:"Watermelon",    local:["Bọọlù omi (Yoruba)", "Kankana (Hausa)", "Anyụ mmiri (Igbo)"],scientific:"Citrullus lanatus",category:"fruit"     },
  { name:"Pineapple",     local:["Ọpẹ oyinbo (Yoruba)", "Abarba (Hausa)", "Njeku (Igbo)"],scientific:"Ananas comosus",        category:"fruit"     },
  { name:"Mango",         local:["Mango (Yoruba/Hausa/Igbo)"],                            scientific:"Mangifera indica",       category:"fruit"     },
  { name:"Pawpaw",        local:["Ìbọ̀pẹ (Yoruba)", "Gwanda (Hausa)", "Okwụrụ mbeki (Igbo)"],scientific:"Carica papaya",     category:"fruit"     },
  { name:"Cashew",        local:["Kaju (Yoruba/Hausa/Igbo)"],                             scientific:"Anacardium occidentale", category:"fruit"     },
  { name:"Citrus/Orange", local:["Ọsanyin (Yoruba)", "Lemun (Hausa)", "Oroma (Igbo)"],   scientific:"Citrus sinensis",        category:"fruit"     },

  // ── Cash crops ─────────────────────────────────────────────────────
  { name:"Palm Oil Tree", local:["Ọpẹ (Yoruba)", "Kwakwa (Hausa)", "Nkwu (Igbo)"],       scientific:"Elaeis guineensis",      category:"cash_crop" },
  { name:"Cocoa",         local:["Koko (Yoruba/Hausa/Igbo)"],                             scientific:"Theobroma cacao",        category:"cash_crop" },
  { name:"Cotton",        local:["Owu (Yoruba)", "Auduga (Hausa)", "Owu (Igbo)"],         scientific:"Gossypium hirsutum",     category:"cash_crop" },
  { name:"Sesame",        local:["Ekuku (Yoruba)", "Ridi (Hausa)", "Ọjị ọkụ (Igbo)"],    scientific:"Sesamum indicum",        category:"cash_crop" },
  { name:"Ginger",        local:["Jinja (Yoruba)", "Citta (Hausa)", "Jinja (Igbo)"],      scientific:"Zingiber officinale",    category:"cash_crop" },

  // ── Trees and shrubs farmers scan ──────────────────────────────────
  { name:"Neem (Dongoyaro)", local:["Dongoyaro (Hausa/Yoruba)", "Igo (Igbo)"],            scientific:"Azadirachta indica",     category:"tree"      },
  { name:"Moringa",       local:["Ewé Igbálẹ (Yoruba)", "Zogale (Hausa)", "Odudu (Igbo)"],scientific:"Moringa oleifera",      category:"tree"      },
];

// ── For signup/onboarding crop picker ─────────────────────────────────
export const CROP_NAMES = NIGERIAN_CROPS.map(c => c.name);

// ── Build AI context string for scanner prompt ─────────────────────────
// Inject this into the scanner system prompt so Groq knows local names
export function buildCropContext() {
  return `
IMPORTANT — NIGERIAN CROP KNOWLEDGE:
You are operating in Nigeria. Many crops have local names different from English botanical names.
You MUST use this knowledge to identify crops correctly:

${NIGERIAN_CROPS.map(c =>
  `- ${c.name} (${c.scientific}): also called ${c.local.join(", ")}`
).join("\n")}

IDENTIFICATION RULES:
1. Neem tree (Azadirachta indica) is called Dongoyaro in Nigeria. It has pinnate compound leaves with serrated leaflets. It is NOT cashew.
2. Ewedu (Corchorus olitorius) has heart-shaped, serrated leaves. It is a very common Nigerian vegetable.
3. Bitter leaf (Vernonia amygdalina) has distinctive bitter-tasting dark green leaves.
4. Ugu/Fluted Pumpkin (Telfairia occidentalis) has large lobed leaves on climbing vines.
5. If you are not confident about the identification, say so honestly — state the confidence at below 50% and explain what the leaf looks like rather than guessing a wrong crop.
6. Never confuse cashew with neem/dongoyaro. Cashew has smooth, rounded leathery leaves. Neem has compound leaves with many small leaflets.
`;
}
