const buildTurkishLibrary = () => {
  const hardRequirements = [
    "Eksik birakma, pseudo-code yazma veya 'burayi sen doldur' benzeri placeholder kullanma.",
    "Kod bloklarini tam, calisir ve birbiriyle tutarli ver.",
    "Ayni problem icin dosya isimleri, component isimleri ve klasor duzeni boyunca tek bir naming standardi koru.",
    "Var olan kurallar ile celisen yaratici ama kontrolsuz kararlar verme.",
    "Cevabi yarim kesme; tum istenen dosyalari ve gerekli baglanti kodlarini ver.",
    "Ornek iskelet degil, calistirilabilir ve uretime yakin bir cozum ver.",
    "State akislarini, event handler'lari, prop zincirlerini ve import-export baglantilarini eksiksiz tamamla.",
    "Eksik dependency, eksik route, eksik provider, baglanmamis component veya yarim entegrasyon birakma.",
    "Istenen yapida form, liste, filtre, sepet, modal veya API akisi varsa aradaki wiring kodunu atlama.",
    "Ciktiyi yari bitmis demo gibi degil, ekipte gelistirilmeye devam edilebilecek duzgun bir teslim olarak hazirla.",
  ];

  const deliveryContract = [
    "Sadece fikir verme; istenen cozumun gercek kodunu ver.",
    "Dosyalar birbirine bagli calisacak sekilde import, export, state ve event akislarini tamamla.",
    "Kodda TODO, FIXME, placeholder data veya 'ornek olarak' diye yarim birakilan bolumler kullanma.",
    "Aksi belirtilmedikce, cikti mevcut ekip tarafindan gelistirilmeye devam edilebilecek kadar duzenli ve tutarli olsun.",
  ];

  const ruleModules = [
    {
      id: "semantic-html",
      title: "Kural Dosyasi 1: HTML ve Erisilebilirlik",
      shortTitle: "HTML",
      badge: "Temel yapi",
      summary:
        "Semantik HTML, alt metin, form erisilebilirligi ve guvenli link kullanimi icin cekirdek kurallar.",
      lines: [
        "header, nav, main, section, article, aside ve footer gibi semantik etiketleri tercih et.",
        "Tum img etiketlerinde alt kullan; dekoratif gorsellerde alt bos olabilir.",
        "Her form alanini label, htmlFor veya esit erisilebilir isimle bagla.",
        "Form icindeki button elemanlarinda type mutlaka acikca yazilsin.",
        "target=\"_blank\" kullanan linklerde rel=\"noopener noreferrer\" ekle.",
      ],
    },
    {
      id: "styling-system",
      title: "Kural Dosyasi 2: CSS ve Tasarim Sistemi",
      shortTitle: "CSS",
      badge: "Stil sistemi",
      summary:
        "Scoped styling, token yapisi, mobile-first responsive ve okunabilir sinif isimleri icin kurallar.",
      lines: [
        "Tailwind, CSS Modules veya benzeri scoped stil stratejisi tercih et.",
        "Duz CSS gerekiyorsa BEM isimlendirme kullan.",
        "Renk, bosluk, tipografi ve radius degerlerini token veya CSS variable ile yonet.",
        "Responsive yaklasim mobile-first olsun; kucuk ekrandan buyuge ilerle.",
        "Tekrarlanan stil mantigini ortak utility veya component seviyesinde toparla.",
      ],
    },
    {
      id: "react-architecture",
      title: "Kural Dosyasi 3: React ve JavaScript Standartlari",
      shortTitle: "React",
      badge: "Kod duzeni",
      summary:
        "Naming convention, Hook kullanimi, props destructuring ve sade JSX icin ana uygulama kurallari.",
      lines: [
        "Component isimleri PascalCase, fonksiyon ve degisken isimleri camelCase, sabitler UPPER_SNAKE_CASE olsun.",
        "Props destructuring kullan ve JSX icinde agir hesap yazma; hesaplari return oncesi hazirla.",
        "Hook'lari sadece top-level kullan; loop, kosul veya nested function icinde Hook cagir ma.",
        "Sadece === ve !== kullan; var kullanma, const ve let tercih et.",
        "Mantigi okunur helper fonksiyonlara bol, bilesenleri gereksiz buyutme.",
      ],
    },
    {
      id: "project-structure",
      title: "Kural Dosyasi 4: Proje Mimari ve Dosya Duzeni",
      shortTitle: "Mimari",
      badge: "Moduler yapi",
      summary:
        "Dosya uzantilari, moduler klasor yapisi, index export duzeni ve tekrari azaltan component ayristirmasi.",
      lines: [
        "React bilesenleri icin .jsx veya .tsx, saf mantik dosyalari icin .js veya .ts kullan.",
        "Bilesenleri ve utility dosyalarini mantikli klasorlerde grupla.",
        "Uygun yerlerde index export ile import yollarini sade tut.",
        "Buyuk bilesenleri daha kucuk ve tekrar kullanilabilir parcalara bol.",
        "Var olan tasarim sistemi varsa onu bozma; yeni yapilar mevcut duzene uyumlu olsun.",
      ],
    },
    {
      id: "quality-safety",
      title: "Kural Dosyasi 5: Guvenlik, Hata ve Kalite",
      shortTitle: "Guvenlik",
      badge: "Risk kontrolu",
      summary:
        "XSS, Error Boundary, validation ve kod kalite araclari ile ilgili zorunlu prensipler.",
      lines: [
        "dangerouslySetInnerHTML kullanma; mecbursa sanitize edilmemis icerik render etme.",
        "Kritik UI alanlarinda Error Boundary dusun.",
        "Kullanici girdilerini dogrula; hata mesajlarini net ve kontrollu ver.",
        "Kod ESLint ve Prettier uyumlu olmali; Husky ve lint-staged akisina ters dusme.",
        "Gecici hack yerine kalici ve aciklanabilir cozum uret.",
      ],
    },
    {
      id: "performance-delivery",
      title: "Kural Dosyasi 6: Performans ve Teslimat",
      shortTitle: "Performans",
      badge: "Uretim kalitesi",
      summary:
        "Lazy loading, optimize gorsel kullanimi ve ilk acilis performansi icin gerekli son kurallar.",
      lines: [
        "Agir ekranlari veya route'lari React.lazy ve Suspense ile bol.",
        "Uygun gorsellerde loading=\"lazy\" kullan.",
        "Mumkunse WebP veya AVIF gibi optimize formatlari tercih et.",
        "Gereksiz bundle buyumesine ve tekrarli bagimliliklara dikkat et.",
        "Performans iyilestirmesi gerekiyorsa davranisi bozmadan minimum gerekli degisikligi yap.",
      ],
    },
  ];

  const taskTemplates = [
    {
      id: "new-project",
      title: "Yeni Proje",
      badge: "Sifirdan kurulum",
      summary:
        "Sifirdan proje, panel, uygulama veya tam moduler dosya yapisi kurdurmak icin kullanin.",
      instructions: [
        "Projeyi sifirdan kur ve dosya yapisini mantikli sekilde parcala.",
        "UI varsa modern, temiz ve mobile-first tasarla.",
        "Backend varsa validation, endpoint ve hata yonetimini net kur.",
        "Gereksiz boilerplate yazma; yalnizca gereken dosyalari uret.",
        "Ana akislari yari birakma; projeyi acilista calisabilir iskelete kadar tamamla.",
      ],
      requestLabel: "PROJE ISTEGI",
      requestPlaceholder:
        "[Buraya proje amacini, hedef kullaniciyi, teknoloji tercihini ve beklenen ozellikleri yazin]",
    },
    {
      id: "frontend-screen",
      title: "Frontend Ekran",
      badge: "UI / React",
      summary:
        "Tek ekran, dashboard, form veya panel tasarlatip kodlatmak icin kullanin.",
      instructions: [
        "Ekrani React ile uret ve component yapisini bol.",
        "Formlar, kartlar ve durum alanlari semantik ve erisilebilir olsun.",
        "Responsive davranisi mobil oncelikli kur.",
        "Gerekirse lazy-load edilmeye uygun bolumlere ayir.",
        "Tek bir kart ornegi verme; ekranin butun ana bolumlerini ve baglantilarini tamamla.",
      ],
      requestLabel: "EKRAN ISTEGI",
      requestPlaceholder:
        "[Buraya ekranin amacini, bolumlerini, kullanici aksiyonlarini ve veri alanlarini yazin]",
    },
    {
      id: "backend-api",
      title: "Backend API",
      badge: "Servis / Endpoint",
      summary:
        "Endpoint, servis, validation veya veri akisi kurarken temiz backend cikisi almak icin kullanin.",
      instructions: [
        "Temiz katmanlama kullan; input validation ve hata yonetimini belirginlestir.",
        "Request ve response yapisini acik yaz.",
        "Guvenlik risklerini azaltacak sekilde coding yap.",
        "Gerekiyorsa test eklemeye uygun, moduler backend kodu ver.",
        "Controller, service, schema/serializer ve temel hata akislarini kopuk birakma.",
      ],
      requestLabel: "BACKEND GOREVI",
      requestPlaceholder:
        "[Buraya endpoint amacini, veri modelini, request-response yapisini ve is kurallarini yazin]",
    },
    {
      id: "bug-fix",
      title: "Bug Fix",
      badge: "Hata duzeltme",
      summary:
        "Mevcut projede bir hatayi kurallari koruyarak duzeltmek icin kullanin.",
      instructions: [
        "Hatanin kok nedenini acikla.",
        "Sadece yamalama yapma; temiz ve kalici cozum uret.",
        "Gerekirse ilgili kodu refactor et ama davranisi gereksiz bozma.",
        "Cozum sonunda hangi kurallara uyuldugunu checklist ile yaz.",
        "Sadece sorunlu satiri degil, sorunun sebep oldugu bagli kod akislarini da duzelt.",
      ],
      requestLabel: "KOD / HATA",
      requestPlaceholder:
        "[Buraya ilgili kodu, hata mesajini, beklenen davranisi ve gerekirse stack trace'i yazin]",
    },
    {
      id: "refactor",
      title: "Refactor",
      badge: "Mevcut kodu toparla",
      summary:
        "Eski veya daginik kodu ekip kurallarina yaklastirip daha bakimli hale getirmek icin kullanin.",
      instructions: [
        "Davranisi koru ama okunabilirligi ve modulerligi artir.",
        "Naming, dosya yapisi ve JSX mantigini toparla.",
        "Tekrari azalt, gerekirse helper fonksiyonlara bol.",
        "Degisiklik sonunda refactor stratejisini ve kurallara uyumu ozetle.",
        "Refactor sonrasi moduller birbirinden kopuk kalmasin; tum baglantilar tutarli olsun.",
      ],
      requestLabel: "MEVCUT MODUL",
      requestPlaceholder:
        "[Buraya refactor edilmesini istediginiz dosyayi, modulu veya mevcut yapinin problemlerini yazin]",
    },
    {
      id: "governance-fix",
      title: "Kural Ihlali Giderme",
      badge: "Governance uyumu",
      summary:
        "Kod yonetimi ekraninda gorulen ihlalleri dosya bazli ve standartlara uygun duzeltmek icin kullanin.",
      instructions: [
        "Her ihlali tek tek ele al ve dosya bazli cozum ver.",
        "Davranisi gereksiz buyuk rewrite ile bozma.",
        "Ayni dosyada ilgili baska standartlari da mantikliysa beraber toparla.",
        "Sonunda hangi ihlallerin kapandigini checklist olarak yaz.",
        "Ihlali kapatirken dosyanin mevcut akislarini bozma ve duzeltmeyi yari birakma.",
      ],
      requestLabel: "IHLAL VE DOSYALAR",
      requestPlaceholder:
        "[Buraya ihlal isimlerini, dosya yollarini, hata mesajlarini ve gerekiyorsa kod parcalarini yazin]",
    },
  ];

  return {
    pageBadge: "AI Prompt Rehberi",
    title: "Tum yapay zekalar icin ortak kod standardi prompt sistemi",
    governance: "Kod Yonetimi",
    codeRules: "Kod Kurallari",
    copy: "Kopyala",
    copied: "Kopyalandi",
    copyGenerated: "Olusan promptu kopyala",
    selectedTask: "Gorev tipi",
    selectedRules: "Aktif kural dosyalari",
    requirementLabel: "Ihtiyac / gorev detayi",
    requirementHint:
      "Buraya proje istegi, ekran tanimi, bug detaylari veya governance ihlallerini yazin.",
    includeChecklist: "Cikti sonunda kurallara uyum checklisti iste",
    includeFileDiff: "Dosya bazli degisiklik ozeti iste",
    includeArchitecture: "Kisa mimari veya cozum yonu iste",
    copySuccess: "AI promptu kopyalandi.",
    copyFailed: "Prompt kopyalanamadi.",
    hardRulesTitle: "Cevabi birbirine yaklastiran sert kisitlar",
    masterPromptIntro:
      "Sen kidemli bir yazilim muhendisisin. Asagidaki gorevi, secilen takim kural dosyalarina tamamen uyarak cozumle.",
    deliveryContractTitle: "TESLIM ZORUNLULUKLARI",
    outputTitle: "CIKTI FORMATI",
    outputLines: [
      "1. Problemi veya istegi kisa analiz et.",
      "2. Cozum yonunu veya mimari kararini acikla.",
      "3. Dosya bazli degisiklik ozetini ver.",
      "4. Calisir ve tutarli kodu ver.",
      "5. Sonunda kurallara uyum checklisti yaz.",
      "6. Risk, varsayim veya eksik veri varsa acikca belirt.",
      "7. Kodun yari kalmadigini ve tum ana baglantilarin tamamlandigini dogrula.",
    ],
    genericAiLabel: "Tum AI araclarina uygun",
    defaultRequirement: "Buraya kendi isteginizi yazin.",
    deliveryContract,
    hardRequirements,
    ruleModules,
    taskTemplates,
  };
};

