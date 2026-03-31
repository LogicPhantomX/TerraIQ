// ─── TerraIQ_WEB/src/hooks/useFarmerLanguage.js ──────────────────────
// This hook reads the farmer's language from Supabase profile
// AND tells i18next to switch — so ALL page text updates automatically

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import i18n from "@/i18n";

let cachedLang = null; // module-level cache so we don't refetch on every render

export function useFarmerLanguage() {
  const [lang, setLang] = useState(cachedLang ?? i18n.language ?? "en");

  useEffect(() => {
    if (cachedLang) {
      // Already loaded — just make sure i18n matches
      if (i18n.language !== cachedLang) {
        i18n.changeLanguage(cachedLang);
      }
      setLang(cachedLang);
      return;
    }

    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
          .from("profiles")
          .select("language")
          .eq("id", user.id)
          .single();

        const userLang = data?.language ?? "en";
        cachedLang = userLang;
        setLang(userLang);

        // ← THIS is the key fix — tell i18next to actually switch language
        if (i18n.language !== userLang) {
          await i18n.changeLanguage(userLang);
        }
      } catch {
        // If profile fetch fails, stay on current language
      }
    })();
  }, []);

  return lang;
}

// Call this after saving profile to immediately update language
export function clearLanguageCache() {
  cachedLang = null;
}
