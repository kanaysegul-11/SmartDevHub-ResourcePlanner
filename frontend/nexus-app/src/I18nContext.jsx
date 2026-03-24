import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useUser } from "./UserContext.jsx";
import { defaultLanguage, getLanguageMeta, translations } from "./i18n/translations.js";

const I18nContext = createContext(null);

const getValueByPath = (source, path) =>
  path.split(".").reduce((acc, part) => (acc ? acc[part] : undefined), source);

export function I18nProvider({ children }) {
  const { userData } = useUser();
  const [language, setLanguage] = useState(
    localStorage.getItem("language") || defaultLanguage
  );

  useEffect(() => {
    const nextLanguage = userData?.language || localStorage.getItem("language") || defaultLanguage;
    setLanguage(nextLanguage);
  }, [userData?.language]);

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
      setLanguage,
      t: (key, fallback = key) =>
        getValueByPath(activeTranslations, key) ??
        getValueByPath(translations[defaultLanguage], key) ??
        fallback,
    };
  }, [language]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within I18nProvider.");
  }
  return context;
}

