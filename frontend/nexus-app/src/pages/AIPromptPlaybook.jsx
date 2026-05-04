import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FeatherCode, FeatherShield, FeatherSparkles } from "@subframe/core";
import { toast } from "sonner";

import Sidebar from "../component/layout/Sidebar";
import { useI18n } from "../I18nContext.jsx";
import { Badge } from "../ui/components/Badge";
import { TopbarWithRightNav } from "../ui/components/TopbarWithRightNav";
import {
  buildCombinedAIPrompt,
  createAIPromptLibrary,
} from "../utils/aiPromptLibrary";

function AIPromptPlaybook() {
  const { language } = useI18n();
  const [copiedKey, setCopiedKey] = useState("");
  const library = useMemo(() => createAIPromptLibrary(language), [language]);
  const [selectedTaskId, setSelectedTaskId] = useState(
    library.taskTemplates[0]?.id || ""
  );
  const selectedRuleIds = useMemo(
    () => library.ruleModules.map((rule) => rule.id),
    [library.ruleModules]
  );
  const [requirement, setRequirement] = useState("");
  const [includeChecklist, setIncludeChecklist] = useState(true);
  const [includeFileDiff, setIncludeFileDiff] = useState(true);
  const [includeArchitecture, setIncludeArchitecture] = useState(true);

  const selectedTask = useMemo(
    () =>
      library.taskTemplates.find((task) => task.id === selectedTaskId) ||
      library.taskTemplates[0] ||
      null,
    [library.taskTemplates, selectedTaskId]
  );

  const generatedPrompt = useMemo(
    () =>
      buildCombinedAIPrompt({
        library,
        selectedTaskId,
        selectedRuleIds,
        requirement,
        includeChecklist,
        includeFileDiff,
        includeArchitecture,
      }),
    [
      library,
      selectedTaskId,
      selectedRuleIds,
      requirement,
      includeChecklist,
      includeFileDiff,
      includeArchitecture,
    ]
  );

  const handleCopy = async (key, value) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      toast.success(library.copySuccess);
      window.setTimeout(() => {
        setCopiedKey((current) => (current === key ? "" : current));
      }, 1800);
    } catch {
      toast.error(library.copyFailed);
    }
  };

  const shortSummary =
    language === "tr"
      ? "Tum sirket standartlari otomatik eklenir. Sadece gorev tipini secip isteginizi yazin."
      : "All company standards are included automatically. Just choose the task type and write your request.";
  const comparisonPoints =
    language === "tr"
      ? [
          "Ayni gorev tipi mantigi kullanilir.",
          "Ayni dosya duzeni ve naming standardi hedeflenir.",
          "Ayni cikti akisi beklenir: analiz, mimari, dosya ozeti, kod, checklist, riskler.",
          "Ayni zorunlu kurallar uygulanir: semantic HTML, responsive yapi, guvenlik, performans.",
          "Yarim kod, placeholder ve kopuk component akislari engellenmeye calisilir.",
          "Sonuc birebir ayni degil ama ayni kalite cizgisine yakin olur.",
        ]
      : [
          "The same task-type logic is used.",
          "The same file structure and naming style are targeted.",
          "The same response flow is expected: analysis, architecture, file summary, code, checklist, risks.",
          "The same mandatory rules are enforced: semantic HTML, responsive layout, safety, performance.",
          "Half-finished code, placeholders, and disconnected component flows are pushed down.",
          "The result is not identical, but it stays close to the same quality line.",
        ];

  const presentationNote =
    language === "tr"
      ? "Sunumda anlatmaniz gereken sey, tum AI'larin ayni cevabi vermesi degil; ayni muhendislik omurgasina gore cevap vermesidir."
      : "In the presentation, the key point is not that every AI returns the exact same answer, but that they follow the same engineering backbone.";

  return (
    <div className="app-shell flex bg-transparent font-sans text-slate-900">
      <Sidebar activeItem="governance" logoClickable={true} />
      <div className="app-shell__main relative flex flex-col items-start pb-10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.76),transparent_36%)]" />
        <div className="relative flex min-w-0 w-full flex-col gap-6">
          <TopbarWithRightNav
            className="mx-6 mt-6 rounded-[28px] border border-white/65 bg-white/55 px-6 py-4 shadow-[0_20px_50px_rgba(148,163,184,0.12)] backdrop-blur md:mx-8 xl:mx-10"
            leftSlot={
              <Badge variant="neutral" icon={<FeatherSparkles />}>
                {library.pageBadge}
              </Badge>
            }
            rightSlot={
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  to="/github-governance/rules"
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
                >
                  {library.codeRules}
                </Link>
                <Link
                  to="/github-governance"
                  className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-black text-white transition hover:bg-slate-800"
                >
                  {library.governance}
                </Link>
              </div>
            }
          />

          <div className="grid min-w-0 grid-cols-1 gap-6 px-6 md:px-8 xl:px-10">
            <section className="rounded-[32px] border border-white/65 bg-white/90 p-6 shadow-[0_24px_70px_rgba(148,163,184,0.12)]">
              <Badge variant="neutral" icon={<FeatherShield />}>
                {language === "tr" ? "Tek prompt sistemi" : "Single prompt system"}
              </Badge>
              <h1 className="mt-4 font-['Newsreader'] text-4xl font-medium tracking-tight text-slate-950">
                {library.title}
              </h1>
              <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-500">
                {shortSummary}
              </p>
            </section>

            <section className="grid grid-cols-1 gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
              <div className="rounded-[30px] border border-slate-200 bg-white/92 p-6 shadow-[0_18px_46px_rgba(148,163,184,0.1)]">
                <h2 className="text-2xl font-black text-slate-950">
                  {language === "tr" ? "Gorev tipi" : "Task type"}
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {language === "tr"
                    ? "Hangi tur is yaptiracaginizi secin."
                    : "Choose what kind of work you want AI to do."}
                </p>

                <div className="mt-5 space-y-3">
                  {library.taskTemplates.map((task) => (
                    <button
                      key={task.id}
                      type="button"
                      onClick={() => setSelectedTaskId(task.id)}
                      className={`w-full rounded-[22px] border p-4 text-left transition ${
                        selectedTaskId === task.id
                          ? "border-slate-900 bg-slate-950 text-white shadow-[0_18px_40px_rgba(15,23,42,0.18)]"
                          : "border-slate-200 bg-slate-50 text-slate-900 hover:border-sky-200 hover:bg-white"
                      }`}
                    >
                      <p className="text-base font-black">{task.title}</p>
                      <p
                        className={`mt-2 text-sm leading-6 ${
                          selectedTaskId === task.id
                            ? "text-slate-200"
                            : "text-slate-500"
                        }`}
                      >
                        {task.summary}
                      </p>
                    </button>
                  ))}
                </div>

                <div className="mt-5 rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    {language === "tr" ? "Ihtiyac metni" : "Requirement text"}
                  </p>
                  <textarea
                    value={requirement}
                    onChange={(event) => setRequirement(event.target.value)}
                    placeholder={library.requirementHint}
                    className="mt-3 min-h-[220px] w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-700 outline-none transition focus:border-sky-300"
                  />
                </div>

                <div className="mt-5 rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                    {language === "tr" ? "Ek tercihler" : "Extra preferences"}
                  </p>
                  <div className="mt-3 space-y-3 text-sm text-slate-600">
                    {[
                      [includeArchitecture, setIncludeArchitecture, library.includeArchitecture],
                      [includeFileDiff, setIncludeFileDiff, library.includeFileDiff],
                      [includeChecklist, setIncludeChecklist, library.includeChecklist],
                    ].map(([checked, setChecked, label]) => (
                      <label key={label} className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(event) => setChecked(event.target.checked)}
                          className="h-4 w-4 rounded border-slate-300"
                        />
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <section className="rounded-[30px] border border-slate-200 bg-white/92 p-6 shadow-[0_18px_46px_rgba(148,163,184,0.1)]">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <Badge variant="neutral" icon={<FeatherCode />}>
                        {language === "tr" ? "Olusan prompt" : "Generated prompt"}
                      </Badge>
                      <h2 className="mt-3 text-2xl font-black text-slate-950">
                        {selectedTask?.title}
                      </h2>
                      <p className="mt-2 text-sm leading-6 text-slate-500">
                        {language === "tr"
                          ? "Bu tek promptun icinde tum sirket standartlari otomatik olarak bulunur."
                          : "All company standards are already included in this single prompt."}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy("generated", generatedPrompt)}
                      className="rounded-2xl border border-slate-200 bg-slate-950 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-800"
                    >
                      {copiedKey === "generated"
                        ? library.copied
                        : library.copyGenerated}
                    </button>
                  </div>

                  <pre className="mt-5 max-h-[68vh] overflow-auto rounded-[24px] border border-slate-200 bg-slate-950 p-5 text-xs leading-6 text-slate-100">
                    {generatedPrompt}
                  </pre>
                </section>

                <section className="rounded-[30px] border border-slate-200 bg-white/92 p-6 shadow-[0_18px_46px_rgba(148,163,184,0.1)]">
                  <Badge variant="neutral" icon={<FeatherShield />}>
                    {language === "tr" ? "Bu prompt neyi sabit tutar?" : "What stays consistent?"}
                  </Badge>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {[
                      language === "tr"
                        ? "Tum sirket kurallari otomatik eklenir."
                        : "All company rules are included automatically.",
                      language === "tr"
                        ? "Tek naming ve dosya duzeni hedeflenir."
                        : "One naming and file structure style is targeted.",
                      language === "tr"
                        ? "Eksik veya yari kalmis kod cikisi azaltilir."
                        : "Incomplete or half-finished output is reduced.",
                      language === "tr"
                        ? "Farkli AI'larda daha tutarli cevap alinmaya calisilir."
                        : "More consistent answers are encouraged across AI tools.",
                    ].map((item) => (
                      <div
                        key={item}
                        className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600"
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-[30px] border border-slate-200 bg-white/92 p-6 shadow-[0_18px_46px_rgba(148,163,184,0.1)]">
                  <Badge variant="neutral" icon={<FeatherSparkles />}>
                    {language === "tr"
                      ? "Farkli AI'larda ortak noktalar"
                      : "Shared points across AI tools"}
                  </Badge>
                  <p className="mt-4 rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm leading-6 text-sky-900">
                    {presentationNote}
                  </p>
                  <div className="mt-4 grid gap-3">
                    {comparisonPoints.map((item, index) => (
                      <div
                        key={item}
                        className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700"
                      >
                        <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-950 text-xs font-black text-white">
                          {index + 1}
                        </span>
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AIPromptPlaybook;
