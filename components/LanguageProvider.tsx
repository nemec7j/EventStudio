"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getTranslations, type LanguageCode } from "@/lib/i18n";

type LanguageContextValue = {
  language: LanguageCode;
  setLanguage: (language: LanguageCode) => void;
  dictionary: ReturnType<typeof getTranslations>;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

const STORAGE_KEY = "app_language";

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<LanguageCode>(() => {
    if (typeof window === "undefined") {
      return "cs";
    }
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === "en" || stored === "cs" ? stored : "cs";
  });

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, language);
    document.documentElement.lang = language;
    document.cookie = `lang=${language}; path=/; max-age=31536000`;
  }, [language]);

  const dictionary = useMemo(() => getTranslations(language), [language]);

  const value = useMemo(
    () => ({ language, setLanguage, dictionary }),
    [dictionary, language]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return context;
}
