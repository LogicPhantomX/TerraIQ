// ─── src/hooks/useFarmerLanguage.js ──────────────────────────────────
// FIXED: Uses getSession() (no lock). Caches language. Syncs i18n globally.
// This is the ONLY language hook needed — used by all pages for AI calls.

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import i18n from "i18next";

// Module-level cache — fetched once per browser session
let _cachedLang = null;
const _listeners = new Set();

function notifyListeners(lang) {
  _listeners.forEach(fn => fn(lang));
}

export function useFarmerLanguage() {
  const [lang, setLang] = useState(_cachedLang ?? "en");

  useEffect(() => {
    // Subscribe to future updates (e.g. when Profile saves a new language)
    _listeners.add(setLang);

    // If already cached, apply immediately
    if (_cachedLang) {
      setLang(_cachedLang);
      if (i18n.language !== _cachedLang) {
        i18n.changeLanguage(_cachedLang);
      }
      return () => _listeners.delete(setLang);
    }

    // Fetch from Supabase using getSession (NO lock)
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;

        const { data } = await supabase
          .from("profiles")
          .select("language")
          .eq("id", session.user.id)
          .single();

        const userLang = (data?.language && ["en","yo","ha","ig"].includes(data.language))
          ? data.language : "en";

        _cachedLang = userLang;
        setLang(userLang);
        notifyListeners(userLang);

        // Switch the ENTIRE app — every page using useTranslation() updates
        if (i18n.language !== userLang) {
          await i18n.changeLanguage(userLang);
        }
      } catch {
        // silently fall back to English
      }
    })();

    return () => _listeners.delete(setLang);
  }, []);

  return lang;
}

// Call this after Profile saves so next page load re-fetches
export function clearLanguageCache() {
  _cachedLang = null;
}

// Call this to instantly switch language everywhere (used by Profile page)
export function applyLanguage(langCode) {
  if (!["en","yo","ha","ig"].includes(langCode)) return;
  _cachedLang = langCode;
  notifyListeners(langCode);
  i18n.changeLanguage(langCode);
}
