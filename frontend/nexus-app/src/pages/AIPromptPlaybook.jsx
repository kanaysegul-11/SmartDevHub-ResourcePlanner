import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  FeatherBookOpen,
  FeatherCode,
  FeatherShield,
  FeatherSparkles,
  FeatherZap,
} from "@subframe/core";
import { toast } from "sonner";

import Sidebar from "../component/layout/Sidebar";
import { useI18n } from "../I18nContext.jsx";
import { Badge } from "../ui/components/Badge";
import { TopbarWithRightNav } from "../ui/components/TopbarWithRightNav";

const createPromptContent = (language) => {
  const isTurkish = language === "tr";

  if (isTurkish) {
    const promptRules = [
      "Semantik HTML, alt metni, form label ve button type kurallarina uy.",
      "Tailwind, CSS Modules veya cakismayi azaltan scope stratejisi kullan.",
      "PascalCase component, camelCase function, UPPER_SNAKE_CASE constant kullan.",
      "Hook'lari sadece top-level kullan; JSX icinde agir mantik biriktirme.",
      "dangerouslySetInnerHTML kullanma, === disina cikma, var kullanma.",
      "Error Boundary, lazy loading, loading=\"lazy\" ve performans odakli tercihleri uygula.",
      "ESLint, Prettier, Husky ve lint-staged uyumlu bir sonuc hedefle.",
    ];

    const masterPrompt = `Sen kidemli bir yazilim muhendisisin. Bana verecegim proje istegini, mevcut kodu veya hata mesajini asagidaki takim muhendislik standartlarina tam uyacak sekilde ele al.

CALISMA MODU
- Yeni proje istersem sifirdan uret.
- Mevcut proje veya hata verirsem mevcut mimariyi gereksiz bozmadan duzelt.
- Gerekirse kotu yapilari daha temiz moduler yapilara refactor et.
- Her karari okunabilirlik, surdurulebilirlik, erisilebilirlik, guvenlik ve performans onceligiyle ver.

ZORUNLU STANDARTLAR
- Semantik HTML kullan: header, nav, main, section, article, aside, footer.
- Tum img etiketlerinde uygun alt kullan.
- Form alanlarini label/htmlFor veya esit erisilebilir isimle bagla.
- Form icindeki button etiketlerinde type acikca yaz.
- target="_blank" olan linklerde rel="noopener noreferrer" kullan.
- Tailwind, CSS Modules veya benzeri scoped stil stratejisi tercih et; klasik CSS gerekiyorsa BEM kullan.
- Renk, spacing, typography ve radius gibi tekrar eden degerleri token veya CSS variable ile yonet.
- Mobile-first responsive yaklasim uygula.
- React component isimleri PascalCase, function/variable isimleri camelCase, sabitler UPPER_SNAKE_CASE olsun.
- Props destructuring kullan.
- Hook'lari sadece en ust seviyede cagir.
- JSX icinde karmasik hesap yapma; hesaplari return oncesi degiskene tasi.
- Sadece === ve !== kullan; var kullanma.
- dangerouslySetInnerHTML kullanma; mecbursa sanitize edilmemis icerigi render etme.
- Kritik UI alanlarinda Error Boundary dusun.
- Lazy loading, React.lazy, Suspense ve gorsellerde loading="lazy" kullan.
- Mumkunse WebP/AVIF gibi optimize gorsel formatlari tercih et.
- Sonuc ESLint ve Prettier uyumlu olsun; Husky ve lint-staged yapisina ters dusme.

CIKTI FORMATI
1. Sorunu veya istegi kisa analiz et.
2. Uygulayacagin mimari veya duzeltme yonunu belirt.
3. Dosya bazli degisiklikleri ver.
4. Tam, calisir kodu ver.
5. Sonunda hangi takim kurallarina uydugunu checklist olarak yaz.
6. Risk, varsayim veya eksik veri varsa acikca belirt.

ISTEK / HATA / MEVCUT KOD
[BURAYA PROJE ISTEGINI, KODU VEYA HATA MESAJINI YAPISTIR]`;

    const promptPacks = [
      {
        id: "fullstack-project",
        title: "Tam Proje Uretimi",
        badge: "Sifirdan proje",
        summary:
          "Yeni bir fullstack veya frontend agirlikli projeyi ekip standartlarina gore bastan kurdurmak icin kullanin.",
        prompt: `${masterPrompt}

EK GOREV
- Bana sifirdan bir proje kur.
- Dosya yapisini mantikli sekilde parcala.
- UI varsa modern, temiz ve mobile-first olsun.
- Backend varsa endpoint, validation ve hata yonetimi net olsun.
- Her dosyada sadece gerekli kodu yaz; gereksiz boilerplate ekleme.

PROJE DETAYI
[BURAYA ISTEGINIZ PROJE TANIMINI YAZIN]`,
      },
      {
        id: "frontend-screen",
        title: "Frontend Ekran Promptu",
        badge: "UI ve React",
        summary:
          "Tek ekran, panel, form veya dashboard gibi arayuzleri bizim standardimiza uygun gelistirtmek icin kullanin.",
        prompt: `Asagidaki ekran veya akisi React ile gelistir. Kod mutlaka takim standartlarina uysun:

- Semantik HTML kullan.
- Formlarda label/htmlFor kur.
- Button type ozelligini yaz.
- Tailwind, CSS Modules veya scoped bir yapi tercih et.
- Mobile-first responsive tasarla.
- Component isimleri PascalCase, fonksiyonlar camelCase olsun.
- Props destructuring kullan.
- JSX icinde karmasik hesaplari return oncesinde hazirla.
- Hook'lari sadece top-level kullan.
- Error Boundary dusun.
- Agir ekranlari veya buyuk alt bolumleri lazy loading icin uygun tasarla.

CIKTI
1. Kisa ekran mimarisi
2. Dosya yapisi
3. Tam component kodlari
4. Standart checklist

EKRAN ISTEGI
[BURAYA EKRAN ISTEGINI YAZIN]`,
      },
      {
        id: "backend-api",
        title: "Backend API Promptu",
        badge: "API ve servis",
        summary:
          "Yeni endpoint, servis, validation veya veri akisi kurdururken daha temiz ve guvenli bir sonuc almak icin kullanin.",
        prompt: `Asagidaki backend gorevini uretime yakin kalitede cozumle.

ZORUNLU NOKTALAR
- Temiz katmanlama kullan.
- Girdi validation yap.
- Hata mesajlarini netlestir.
- Guvenlik risklerini azalt.
- Sabitleri UPPER_SNAKE_CASE, fonksiyonlari camelCase tut.
- Dosyalari gereksiz buyutme; moduler tut.
- Eger frontend ile birlikte bir akissa istek/yanit formatini acik yaz.
- Kod okunabilir ve test eklemeye uygun olsun.

CIKTI
1. Sorun analizi
2. Endpoint veya servis tasarimi
3. Gerekli dosyalar
4. Tam kod
5. Standart checklist

BACKEND GOREVI
[BURAYA API VEYA BACKEND ISTEGINI YAZIN]`,
      },
      {
        id: "bug-fix",
        title: "Hata Duzeltme Promptu",
        badge: "Bug fix",
        summary:
          "Var olan projede hata cozerken AI'nin sadece gecici yama degil, kurallara uygun kalici duzeltme vermesi icin kullanin.",
        prompt: `Asagidaki kodu ve hata mesajini duzelt. Ama sadece hatayi kapatma; cozumu takim standartlarimiza uygun hale getir.

YAPMAN GEREKENLER
1. Hatanin kok nedenini acikla.
2. Varsa ilgili standart ihlallerini tespit et.
3. En temiz ve kalici duzeltmeyi uygula.
4. Gerekirse kodu refactor et ama davranisi gereksiz bozma.
5. Sonunda hangi standartlara uydugunu checklist ile yaz.

STANDART ONCELIKLERI
- === ve !==
- const/let kullanimi
- Hook kurallari
- props destructuring
- JSX disinda hesaplama
- semantic HTML, alt, label, button type
- dangerouslySetInnerHTML ve XSS risklerinden kacinma
- lazy loading ve performans farkindaligi

KOD
[BURAYA KODU YAPISTIR]

HATA
[BURAYA HATA MESAJINI YAPISTIR]`,
      },
      {
        id: "refactor",
        title: "Refactor ve Standardizasyon",
        badge: "Mevcut proje",
        summary:
          "Onceden yazilmis bir projeyi ekip kurallarina yaklastirmak, naming ve dosya duzenini toparlatmak icin kullanin.",
        prompt: `Asagidaki mevcut kodu veya modulu takim standartlarina gore refactor et.

HEDEF
- Davranisi koru.
- Okunabilirligi artir.
- Gereksiz tekrar ve karmasikligi azalt.
- Dosya yapisini ve isimlendirmeyi toparla.
- UI tarafinda erisilebilirlik ve semantik yapilari iyilestir.

KONTROL ET
- PascalCase component
- camelCase function/variable
- UPPER_SNAKE_CASE constant
- props destructuring
- Hook top-level kullanim
- JSX disinda hesaplama
- CSS token/scoped styling
- mobile-first responsive duzen
- Error Boundary ihtiyaci
- lazy loading firsatlari

CIKTI
1. Tespit edilen problemler
2. Refactor stratejisi
3. Guncel dosyalar
4. Standart checklist

MEVCUT KOD / MODUL
[BURAYA DOSYA VEYA KOD PARCASINI YAPISTIR]`,
      },
      {
        id: "audit-remediation",
        title: "Kural Ihlali Giderme Promptu",
        badge: "Governance uyumu",
        summary:
          "Kod yonetimi ekraninda gorulen ihlalleri AI'ya duzeltirtmek icin ozellikle hazirlandi.",
        prompt: `Asagida ekip kod yonetimi ekranindan gelen kural ihlallerini, ilgili dosyalari ve gerekiyorsa hata mesajlarini paylasacagim. Bunlari duzeltirken bizim muhendislik kurallarimiza tam uy.

YAKLASIM
- Her ihlali tek tek ele al.
- Mumkunse ayni dosyada ilgili standartlari birlikte toparla.
- Gereksiz buyuk rewrite yapma.
- Davranis degisecekse bunu acikca belirt.
- Her duzeltmeyi dosya bazinda ver.

ZORUNLU UYUM
- semantic HTML
- img alt
- form label/htmlFor
- button type
- external link rel noopener noreferrer
- CSS token/scoped styling/BEM
- mobile-first
- props destructuring
- hook kurallari
- JSX disinda hesaplama
- strict equality
- const/let
- no dangerouslySetInnerHTML
- Error Boundary gereksinimi
- ESLint/Prettier uyumu
- lazy loading ve gorsel optimizasyonu

CIKTI
1. Ihlal listesi ve cozum plani
2. Duzenlenmis kod
3. Kurallara uyum checklist

IHLALLER / DOSYALAR / HATA MESAJLARI
[BURAYA IHLAL METINLERINI VE KODU YAPISTIR]`,
      },
    ];

    return {
      promptRules,
      masterPrompt,
      promptPacks,
      copied: "Kopyalandi",
      copy: "Kopyala",
      copyPrompt: "Promptu kopyala",
      copySuccess: "Prompt kopyalandi.",
      copyFailed: "Prompt kopyalanamadi.",
      pageBadge: "AI Prompt Rehberi",
      codeRules: "Kod Kurallari",
      governance: "Kod Yonetimi",
      onboarding: "Yeni ekip uyumu",
      title:
        "AI ile proje uretirken takim standartlarini koruyan prompt kutuphanesi",
      body:
        "Bu sayfa, ekibe yeni katilan herkesin herhangi bir AI araci ile bizim duzenimizde proje, ekran, API, bug fix veya refactor isteyebilmesi icin hazirlandi. Promptlari oldugu gibi kullanabilir ya da sadece en alttaki ihtiyac kismini degistirebilirsiniz.",
      readyPack: "Hazir paket",
      readyPackBody:
        "Sifirdan proje, bug fix, refactor, frontend ve backend icin hazirlandi.",
      teamFit: "Takim uyumu",
      teamFitBody:
        "Promptlar, kod yonetimi ekranindaki standartlarla uyumlu olacak sekilde yazildi.",
      usage: "Kullanim sekli",
      usageBody:
        "Promptu kopyalayin, sadece en alttaki istek veya hata alanini doldurun.",
      masterBadge: "Ana iskelet prompt",
      masterTitle:
        "Tum AI araclarinda kullanabileceginiz temel prompt",
      notesBadge: "Kisa kullanim notu",
      notes: [
        "Yeni proje icin genelde once Tam Proje Uretimi veya Frontend Ekran Promptu ile baslayin.",
        "Hata cozerken sadece stack trace degil, ilgili dosya ve beklenen davranisi da prompta ekleyin.",
        "Governance ekranindaki ihlalleri kopyalarken dosya yolu ve kural ismini birlikte verin; AI daha dogru duzeltir.",
      ],
    };
  }

  const promptRules = [
    "Follow semantic HTML, alt text, form label, and button type rules.",
    "Use Tailwind, CSS Modules, or another scoped styling strategy.",
    "Use PascalCase for components, camelCase for functions, and UPPER_SNAKE_CASE for constants.",
    "Keep Hooks at the top level and avoid heavy logic directly inside JSX.",
    "Avoid dangerouslySetInnerHTML, loose equality, and var.",
    "Apply Error Boundaries, lazy loading, loading=\"lazy\", and performance-conscious decisions.",
    "Aim for ESLint, Prettier, Husky, and lint-staged compatibility.",
  ];

  const masterPrompt = `You are a senior software engineer. For the project request, existing code, or error message that I provide, produce a result that fully follows the team engineering standards below.

WORKING MODE
- If I ask for a new project, build it from scratch.
- If I provide an existing project or an error, fix it without unnecessary structural disruption.
- Refactor weak areas into cleaner modular structures when needed.
- Prioritize readability, maintainability, accessibility, security, and performance in every decision.

MANDATORY STANDARDS
- Use semantic HTML: header, nav, main, section, article, aside, footer.
- Add proper alt text to every img element.
- Pair form controls with labels, htmlFor, or an equivalent accessible name.
- Always declare button type explicitly inside forms.
- Use rel="noopener noreferrer" on links that open with target="_blank".
- Prefer Tailwind, CSS Modules, or another scoped styling strategy; if plain CSS is required, follow BEM.
- Manage repeated color, spacing, typography, and radius values through tokens or CSS variables.
- Follow a mobile-first responsive approach.
- Use PascalCase for React component names, camelCase for functions/variables, and UPPER_SNAKE_CASE for constants.
- Use props destructuring.
- Call Hooks only at the top level.
- Keep heavy calculations out of JSX and move them before return.
- Use only === and !==, and never use var.
- Avoid dangerouslySetInnerHTML; if absolutely necessary, do not render unsanitized content.
- Consider Error Boundaries for critical UI areas.
- Use lazy loading, React.lazy, Suspense, and loading="lazy" where appropriate.
- Prefer optimized image formats such as WebP or AVIF when practical.
- The result must remain compatible with ESLint, Prettier, Husky, and lint-staged workflows.

OUTPUT FORMAT
1. Briefly analyze the request or bug.
2. Explain the solution direction or architecture.
3. List file-based changes.
4. Provide complete working code.
5. End with a checklist showing which team rules were satisfied.
6. Clearly mention risks, assumptions, or missing context.

REQUEST / BUG / EXISTING CODE
[PASTE THE PROJECT REQUEST, CODE, OR ERROR HERE]`;

  const promptPacks = [
    {
      id: "fullstack-project",
      title: "Full Project Generation",
      badge: "From scratch",
      summary:
        "Use this when you want a new fullstack or frontend-heavy project generated according to team standards.",
      prompt: `${masterPrompt}

EXTRA TASK
- Build a new project from scratch.
- Split the file structure into sensible modules.
- If there is UI, make it modern, clean, and mobile-first.
- If there is backend work, keep endpoints, validation, and error handling explicit.
- Write only the necessary code and avoid unnecessary boilerplate.

PROJECT DETAILS
[WRITE YOUR PROJECT REQUEST HERE]`,
    },
    {
      id: "frontend-screen",
      title: "Frontend Screen Prompt",
      badge: "UI and React",
      summary:
        "Use this for single screens, panels, forms, dashboards, and other interface-heavy tasks.",
      prompt: `Build the following screen or user flow in React. The code must follow our team standards.

- Use semantic HTML.
- Pair form controls with labels or htmlFor.
- Declare button type explicitly.
- Prefer Tailwind, CSS Modules, or another scoped styling strategy.
- Design the screen mobile-first.
- Use PascalCase for components and camelCase for functions.
- Use props destructuring.
- Move complex calculations outside JSX before return.
- Keep Hooks at the top level.
- Consider Error Boundaries.
- Structure the screen so heavy areas can be lazy-loaded when useful.

OUTPUT
1. Brief screen architecture
2. File structure
3. Complete component code
4. Standards checklist

SCREEN REQUEST
[WRITE THE SCREEN REQUEST HERE]`,
    },
    {
      id: "backend-api",
      title: "Backend API Prompt",
      badge: "API and services",
      summary:
        "Use this for endpoints, services, validation, and backend flows where cleaner structure and safer output matter.",
      prompt: `Solve the backend task below with production-oriented quality.

REQUIRED POINTS
- Use clean layering.
- Validate input.
- Make error messages explicit.
- Reduce security risks.
- Keep constants in UPPER_SNAKE_CASE and functions in camelCase.
- Avoid oversized files and keep modules separated.
- If frontend is involved, describe the request/response shape clearly.
- Keep the code readable and ready for future tests.

OUTPUT
1. Problem analysis
2. Endpoint or service design
3. Required files
4. Complete code
5. Standards checklist

BACKEND TASK
[WRITE THE API OR BACKEND REQUEST HERE]`,
    },
    {
      id: "bug-fix",
      title: "Bug Fix Prompt",
      badge: "Bug fix",
      summary:
        "Use this when you want AI to fix an issue with a clean and standards-compliant solution instead of a temporary patch.",
      prompt: `Fix the code and the error below. Do not just patch the bug; make the solution compliant with our team standards.

YOU MUST
1. Explain the root cause.
2. Identify any related standards violations.
3. Apply the cleanest and most durable fix.
4. Refactor when necessary, without breaking behavior unnecessarily.
5. End with a checklist showing which standards were satisfied.

STANDARD PRIORITIES
- === and !==
- const/let usage
- Hook rules
- props destructuring
- moving logic out of JSX
- semantic HTML, alt, label, button type
- avoiding dangerouslySetInnerHTML and XSS risks
- lazy loading and performance awareness

CODE
[PASTE THE CODE HERE]

ERROR
[PASTE THE ERROR MESSAGE HERE]`,
    },
    {
      id: "refactor",
      title: "Refactor and Standardization",
      badge: "Existing project",
      summary:
        "Use this to bring an older module or project closer to team conventions for structure, naming, and maintainability.",
      prompt: `Refactor the existing code or module below so that it aligns with our team standards.

GOALS
- Preserve behavior.
- Improve readability.
- Reduce duplication and complexity.
- Clean up naming and file structure.
- Improve accessibility and semantic UI structure where relevant.

CHECK FOR
- PascalCase components
- camelCase functions/variables
- UPPER_SNAKE_CASE constants
- props destructuring
- top-level Hook usage
- moving calculations outside JSX
- CSS tokens or scoped styling
- mobile-first responsive layout
- Error Boundary opportunities
- lazy loading opportunities

OUTPUT
1. Detected problems
2. Refactor strategy
3. Updated files
4. Standards checklist

EXISTING CODE / MODULE
[PASTE THE FILE OR CODE BLOCK HERE]`,
    },
    {
      id: "audit-remediation",
      title: "Governance Violation Remediation Prompt",
      badge: "Governance alignment",
      summary:
        "Use this when you want AI to correct the exact violations shown in the code governance interface.",
      prompt: `I will share rule violations, file paths, and optionally error messages from the team governance screen. Fix them while fully following our engineering standards.

APPROACH
- Handle each violation explicitly.
- When practical, clean up related standards in the same file together.
- Avoid unnecessary large rewrites.
- If behavior changes, call it out clearly.
- Return the fix in a file-based structure.

MANDATORY COMPLIANCE
- semantic HTML
- img alt
- form label/htmlFor
- button type
- external links with rel noopener noreferrer
- CSS tokens / scoped styling / BEM
- mobile-first
- props destructuring
- Hook rules
- logic outside JSX
- strict equality
- const/let
- no dangerouslySetInnerHTML
- Error Boundary consideration
- ESLint/Prettier compatibility
- lazy loading and image optimization

OUTPUT
1. Violation list and fix plan
2. Updated code
3. Standards checklist

VIOLATIONS / FILES / ERROR MESSAGES
[PASTE THE VIOLATIONS AND CODE HERE]`,
    },
  ];

  return {
    promptRules,
    masterPrompt,
    promptPacks,
    copied: "Copied",
    copy: "Copy",
    copyPrompt: "Copy prompt",
    copySuccess: "Prompt copied.",
    copyFailed: "Prompt could not be copied.",
    pageBadge: "AI Prompt Guide",
    codeRules: "Code Rules",
    governance: "Code Governance",
    onboarding: "New team onboarding",
    title:
      "A prompt library that keeps AI-generated projects aligned with team standards",
    body:
      "This page helps new teammates ask any AI tool for a project, screen, API, bug fix, or refactor in the same structured way we use across the team. Copy the prompts as they are or only replace the request area at the bottom.",
    readyPack: "Ready pack",
    readyPackBody:
      "Prepared for new project generation, bug fixes, refactors, frontend work, and backend work.",
    teamFit: "Team fit",
    teamFitBody:
      "These prompts are written to match the standards used by the code governance workspace.",
    usage: "Usage",
    usageBody:
      "Copy the prompt and only fill in the final request or error section.",
    masterBadge: "Base prompt",
    masterTitle: "The core prompt you can use across AI tools",
    notesBadge: "Quick usage notes",
    notes: [
      "For a new build, start with Full Project Generation or Frontend Screen Prompt.",
      "When fixing a bug, include not only the stack trace but also the relevant files and the expected behavior.",
      "When copying governance violations, include both the file path and the rule name so the AI can fix them more accurately.",
    ],
  };
};

