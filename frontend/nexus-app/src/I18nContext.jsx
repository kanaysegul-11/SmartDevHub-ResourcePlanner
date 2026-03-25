import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useUser } from "./UserContext.jsx";
import { defaultLanguage, getLanguageMeta, translations } from "./i18n/translations.js";

const I18nContext = createContext(null);

const getValueByPath = (source, path) =>
  path.split(".").reduce((acc, part) => (acc ? acc[part] : undefined), source);

export function I18nProvider({ children }) {
  const { userData } = useUser();
  const [preferredLanguage, setPreferredLanguage] = useState(
    localStorage.getItem("language") || defaultLanguage
  );
  const language = userData?.language || preferredLanguage || defaultLanguage;

  useEffect(() => {
    localStorage.setItem("language", language);
    const meta = getLanguageMeta(language);
    document.documentElement.lang = language;
    document.documentElement.dir = meta.dir || "ltr";
  }, [language]);

  const value = useMemo(() => {
    const activeTranslations = translations[language] || translations[defaultLanguage];

    return {
      language,
      setLanguage: setPreferredLanguage,
      t: (key, fallback = key) =>
        getValueByPath(activeTranslations, key) ??
        getValueByPath(translations[defaultLanguage], key) ??
        fallback,
    };
  }, [language]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within I18nProvider.");
  }
  return context;
}
