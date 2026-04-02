// ─── TerraIQ_WEB/src/hooks/useFarmerLanguage.js ──────────────────────
// Fix: uses getSession() not getUser() to avoid lock errors
// AND correctly calls i18n.changeLanguage() so the whole app updates

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import i18n from "i18next";

// Module-level cache so we only fetch once per session
let _cachedLang = null;

export function useFarmerLanguage() {
  const [lang, setLang] = useState(_cachedLang ?? "en");

  useEffect(() => {
    if (_cachedLang) {
      setLang(_cachedLang);
      if (i18n.language !== _cachedLang) {
        i18n.changeLanguage(_cachedLang);
      }
      return;
    }

    (async () => {
      try {
        // Use getSession — no lock, instant
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;

        const { data } = await supabase
          .from("profiles")
          .select("language")
          .eq("id", session.user.id)
          .single();

        const userLang = data?.language ?? "en";
        _cachedLang = userLang;
        setLang(userLang);

        // Switch the ENTIRE app language
        if (i18n.language !== userLang) {
          i18n.changeLanguage(userLang);
        }
      } catch {
        // silently fallback to English
      }
    })();
  }, []);

  return lang;
}

// Call this after saving profile so cache is cleared and language re-applies
export function clearLanguageCache() {
  _cachedLang = null;
}