const buildEnglishLibrary = () => {
  const hardRequirements = [
    "Do not leave placeholders, pseudo-code, or 'fill this later' sections.",
    "Return complete, working, and internally consistent code blocks.",
    "Keep one naming convention across files, components, and folders for the same task.",
    "Do not make uncontrolled creative choices that conflict with the selected rules.",
    "Do not stop early; include all requested files and the necessary wiring code.",
    "Do not return a loose example skeleton; return a production-leaning working solution.",
    "Complete state flows, event handlers, prop wiring, imports, and exports end to end.",
    "Do not leave missing providers, missing routes, unconnected components, or incomplete integration points.",
    "If the task involves forms, lists, filters, carts, modals, or API flows, include the connecting logic too.",
    "Prepare the result as a clean team handoff, not as a half-finished demo.",
  ];

  const deliveryContract = [
    "Do not only describe the idea; deliver the real implementation code.",
    "Finish imports, exports, state flow, and event flow so the files work together coherently.",
    "Do not use TODOs, FIXME notes, placeholder data, or 'example only' gaps unless the user explicitly requests them.",
    "Unless told otherwise, the result should be clean enough for a team to continue building on directly.",
  ];

  const ruleModules = [
    {
      id: "semantic-html",
      title: "Rule File 1: HTML and Accessibility",
      shortTitle: "HTML",
      badge: "Core structure",
      summary:
        "Core rules for semantic HTML, alt text, form accessibility, and safe external links.",
      lines: [
        "Prefer semantic tags such as header, nav, main, section, article, aside, and footer.",
        "Every img element must include alt text; decorative images may use an empty alt.",
        "Pair every form field with a label, htmlFor, or an equivalent accessible name.",
        "Always declare button type explicitly inside forms.",
        "Add rel=\"noopener noreferrer\" to links that use target=\"_blank\".",
      ],
    },
    {
      id: "styling-system",
      title: "Rule File 2: CSS and Design System",
      shortTitle: "CSS",
      badge: "Styling system",
      summary:
        "Rules for scoped styling, tokens, mobile-first responsive behavior, and readable class structure.",
      lines: [
        "Prefer Tailwind, CSS Modules, or another scoped styling strategy.",
        "If plain CSS is required, use BEM naming.",
        "Manage color, spacing, typography, and radius through tokens or CSS variables.",
        "Follow a mobile-first responsive approach from small screens upward.",
        "Consolidate repeated styling logic into shared utilities or components.",
      ],
    },
    {
      id: "react-architecture",
      title: "Rule File 3: React and JavaScript Standards",
      shortTitle: "React",
      badge: "Code structure",
      summary:
        "Main implementation rules for naming, Hooks, props destructuring, and simple JSX.",
      lines: [
        "Use PascalCase for components, camelCase for variables/functions, and UPPER_SNAKE_CASE for constants.",
        "Use props destructuring and move heavy calculations outside JSX before return.",
        "Call Hooks only at the top level, never inside loops, conditions, or nested functions.",
        "Use only === and !==, and never use var.",
        "Break large logic into readable helper functions and avoid oversized components.",
      ],
    },
    {
      id: "project-structure",
      title: "Rule File 4: Project Architecture and File Layout",
      shortTitle: "Architecture",
      badge: "Modular layout",
      summary:
        "Rules for extensions, modular folder structure, index exports, and reusable file organization.",
      lines: [
        "Use .jsx/.tsx for UI components and .js/.ts for pure logic files.",
        "Group components and utilities in sensible folders.",
        "Use index exports where they simplify import paths.",
        "Split large files into smaller reusable parts.",
        "If an existing design system exists, preserve it instead of replacing it.",
      ],
    },
    {
      id: "quality-safety",
      title: "Rule File 5: Security, Error Handling, and Quality",
      shortTitle: "Safety",
      badge: "Risk control",
      summary:
        "Mandatory practices for XSS safety, Error Boundaries, validation, and code quality workflows.",
      lines: [
        "Avoid dangerouslySetInnerHTML; never render unsanitized content.",
        "Consider Error Boundaries for critical UI areas.",
        "Validate user input and keep error messages explicit and controlled.",
        "Keep the result compatible with ESLint, Prettier, Husky, and lint-staged.",
        "Avoid temporary hacks and prefer durable, explainable fixes.",
      ],
    },
    {
      id: "performance-delivery",
      title: "Rule File 6: Performance and Delivery",
      shortTitle: "Performance",
      badge: "Production quality",
      summary:
        "Final rules for lazy loading, image optimization, and first-load performance.",
      lines: [
        "Split heavy screens or routes with React.lazy and Suspense.",
        "Use loading=\"lazy\" on appropriate images.",
        "Prefer optimized formats such as WebP or AVIF where practical.",
        "Avoid unnecessary bundle growth and repeated dependencies.",
        "Improve performance with the smallest safe change that preserves behavior.",
      ],
    },
  ];

  const taskTemplates = [
    {
      id: "new-project",
      title: "New Project",
      badge: "From scratch",
      summary:
        "Use this when you want a complete project, panel, or modular app generated from the ground up.",
      instructions: [
        "Build the project from scratch and split the structure into sensible modules.",
        "If there is UI, make it modern, clean, and mobile-first.",
        "If there is backend work, keep validation, endpoints, and error handling explicit.",
        "Avoid unnecessary boilerplate and generate only the files that matter.",
        "Do not stop at a shell; carry the core project flow to a runnable baseline.",
      ],
      requestLabel: "PROJECT REQUEST",
      requestPlaceholder:
        "[Describe the product goal, target users, preferred technology, and expected features here]",
    },
    {
      id: "frontend-screen",
      title: "Frontend Screen",
      badge: "UI / React",
      summary: "Use this for single screens, dashboards, panels, and forms.",
      instructions: [
        "Build the screen in React and keep the component structure modular.",
        "Make forms, cards, and states semantic and accessible.",
        "Use a mobile-first responsive layout.",
        "Split sections so they can be lazy-loaded when useful.",
        "Do not return a single-card mockup; complete the main screen sections and their wiring.",
      ],
      requestLabel: "SCREEN REQUEST",
      requestPlaceholder:
        "[Describe the screen goal, sections, user actions, and data fields here]",
    },
    {
      id: "backend-api",
      title: "Backend API",
      badge: "Service / Endpoint",
      summary: "Use this for endpoints, services, validation, and backend flows.",
      instructions: [
        "Use clean layering and make validation and error handling explicit.",
        "Describe the request and response shape clearly.",
        "Reduce security risks in the implementation.",
        "Keep the backend modular and ready for future tests.",
        "Do not leave the controller, service, schema/serializer, and base error flow disconnected.",
      ],
      requestLabel: "BACKEND TASK",
      requestPlaceholder:
        "[Describe the endpoint goal, data model, request-response format, and business rules here]",
    },
    {
      id: "bug-fix",
      title: "Bug Fix",
      badge: "Issue resolution",
      summary:
        "Use this to fix an existing issue while preserving team standards.",
      instructions: [
        "Explain the root cause.",
        "Do not patch the bug temporarily; provide a clean durable fix.",
        "Refactor related code if needed without unnecessary behavior changes.",
        "End with a checklist showing which rules were satisfied.",
        "Fix connected flows too, not just the single failing line.",
      ],
      requestLabel: "CODE / ERROR",
      requestPlaceholder:
        "[Paste the code, the error message, the expected behavior, and optionally the stack trace here]",
    },
    {
      id: "refactor",
      title: "Refactor",
      badge: "Clean existing code",
      summary:
        "Use this to bring older or messy code closer to team conventions.",
      instructions: [
        "Preserve behavior while improving readability and modularity.",
        "Clean up naming, file structure, and JSX logic.",
        "Reduce duplication and split logic into helpers when appropriate.",
        "Summarize the refactor strategy and standards alignment at the end.",
        "Do not leave the refactored modules partially disconnected from each other.",
      ],
      requestLabel: "EXISTING MODULE",
      requestPlaceholder:
        "[Describe the file, module, or current pain points that should be refactored here]",
    },
    {
      id: "governance-fix",
      title: "Governance Violation Fix",
      badge: "Governance alignment",
      summary:
        "Use this to fix the exact findings shown in the code governance screen.",
      instructions: [
        "Handle each finding explicitly and return file-based fixes.",
        "Avoid unnecessary large rewrites.",
        "When sensible, clean up related standards in the same file too.",
        "End with a checklist showing which findings were resolved.",
        "Close the finding without leaving the surrounding flow in a half-finished state.",
      ],
      requestLabel: "FINDINGS AND FILES",
      requestPlaceholder:
        "[Paste the rule names, file paths, error messages, and optional code snippets here]",
    },
  ];

  return {
    pageBadge: "AI Prompt Guide",
    title: "A shared coding-standard prompt system for every AI tool",
    governance: "Code Governance",
    codeRules: "Code Rules",
    copy: "Copy",
    copied: "Copied",
    copyGenerated: "Copy generated prompt",
    selectedTask: "Task type",
    selectedRules: "Active rule files",
    requirementLabel: "Requirement / task details",
    requirementHint:
      "Describe the project request, screen details, bug, or governance findings here.",
    includeChecklist: "Ask for a rule compliance checklist",
    includeFileDiff: "Ask for a file-based change summary",
    includeArchitecture: "Ask for a short architecture or solution direction",
    copySuccess: "AI prompt copied.",
    copyFailed: "Prompt could not be copied.",
    hardRulesTitle: "Hard constraints that push outputs closer together",
    masterPromptIntro:
      "You are a senior software engineer. Solve the task below while fully complying with the selected team rule files.",
    deliveryContractTitle: "DELIVERY REQUIREMENTS",
    outputTitle: "OUTPUT FORMAT",
    outputLines: [
      "1. Briefly analyze the problem or request.",
      "2. Explain the solution direction or architecture.",
      "3. Provide a file-based summary of changes.",
      "4. Return working and consistent code.",
      "5. End with a standards checklist.",
      "6. Clearly state risks, assumptions, or missing context.",
      "7. Confirm that the main wiring is complete and the solution is not left half-finished.",
    ],
    genericAiLabel: "Works across AI tools",
    defaultRequirement: "Write your request here.",
    deliveryContract,
    hardRequirements,
    ruleModules,
    taskTemplates,
  };
};

