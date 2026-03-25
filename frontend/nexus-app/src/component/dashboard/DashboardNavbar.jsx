import React from "react";
import { FeatherSparkles, FeatherTarget } from "@subframe/core";
import { useUser } from "../../UserContext.jsx";
import { useI18n } from "../../I18nContext.jsx";
import { Badge } from "../../ui/components/Badge";

function Navbar() {
  const { userData } = useUser();
  const { t } = useI18n();

  return (
    <div className="relative overflow-hidden rounded-[34px] border border-white/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(255,255,255,0.82))] p-8 shadow-[0_24px_70px_rgba(148,163,184,0.18)] backdrop-blur xl:p-10">
      <div className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.16),transparent_42%),radial-gradient(circle_at_bottom_right,rgba(251,191,36,0.14),transparent_34%)]" />

      <div className="relative flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
        <div className="max-w-3xl">
          <div className="mb-4 flex flex-wrap gap-3">
            <Badge variant="neutral" icon={<FeatherSparkles />}>
              {t("dashboard.modernWorkspace")}
            </Badge>
            <Badge variant="success" icon={<FeatherTarget />}>
              {t("dashboard.dailyFocusReady")}
            </Badge>
          </div>

          <h1 className="max-w-2xl font-['Newsreader'] text-4xl font-medium leading-tight tracking-tight text-slate-900 md:text-5xl">
            {t("dashboard.greeting")}, {userData.username || t("app.user")}.{" "}
            {t("dashboard.heroTitle")}
          </h1>
        </div>

        <div className="grid min-w-[240px] grid-cols-1 gap-3 sm:grid-cols-2 xl:w-[320px] xl:grid-cols-1">
          <div className="rounded-3xl border border-slate-200/80 bg-white/85 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
              {t("dashboard.designLanguage")}
            </p>
            <p className="mt-2 text-lg font-black text-slate-900">
              {t("dashboard.designLanguageValue")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Navbar;
