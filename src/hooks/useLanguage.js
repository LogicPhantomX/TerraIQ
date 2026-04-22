// ─── src/hooks/useLanguage.js ─────────────────────────────────────────
// Re-exports from useFarmerLanguage so App.jsx useLanguageSync still works.

import { useFarmerLanguage, clearLanguageCache, applyLanguage } from "@/hooks/useFarmerLanguage";
import { useEffect } from "react";

// Used in App.jsx as <LanguageSync /> — runs once on mount, syncs language
export function useLanguageSync() {
  useFarmerLanguage(); // triggers the fetch + i18n.changeLanguage automatically
}

export { clearLanguageCache, applyLanguage };
