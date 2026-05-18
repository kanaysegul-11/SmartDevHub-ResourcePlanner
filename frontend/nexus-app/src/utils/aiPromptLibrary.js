const buildTurkishLibrary = () => {
  const hardRequirements = [
    "Eksik bırakma, pseudo-code yazma veya 'burayı sen doldur' benzeri placeholder kullanma.",
    "Kod bloklarını tam, çalışır ve birbiriyle tutarlı ver.",
    "Aynı problem için dosya isimleri, component isimleri ve klasör düzeni boyunca tek bir naming standardı koru.",
    "Var olan kurallar ile çelişen yaratıcı ama kontrolsüz kararlar verme.",
    "Cevabı yarım kesme; tüm istenen dosyaları ve gerekli bağlantı kodlarını ver.",
    "Örnek iskelet değil, çalıştırılabilir ve üretime yakın bir çözüm ver.",
    "State akışlarını, event handler'ları, prop zincirlerini ve import-export bağlantılarını eksiksiz tamamla.",
    "Eksik dependency, eksik route, eksik provider, bağlanmamış component veya yarım entegrasyon bırakma.",
    "İstenen yapıda form, liste, filtre, sepet, modal veya API akışı varsa aradaki wiring kodunu atlama.",
    "Çıktıyı yarı bitmiş demo gibi değil, ekipte geliştirilmeye devam edilebilecek düzgün bir teslim olarak hazırla.",
  ];

  const deliveryContract = [
    "Sadece fikir verme; istenen çözümün gerçek kodunu ver.",
    "Dosyalar birbirine bağlı çalışacak şekilde import, export, state ve event akışlarını tamamla.",
    "Kodda TODO, FIXME, placeholder data veya 'örnek olarak' diye yarım bırakılan bölümler kullanma.",
    "Aksi belirtilmedikçe, çıktı mevcut ekip tarafından geliştirilmeye devam edilebilecek kadar düzenli ve tutarlı olsun.",
  ];

  const projectContract = [
    "Çıktı yeni ve bağımsız bir demo ekran değil, mevcut SmartDevHub-ResourcePlanner projesine uygulanabilir patch olarak hazırlanmalı.",
    "Frontend ana uygulama React/Vite ve JSX kullanır; yeni ana ekran kodları .jsx, saf yardımcı kodlar .js dosyalarına yazılmalı.",
    "Software Assets ekranı için mevcut sayfa yolu frontend/nexus-app/src/pages/SoftwareAssets.jsx olarak korunmalı.",
    "Software Assets componentleri gerekiyorsa frontend/nexus-app/src/component/softwareAssets/ altında mevcut naming düzenine uygun tutulmalı.",
    "API çağrıları frontend/nexus-app/src/refine/axios.js içindeki apiClient ile yapılmalı; fetch/axios instance tekrar oluşturulmamalı.",
    "Rol kontrolü mevcut useUser akışı ve userData?.isAdmin bilgisiyle yapılmalı.",
    "Backend alan adları değiştirilmemeli: license_mode, record_type, operational_status, provider_code, seats_total, billing_cycle, purchase_price, currency, assignments, primary_assignment ve license_requests kullanılmalı.",
    "Ortak lisans ayrımı license_mode === \"shared\", kişiye atanmış lisans ayrımı license_mode === \"assigned\" üzerinden yapılmalı.",
    "Mock data, seed data, local-only demo state veya gerçek API yerine sahte veri eklenmemeli.",
    "Yeni route, yeni framework, yeni tasarım sistemi veya TypeScript geçişi istenmedikçe önerilmemeli.",
    "Çıktı dosya bazlı değişiklikleri mevcut dosya yollarına göre vermeli ve hangi mevcut kodun değişeceğini açık söylemeli.",
    "Aynı görev farklı AI araçlarına verildiğinde dosya yolu, model alanı, component isimlendirmesi ve API sözleşmesi aynı kalmalı.",
  ];

  const teamCollaborationContract = [
    "Frontend işi önce dosya sahipliklerine bölünmeli; her geliştirici yalnızca kendisine verilen dosya veya klasörlerde değişiklik istemeli.",
    "AI çıktısı verilen sahiplik sınırının dışına çıkarsa kabul edilmemeli.",
    "Ortak dosya değişikliği gerekiyorsa AI kod yazmak yerine bunu koordinasyon riski olarak belirtmeli.",
    "Aynı dosyaya aynı anda birden fazla kişinin AI çıktısı uygulanmamalı.",
    "Sayfa sahibi ana state, route ve API akışı kararlarından sorumlu olmalı.",
    "Component sahibi yalnızca kendisine verilen component arayüzü, prop sözleşmesi ve görsel davranıştan sorumlu olmalı.",
    "Her prompt izin verilen dosyaları, yasaklı dosyaları ve beklenen çıktı formatını açıkça içermeli.",
    "AI yeni route, yeni dependency veya yeni tasarım sistemi önermeden önce gerekçe ve koordinasyon notu vermeli.",
    "Tüm geliştiriciler aynı component naming, aynı API client, aynı rol kontrolü ve aynı dosya uzantısı standardını korumalı.",
    "AI cevapları birebir aynı olmak zorunda değil; aynı sözleşmeye göre değerlendirilebilir olmak zorunda.",
    "Task isteği proje sözleşmesiyle çelişirse AI önce çelişki raporu vermeli ve netleşmeden kod üretmemeli.",
    "Her çıktı dosya sahipliği, API standardı, mock data yasağı, erişilebilirlik, lint ve build checklistiyle bitmeli.",
  ];

  const ruleModules = [
    {
      id: "semantic-html",
      title: "Kural Dosyası 1: HTML ve Erişilebilirlik",
      shortTitle: "HTML",
      badge: "Temel yapı",
      summary:
        "Semantik HTML, alt metin, form erişilebilirliği ve güvenli link kullanımı için çekirdek kurallar.",
      lines: [
        "header, nav, main, section, article, aside ve footer gibi semantik etiketleri tercih et.",
        "Tüm img etiketlerinde alt kullan; dekoratif görsellerde alt boş olabilir.",
        "Her form alanını label, htmlFor veya eşit erişilebilir isimle bağla.",
        "Form içindeki button elemanlarında type mutlaka açıkça yazılsın.",
        "target=\"_blank\" kullanan linklerde rel=\"noopener noreferrer\" ekle.",
      ],
    },
    {
      id: "styling-system",
      title: "Kural Dosyası 2: CSS ve Tasarım Sistemi",
      shortTitle: "CSS",
      badge: "Stil sistemi",
      summary:
        "Scoped styling, token yapısı, mobile-first responsive ve okunabilir sınıf isimleri için kurallar.",
      lines: [
        "Tailwind, CSS Modules veya benzeri scoped stil stratejisi tercih et.",
        "Düz CSS gerekiyorsa BEM isimlendirme kullan.",
        "Renk, boşluk, tipografi ve radius değerlerini token veya CSS variable ile yönet.",
        "Responsive yaklaşım mobile-first olsun; küçük ekrandan büyüğe ilerle.",
        "Tekrarlanan stil mantığını ortak utility veya component seviyesinde toparla.",
      ],
    },
    {
      id: "react-architecture",
      title: "Kural Dosyası 3: React ve JavaScript Standartları",
      shortTitle: "React",
      badge: "Kod düzeni",
      summary:
        "Naming convention, Hook kullanımı, props destructuring ve sade JSX için ana uygulama kuralları.",
      lines: [
        "Component isimleri PascalCase, fonksiyon ve değişken isimleri camelCase, sabitler UPPER_SNAKE_CASE olsun.",
        "Props destructuring kullan ve JSX içinde ağır hesap yazma; hesapları return öncesi hazırla.",
        "Hook'ları sadece top-level kullan; loop, koşul veya nested function içinde Hook çağırma.",
        "Sadece === ve !== kullan; var kullanma, const ve let tercih et.",
        "Mantığı okunur helper fonksiyonlara böl, bileşenleri gereksiz büyütme.",
      ],
    },
    {
      id: "project-structure",
      title: "Kural Dosyası 4: Proje Mimari ve Dosya Düzeni",
      shortTitle: "Mimari",
      badge: "Modüler yapı",
      summary:
        "Dosya uzantıları, modüler klasör yapısı, index export düzeni ve tekrarı azaltan component ayrıştırması.",
      lines: [
        "React bileşenleri için .jsx veya .tsx, saf mantık dosyaları için .js veya .ts kullan.",
        "Bileşenleri ve utility dosyalarını mantıklı klasörlerde grupla.",
        "Uygun yerlerde index export ile import yollarını sade tut.",
        "Büyük bileşenleri daha küçük ve tekrar kullanılabilir parçalara böl.",
        "Var olan tasarım sistemi varsa onu bozma; yeni yapılar mevcut düzene uyumlu olsun.",
      ],
    },
    {
      id: "project-ai-contract",
      title: "Kural Dosyası 5: Proje AI Çıktı Sözleşmesi",
      shortTitle: "AI Sözleşme",
      badge: "Tek ekip standardı",
      summary:
        "Farklı AI araçlarının aynı proje alan adları, dosya yolları ve patch mantığıyla çıktı üretmesi için zorunlu proje sözleşmesi.",
      lines: projectContract,
    },
    {
      id: "team-ai-collaboration",
      title: "Kural Dosyası 6: Takım AI Çalışma Sözleşmesi",
      shortTitle: "Takım AI",
      badge: "Eş zamanlı çalışma",
      summary:
        "Birden fazla frontend geliştiricinin Cursor, Codex, Gemini veya ChatGPT ile aynı ekip standardında çalışması için dosya sahipliği ve review kuralları.",
      lines: teamCollaborationContract,
    },
    {
      id: "quality-safety",
      title: "Kural Dosyası 7: Güvenlik, Hata ve Kalite",
      shortTitle: "Güvenlik",
      badge: "Risk kontrolü",
      summary:
        "XSS, Error Boundary, validation ve kod kalite araçları ile ilgili zorunlu prensipler.",
      lines: [
        "dangerouslySetInnerHTML kullanma; mecbursa sanitize edilmemiş içerik render etme.",
        "Kritik UI alanlarında Error Boundary düşün.",
        "Kullanıcı girdilerini doğrula; hata mesajlarını net ve kontrollü ver.",
        "Kod ESLint ve Prettier uyumlu olmalı; Husky ve lint-staged akışına ters düşme.",
        "Geçici hack yerine kalıcı ve açıklanabilir çözüm üret.",
      ],
    },
    {
      id: "performance-delivery",
      title: "Kural Dosyası 8: Performans ve Teslimat",
      shortTitle: "Performans",
      badge: "Üretim kalitesi",
      summary:
        "Lazy loading, optimize görsel kullanımı ve ilk açılış performansı için gerekli son kurallar.",
      lines: [
        "Ağır ekranları veya route'ları React.lazy ve Suspense ile böl.",
        "Uygun görsellerde loading=\"lazy\" kullan.",
        "Mümkünse WebP veya AVIF gibi optimize formatları tercih et.",
        "Gereksiz bundle büyümesine ve tekrarlı bağımlılıklara dikkat et.",
        "Performans iyileştirmesi gerekiyorsa davranışı bozmadan minimum gerekli değişikliği yap.",
      ],
    },
  ];

  const taskTemplates = [
    {
      id: "new-project",
      title: "Yeni Proje",
      badge: "Sıfırdan kurulum",
      summary:
        "Sıfırdan proje, panel, uygulama veya tam modüler dosya yapısı kurdurmak için kullanın.",
      instructions: [
        "Projeyi sıfırdan kur ve dosya yapısını mantıklı şekilde parçala.",
        "UI varsa modern, temiz ve mobile-first tasarla.",
        "Backend varsa validation, endpoint ve hata yönetimini net kur.",
        "Gereksiz boilerplate yazma; yalnızca gereken dosyaları üret.",
        "Ana akışları yarı bırakma; projeyi açılışta çalışabilir iskelete kadar tamamla.",
      ],
      requestLabel: "PROJE İSTEĞİ",
      requestPlaceholder:
        "[Buraya proje amacını, hedef kullanıcıyı, teknoloji tercihini ve beklenen özellikleri yazın]",
    },
    {
      id: "frontend-screen",
      title: "Frontend Ekran",
      badge: "UI / React",
      summary:
        "Tek ekran, dashboard, form veya panel tasarlatıp kodlatmak için kullanın.",
      instructions: [
        "Ekranı React ile üret ve component yapısını böl.",
        "Formlar, kartlar ve durum alanları semantik ve erişilebilir olsun.",
        "Responsive davranışı mobil öncelikli kur.",
        "Gerekirse lazy-load edilmeye uygun bölümlere ayır.",
        "Tek bir kart örneği verme; ekranın bütün ana bölümlerini ve bağlantılarını tamamla.",
      ],
      requestLabel: "EKRAN İSTEĞİ",
      requestPlaceholder:
        "[Buraya ekranın amacını, bölümlerini, kullanıcı aksiyonlarını ve veri alanlarını yazın]",
    },
    {
      id: "backend-api",
      title: "Backend API",
      badge: "Servis / Endpoint",
      summary:
        "Endpoint, servis, validation veya veri akışı kurarken temiz backend çıkışı almak için kullanın.",
      instructions: [
        "Temiz katmanlama kullan; input validation ve hata yönetimini belirginleştir.",
        "Request ve response yapısını açık yaz.",
        "Güvenlik risklerini azaltacak şekilde coding yap.",
        "Gerekiyorsa test eklemeye uygun, modüler backend kodu ver.",
        "Controller, service, schema/serializer ve temel hata akışlarını kopuk bırakma.",
      ],
      requestLabel: "BACKEND GÖREVİ",
      requestPlaceholder:
        "[Buraya endpoint amacını, veri modelini, request-response yapısını ve iş kurallarını yazın]",
    },
    {
      id: "bug-fix",
      title: "Bug Fix",
      badge: "Hata düzeltme",
      summary:
        "Mevcut projede bir hatayı kuralları koruyarak düzeltmek için kullanın.",
      instructions: [
        "Hatanın kök nedenini açıkla.",
        "Sadece yamalama yapma; temiz ve kalıcı çözüm üret.",
        "Gerekirse ilgili kodu refactor et ama davranışı gereksiz bozma.",
        "Çözüm sonunda hangi kurallara uyulduğunu checklist ile yaz.",
        "Sadece sorunlu satırı değil, sorunun sebep olduğu bağlı kod akışlarını da düzelt.",
      ],
      requestLabel: "KOD / HATA",
      requestPlaceholder:
        "[Buraya ilgili kodu, hata mesajını, beklenen davranışı ve gerekirse stack trace'i yazın]",
    },
    {
      id: "refactor",
      title: "Refactor",
      badge: "Mevcut kodu toparla",
      summary:
        "Eski veya dağınık kodu ekip kurallarına yaklaştırıp daha bakımlı hale getirmek için kullanın.",
      instructions: [
        "Davranışı koru ama okunabilirliği ve modülerliği artır.",
        "Naming, dosya yapısı ve JSX mantığını toparla.",
        "Tekrarı azalt, gerekirse helper fonksiyonlara böl.",
        "Değişiklik sonunda refactor stratejisini ve kurallara uyumu özetle.",
        "Refactor sonrası modüller birbirinden kopuk kalmasın; tüm bağlantılar tutarlı olsun.",
      ],
      requestLabel: "MEVCUT MODÜL",
      requestPlaceholder:
        "[Buraya refactor edilmesini istediğiniz dosyayı, modülü veya mevcut yapının problemlerini yazın]",
    },
    {
      id: "governance-fix",
      title: "Kural İhlali Giderme",
      badge: "Governance uyumu",
      summary:
        "Kod yönetimi ekranında görülen ihlalleri dosya bazlı ve standartlara uygun düzeltmek için kullanın.",
      instructions: [
        "Her ihlali tek tek ele al ve dosya bazlı çözüm ver.",
        "Davranışı gereksiz büyük rewrite ile bozma.",
        "Aynı dosyada ilgili başka standartları da mantıklıysa beraber toparla.",
        "Sonunda hangi ihlallerin kapandığını checklist olarak yaz.",
        "İhlali kapatırken dosyanın mevcut akışlarını bozma ve düzeltmeyi yarı bırakma.",
      ],
      requestLabel: "İHLAL VE DOSYALAR",
      requestPlaceholder:
        "[Buraya ihlal isimlerini, dosya yollarını, hata mesajlarını ve gerekiyorsa kod parçalarını yazın]",
    },
  ];

  return {
    pageBadge: "AI Prompt Rehberi",
    title: "Tüm yapay zekalar için ortak kod standardı prompt sistemi",
    governance: "Kod Yönetimi",
    codeRules: "Kod Kuralları",
    copy: "Kopyala",
    copied: "Kopyalandı",
    copyGenerated: "Oluşan promptu kopyala",
    selectedTask: "Görev tipi",
    selectedRules: "Aktif kural dosyaları",
    requirementLabel: "İhtiyaç / görev detayı",
    requirementHint:
      "Buraya proje isteği, ekran tanımı, bug detayları veya governance ihlallerini yazın.",
    includeChecklist: "Çıktı sonunda kurallara uyum checklisti iste",
    includeFileDiff: "Dosya bazlı değişiklik özeti iste",
    includeArchitecture: "Kısa mimari veya çözüm yönü iste",
    copySuccess: "AI promptu kopyalandı.",
    copyFailed: "Prompt kopyalanamadı.",
    hardRulesTitle: "Cevabı birbirine yaklaştıran sert kısıtlar",
    masterPromptIntro:
      "Sen kıdemli bir yazılım mühendisisin. Aşağıdaki görevi, seçilen takım kural dosyalarına tamamen uyarak çözümle.",
    projectContractTitle: "PROJEYE ÖZEL SABİT SÖZLEŞME",
    deliveryContractTitle: "TESLİM ZORUNLULUKLARI",
    outputTitle: "ÇIKTI FORMATI",
    outputLines: [
      "1. Problemi veya isteği kısa analiz et.",
      "2. Çözüm yönünü veya mimari kararını açıkla.",
      "3. Dosya bazlı değişiklik özetini ver.",
      "4. Çalışır ve tutarlı kodu ver.",
      "5. Sonunda kurallara uyum checklisti yaz.",
      "6. Risk, varsayım veya eksik veri varsa açıkça belirt.",
      "7. Kodun yarı kalmadığını ve tüm ana bağlantıların tamamlandığını doğrula.",
    ],
    genericAiLabel: "Tüm AI araçlarına uygun",
    defaultRequirement: "Buraya kendi isteğinizi yazın.",
    deliveryContract,
    projectContract,
    teamCollaborationContract,
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

  const projectContract = [
    "The output must be an applicable patch for the existing SmartDevHub-ResourcePlanner project, not a new standalone demo screen.",
    "The main frontend app uses React/Vite with JSX; new main-app screen code must use .jsx and pure helpers must use .js.",
    "For the Software Assets screen, preserve the existing page path frontend/nexus-app/src/pages/SoftwareAssets.jsx.",
    "If Software Assets components are needed, keep them under frontend/nexus-app/src/component/softwareAssets/ and follow the existing naming style.",
    "Frontend API calls must use apiClient from frontend/nexus-app/src/refine/axios.js; do not create a second fetch or axios client.",
    "Role checks must use the existing useUser flow and userData?.isAdmin value.",
    "Do not rename backend fields: use license_mode, record_type, operational_status, provider_code, seats_total, billing_cycle, purchase_price, currency, assignments, primary_assignment, and license_requests.",
    "Shared licenses must use license_mode === \"shared\" and assigned personal licenses must use license_mode === \"assigned\".",
    "Do not add mock data, seed data, local-only demo state, or fake data in place of the real API flow.",
    "Do not introduce a new route, framework, design system, or TypeScript migration unless explicitly requested.",
    "The output must describe file-based changes against existing paths and clearly state which existing code changes.",
    "When the same task is sent to different AI tools, file paths, model fields, component naming, and API contracts must remain the same.",
  ];

  const teamCollaborationContract = [
    "Frontend work must be split into file ownership first; each developer may request changes only inside assigned files or folders.",
    "Reject AI output that changes files outside the assigned ownership boundary.",
    "If a shared file change is required, the AI must report it as a coordination risk instead of writing that code directly.",
    "Do not apply AI output from multiple people to the same file at the same time.",
    "The page owner is responsible for main state, route, and API-flow decisions.",
    "A component owner is responsible only for the assigned component API, props contract, and visual behavior.",
    "Every prompt must explicitly include allowed files, forbidden files, and expected output format.",
    "Before suggesting a new route, dependency, or design system, the AI must provide a reason and coordination note.",
    "Every developer must preserve the same component naming, API client, role-check convention, and file-extension standard.",
    "AI answers do not need to be text-identical; they must be measurable against the same contract.",
    "If the task conflicts with the project contract, the AI must report the conflict first and must not generate code until it is clarified.",
    "Every output must end with a checklist for file ownership, API standard, no mock data, accessibility, lint, and build.",
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
      id: "project-ai-contract",
      title: "Rule File 5: Project AI Output Contract",
      shortTitle: "AI Contract",
      badge: "One team standard",
      summary:
        "Mandatory project contract that keeps different AI tools aligned on the same fields, paths, and patch-based delivery style.",
      lines: projectContract,
    },
    {
      id: "team-ai-collaboration",
      title: "Rule File 6: Team AI Collaboration Contract",
      shortTitle: "Team AI",
      badge: "Parallel work",
      summary:
        "File ownership and review rules that keep frontend work consistent across Cursor, Codex, Gemini, ChatGPT, or other AI tools.",
      lines: teamCollaborationContract,
    },
    {
      id: "quality-safety",
      title: "Rule File 7: Security, Error Handling, and Quality",
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
      title: "Rule File 8: Performance and Delivery",
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
    projectContractTitle: "PROJECT-SPECIFIC FIXED CONTRACT",
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
    projectContract,
    teamCollaborationContract,
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
    "GÖREV TİPİ / TASK TYPE",
    `${selectedTask.title}`,
    "",
    library.projectContractTitle,
  ];

  library.projectContract.forEach((line) => {
    lines.push(`- ${line}`);
  });

  lines.push(
    "",
    "AKTİF KURAL DOSYALARI / ACTIVE RULE FILES",
  );

  selectedRules.forEach((rule) => {
    lines.push(`- ${rule.title}`);
    rule.lines.forEach((line) => {
      lines.push(`  - ${line}`);
    });
  });

  lines.push("", "GÖREVE ÖZEL BEKLENTİLER / TASK EXPECTATIONS");
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
    lines.push("", "EK ÇIKTI İSTEKLERİ / EXTRA OUTPUT REQUESTS");
    if (includeArchitecture) {
      lines.push("- Çözümden önce kısa mimari veya uygulama yönü ver.");
    }
    if (includeFileDiff) {
      lines.push("- Dosya bazlı değişiklik özetini açık yaz.");
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
