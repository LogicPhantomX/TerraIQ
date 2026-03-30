// ─── useFarmerLanguage ────────────────────────────────────────────────
// Reads the farmer's saved language from Supabase once and caches it.
// Use this in any page that makes AI calls.
//
// Usage:
//   const lang = useFarmerLanguage();
//   const result = await getSoilAnalysis({ ...params, lang });

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import i18n from "@/i18n/index";

export function useFarmerLanguage() {
  const [lang, setLang] = useState(i18n.language ?? "en");

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase
          .from("profiles")
          .select("language")
          .eq("id", user.id)
          .single();
        if (data?.language) {
          setLang(data.language);
          i18n.changeLanguage(data.language); // keep UI in sync
        }
      } catch {
        // fallback to current i18n language
      }
    })();
  }, []);

  return lang;
}
