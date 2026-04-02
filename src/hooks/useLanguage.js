// ─── TerraIQ_WEB/src/hooks/useLanguage.js ────────────────────────────
// Central hook to get the farmer's language from Supabase profile
// and sync it with i18next so ALL pages update automatically.
//
// USE THIS in your top-level App.jsx or AuthProvider:
//   import { useLanguageSync } from "@/hooks/useLanguage";
//   // inside component: useLanguageSync();
//
// Then in every page just use:
//   import { useTranslation } from "react-i18next";
//   const { t } = useTranslation();

import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/lib/supabase";

export function useLanguageSync() {
  const { i18n } = useTranslation();

  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;

        const { data: profile } = await supabase
          .from("profiles")
          .select("language")
          .eq("id", session.user.id)
          .single();

        if (profile?.language && ["en", "yo", "ha", "ig"].includes(profile.language)) {
          if (i18n.language !== profile.language) {
            await i18n.changeLanguage(profile.language);
          }
        }
      } catch (e) {
        console.warn("Language sync failed:", e);
      }
    };

    loadLanguage();
  }, [i18n]);
}

// Also export a simple hook that gives you the lang code for API calls
export function useFarmerLang() {
  const { i18n } = useTranslation();
  return i18n.language?.slice(0, 2) ?? "en";
}