export const createAIPromptLibrary = (language) =>
  language === "tr" ? buildTurkishLibrary() : buildEnglishLibrary();

export const buildCombinedAIPrompt = ({
  library,
  selectedTaskId,
  selectedRuleIds,
  requirement,
  includeChecklist,
  includeFileDiff,
  includeArchitecture,
}) => {
  const selectedTask =
    library.taskTemplates.find((task) => task.id === selectedTaskId) ||
    library.taskTemplates[0];
  const selectedRules = library.ruleModules.filter((rule) =>
    selectedRuleIds.includes(rule.id)
  );

  const lines = [
    library.masterPromptIntro,
    "",
    "GOREV TIPI / TASK TYPE",
    `${selectedTask.title}`,
    "",
    "AKTIF KURAL DOSYALARI / ACTIVE RULE FILES",
  ];

  selectedRules.forEach((rule) => {
    lines.push(`- ${rule.title}`);
    rule.lines.forEach((line) => {
      lines.push(`  - ${line}`);
    });
  });

  lines.push("", "GOREVE OZEL BEKLENTILER / TASK EXPECTATIONS");
  selectedTask.instructions.forEach((line) => {
    lines.push(`- ${line}`);
  });

  lines.push("", library.deliveryContractTitle);
  library.deliveryContract.forEach((line) => {
    lines.push(`- ${line}`);
  });

  lines.push("", library.outputTitle);
  library.outputLines.forEach((line) => {
    lines.push(line);
  });

  if (includeArchitecture || includeFileDiff || includeChecklist) {
    lines.push("", "EK CIKTI ISTEKLERI / EXTRA OUTPUT REQUESTS");
    if (includeArchitecture) {
      lines.push("- Cozumden once kisa mimari veya uygulama yonu ver.");
    }
    if (includeFileDiff) {
      lines.push("- Dosya bazli degisiklik ozetini acik yaz.");
    }
    if (includeChecklist) {
      lines.push("- Sonda kurallara uyum checklisti ekle.");
    }
  }

  lines.push("", "SERT KISITLAR / HARD CONSTRAINTS");
  library.hardRequirements.forEach((line) => {
    lines.push(`- ${line}`);
  });

  lines.push(
    "",
    `${selectedTask.requestLabel}`,
    requirement?.trim() || library.defaultRequirement
  );

  return lines.join("\n");
};