function AIPromptPlaybook() {
  const { language } = useI18n();
  const [copiedPromptId, setCopiedPromptId] = useState("");
  const content = useMemo(() => createPromptContent(language), [language]);

  const promptCountLabel = useMemo(
    () => `${content.promptPacks.length + 1}`,
    [content.promptPacks.length]
  );

  const handleCopy = async (promptId, value) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedPromptId(promptId);
      toast.success(content.copySuccess);
      window.setTimeout(() => {
        setCopiedPromptId((current) => (current === promptId ? "" : current));
      }, 1800);
    } catch {
      toast.error(content.copyFailed);
    }
  };

  return (
    <div className="flex h-screen w-full items-start overflow-x-hidden bg-transparent font-sans text-slate-900">
      <Sidebar activeItem="governance" logoClickable={true} />
      <div className="relative flex min-h-0 min-w-0 grow flex-col items-start self-stretch overflow-y-auto overflow-x-hidden pb-10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.76),transparent_36%)]" />
        <div className="relative flex min-w-0 w-full flex-col gap-6">
          <TopbarWithRightNav
            className="mx-6 mt-6 rounded-[28px] border border-white/65 bg-white/55 px-6 py-4 shadow-[0_20px_50px_rgba(148,163,184,0.12)] backdrop-blur md:mx-8 xl:mx-10"
            leftSlot={
              <Badge variant="neutral" icon={<FeatherSparkles />}>
                {content.pageBadge}
              </Badge>
            }
            rightSlot={
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  to="/github-governance/rules"
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
                >
                  {content.codeRules}
                </Link>
                <Link
                  to="/github-governance"
                  className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-black text-white transition hover:bg-slate-800"
                >
                  {content.governance}
                </Link>
              </div>
            }
          />

          <div className="grid min-w-0 grid-cols-1 gap-6 px-6 md:px-8 xl:px-10">
            <section className="rounded-[32px] border border-white/65 bg-white/90 p-6 shadow-[0_24px_70px_rgba(148,163,184,0.12)]">
              <Badge variant="neutral" icon={<FeatherZap />}>
                {content.onboarding}
              </Badge>
              <h1 className="mt-4 font-['Newsreader'] text-4xl font-medium tracking-tight text-slate-950">
                {content.title}
              </h1>
              <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-500">
                {content.body}
              </p>
              <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
                    {content.readyPack}
                  </p>
                  <p className="mt-2 text-2xl font-black text-slate-950">
                    {promptCountLabel}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    {content.readyPackBody}
                  </p>
                </div>
                <div className="rounded-[24px] border border-emerald-100 bg-emerald-50 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-emerald-700">
                    {content.teamFit}
                  </p>
                  <p className="mt-2 text-2xl font-black text-slate-950">34</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {content.teamFitBody}
                  </p>
                </div>
                <div className="rounded-[24px] border border-sky-100 bg-sky-50 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-sky-700">
                    {content.usage}
                  </p>
                  <p className="mt-2 text-2xl font-black text-slate-950">
                    {content.copy}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {content.usageBody}
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-[30px] border border-slate-200 bg-white/92 p-6 shadow-[0_18px_46px_rgba(148,163,184,0.1)]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <Badge variant="neutral" icon={<FeatherShield />}>
                    {content.masterBadge}
                  </Badge>
                  <h2 className="mt-3 text-2xl font-black text-slate-950">
                    {content.masterTitle}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy("master", content.masterPrompt)}
                  className="rounded-2xl border border-slate-200 bg-slate-950 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-800"
                >
                  {copiedPromptId === "master"
                    ? content.copied
                    : content.copyPrompt}
                </button>
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {content.promptRules.map((rule) => (
                  <div
                    key={rule}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600"
                  >
                    {rule}
                  </div>
                ))}
              </div>
              <pre className="mt-5 overflow-x-auto rounded-[24px] border border-slate-200 bg-slate-950 p-5 text-xs leading-6 text-slate-100">
                {content.masterPrompt}
              </pre>
            </section>

            <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              {content.promptPacks.map((pack) => (
                <article
                  key={pack.id}
                  className="rounded-[30px] border border-slate-200 bg-white/92 p-6 shadow-[0_18px_46px_rgba(148,163,184,0.1)]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <Badge variant="neutral" icon={<FeatherCode />}>
                        {pack.badge}
                      </Badge>
                      <h3 className="mt-3 text-2xl font-black text-slate-950">
                        {pack.title}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-slate-500">
                        {pack.summary}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(pack.id, pack.prompt)}
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
                    >
                      {copiedPromptId === pack.id
                        ? content.copied
                        : content.copy}
                    </button>
                  </div>
                  <pre className="mt-5 overflow-x-auto rounded-[24px] border border-slate-200 bg-slate-950 p-5 text-xs leading-6 text-slate-100">
                    {pack.prompt}
                  </pre>
                </article>
              ))}
            </section>

            <section className="rounded-[30px] border border-amber-200 bg-amber-50/90 p-6 shadow-[0_18px_46px_rgba(148,163,184,0.1)]">
              <Badge variant="warning" icon={<FeatherBookOpen />}>
                {content.notesBadge}
              </Badge>
              <div className="mt-4 grid gap-3 text-sm leading-6 text-slate-700 md:grid-cols-3">
                {content.notes.map((item) => (
                  <p
                    key={item}
                    className="rounded-2xl border border-amber-200 bg-white/70 p-4"
                  >
                    {item}
                  </p>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AIPromptPlaybook;
