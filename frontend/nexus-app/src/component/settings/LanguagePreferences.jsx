"use client";

import React from "react";
import { useI18n } from "../../I18nContext.jsx";
import { languageOptions } from "../../i18n/translations.js";

function LanguagePreferences({ selectedLanguage, onSelectLanguage, onSave, loading }) {
  const { t } = useI18n();

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col gap-8">
      <div>
        <h3 className="text-xl font-black text-slate-800">
          {t("settings.languageTitle")}
        </h3>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {languageOptions.map((language) => {
          const active = selectedLanguage === language.code;
          return (
            <button
              key={language.code}
              type="button"
              onClick={() => onSelectLanguage(language.code)}
              className={`rounded-[22px] border px-5 py-4 text-left transition ${
                active
                  ? "border-sky-200 bg-sky-50 shadow-sm"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <p className="text-sm font-black text-slate-900">
                {language.nativeLabel}
              </p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                {language.label}
              </p>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={onSave}
        disabled={loading}
        className="w-full max-w-xs rounded-xl bg-slate-950 px-6 py-4 font-bold text-white transition hover:bg-slate-800 disabled:opacity-60"
      >
        {loading ? t("settings.processing") : t("settings.saveLanguage")}
      </button>
    </div>
  );
}

export default LanguagePreferences;
