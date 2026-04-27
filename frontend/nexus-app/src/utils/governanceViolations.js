export const getViolationRecommendation = (violation) => {
  const code = violation?.code || "";
  const title = violation?.title || "";

  if (code === "tests_required" || title.toLowerCase().includes("tests")) {
    return "Projede test klasörü veya test dosyası bulunmalı. Örnek: tests/, __tests__/ ya da *.test.js gibi çalıştırılabilir testler ekleyin.";
  }
  if (code === "required_readme" || title.toLowerCase().includes("readme")) {
    return "Proje kök dizininde README.md olmalı. Kurulum, çalıştırma, test ve proje amacını kısa ama net anlatın.";
  }
  if (code === "no_var_keyword") {
    return "JavaScript kodunda var yerine const veya let kullanın. Değişmeyen değerlerde const, yeniden atanan değerlerde let tercih edin.";
  }
  if (code === "max_function_length") {
    return "Uzun fonksiyonları daha küçük, tek sorumluluklu fonksiyonlara bölün. Her fonksiyon belirli bir işi yapmalı.";
  }
  if (code === "python_snake_case_variables") {
    return "Python değişkenleri snake_case olmalı. Örnek: userName yerine user_name kullanın.";
  }
  if (code === "pull_request_description_required") {
    return "Pull request açıklaması değişikliğin ne yaptığını, etkisini ve test bilgisini içermeli.";
  }
  if (code === "commit_message_pattern" || code === "commit_message_convention") {
    return "Commit mesajı standart formata uymalı. Örnek: feat(auth): add login validation.";
  }
  if (code === "image_alt_required") {
    return "Tüm img etiketlerinde alt özelliği olmalı. Dekoratif görsellerde alt boş olabilir, içerik taşıyanlarda açıklayıcı metin yazın.";
  }
  if (code === "strict_equality_required") {
    return "JavaScript ve TypeScript kodunda == yerine ===, != yerine !== kullanın.";
  }
  if (code === "semantic_html_structure") {
    return "Sayfa iskeletinde yalnızca div kullanmak yerine header, nav, main, section, article, aside ve footer gibi semantik etiketleri tercih edin.";
  }
  if (code === "form_label_required") {
    return "Her anlamlı input, select veya textarea elemanını bir label, htmlFor ya da aria-label ile bağlayın.";
  }
  if (code === "no_dangerously_set_inner_html") {
    return "dangerouslySetInnerHTML kullanmayın; kullanmak zorundaysanız içeriği önce sanitize edin.";
  }
  if (code === "css_tokens_required") {
    return "Sabit renk ve boşluk değerleri yerine CSS değişkenleri veya tema tokenları kullanın.";
  }
  if (code === "mobile_first_css") {
    return "Responsive stilleri mobil temel alarak yazın; büyük ekranlar için min-width ile genişletin.";
  }
  if (code === "react_props_destructuring") {
    return "React bileşenlerinde props nesnesini içeride kullanmak yerine parametrede destructuring yapın.";
  }
  if (code === "react_hooks_top_level") {
    return "Hook'ları sadece bileşenin veya custom hook'un en üst seviyesinde çağırın; if, loop veya nested callback içine koymayın.";
  }
  if (code === "jsx_logic_should_stay_simple") {
    return "Karmaşık filtreleme, map veya hesaplamaları JSX dışında değişkene alın ve render kısmını sade tutun.";
  }
  if (code === "error_boundary_required") {
    return "Kritik arayüz bölümlerini ErrorBoundary ile sararak tek bir hata yüzünden tüm sayfanın çökmesini engelleyin.";
  }
  if (code === "button_type_required") {
    return "Form içindeki butonlarda type özelliğini açıkça belirtin. Örnek: type=\"button\" veya type=\"submit\".";
  }
  if (code === "eslint_config_required") {
    return "Projede ESLint konfigürasyonu bulunsun ve ekip standardı olarak Airbnb veya Google tabanlı kurallar kullanılsın.";
  }
  if (code === "prettier_config_required") {
    return "Projeye bir Prettier konfigürasyonu ekleyin ki ekipte format aynı kalsın.";
  }
  if (code === "husky_pre_commit_required") {
    return "Commit öncesi kalite kontrolleri için .husky/pre-commit gibi bir hook tanımlayın.";
  }
  if (code === "lint_staged_required") {
    return "Staged dosyalarda hızlı kontrol çalıştırmak için lint-staged veya eşdeğer bir yapı kurun.";
  }
  if (code === "lazy_loading_images") {
    return "İlk ekranda zorunlu olmayan görsellerde loading=\"lazy\" kullanın.";
  }
  if (code === "optimized_images_preferred") {
    return "Büyük görsellerde PNG/JPEG yerine mümkün olduğunda WebP veya AVIF gibi optimize formatları tercih edin.";
  }
  if (code === "external_links_noopener") {
    return "target=\"_blank\" kullanan bağlantılarda rel=\"noopener noreferrer\" ekleyin.";
  }

  return "Kod veya proje yapısı ilgili standarda uygun hale getirilmeli; dosya, satır ve mesajdaki sorun giderilmeli.";
};

export const getLocalizedSeverityLabel = (severity, t) => {
  const normalizedSeverity = String(severity || "unknown").toLowerCase();
  return t?.(
    `governance.severityLevels.${normalizedSeverity}`,
    normalizedSeverity
  ) || normalizedSeverity;
};

export const getViolationDisplayTitle = (violation, t) => {
  const code = violation?.code || "";
  if (code) {
    return (
      t?.(`governance.ruleTitles.${code}`, violation?.title || code) ||
      violation?.title ||
      code
    );
  }
  return violation?.title || t?.("governance.violationThis", "Violation");
};

export const getViolationDisplayMessage = (violation, t) => {
  const code = violation?.code || "";
  const metadata = violation?.metadata || {};

  if (code === "required_readme") {
    return t?.(
      "governance.ruleMessages.required_readme",
      "README.md dosyası proje kök dizininde bulunmuyor."
    );
  }
  if (code === "tests_required") {
    return t?.(
      "governance.ruleMessages.tests_required",
      "Projede çalıştırılabilir test klasörü veya test dosyası bulunmuyor."
    );
  }
  if (code === "semantic_html_structure") {
    return t?.(
      "governance.ruleMessages.semantic_html_structure",
      "Sayfa iskeletinde semantik yerleşim etiketleri yerine genel wrapper yapısı kullanılıyor."
    );
  }
  if (code === "no_var_keyword") {
    return t?.(
      "governance.ruleMessages.no_var_keyword",
      "JavaScript veya TypeScript kodunda var kullanımı bulundu."
    );
  }
  if (code === "image_alt_required") {
    return t?.(
      "governance.ruleMessages.image_alt_required",
      "Bir veya daha fazla görsel alt metni olmadan kullanılıyor."
    );
  }
  if (code === "python_snake_case_variables") {
    return t?.(
      "governance.ruleMessages.python_snake_case_variables",
      "Python değişken adlandırması snake_case standardına uymuyor."
    );
  }
  if (code === "form_label_required") {
    return t?.(
      "governance.ruleMessages.form_label_required",
      "Form kontrolü label veya erişilebilir isim olmadan kullanılıyor."
    );
  }
  if (code === "strict_equality_required") {
    return t?.(
      "governance.ruleMessages.strict_equality_required",
      "Gevşek eşitlik operatörü kullanılıyor."
    );
  }
  if (code === "no_dangerously_set_inner_html") {
    return t?.(
      "governance.ruleMessages.no_dangerously_set_inner_html",
      "dangerouslySetInnerHTML güvenlik incelemesi olmadan kullanılıyor."
    );
  }
  if (code === "css_tokens_required") {
    return t?.(
      "governance.ruleMessages.css_tokens_required",
      "Sabit stil değerleri yerine ortak token veya CSS variable kullanılması bekleniyor."
    );
  }
  if (code === "mobile_first_css") {
    return t?.(
      "governance.ruleMessages.mobile_first_css",
      "Responsive stil yapısı mobile-first prensibine uymuyor."
    );
  }
  if (code === "react_props_destructuring") {
    return t?.(
      "governance.ruleMessages.react_props_destructuring",
      "React bileşeninde props destructuring yerine props nesnesi doğrudan kullanılıyor."
    );
  }
  if (code === "react_hooks_top_level") {
    return t?.(
      "governance.ruleMessages.react_hooks_top_level",
      "React hook çağrısı top-level dışında konumlanmış görünüyor."
    );
  }
  if (code === "jsx_logic_should_stay_simple") {
    return t?.(
      "governance.ruleMessages.jsx_logic_should_stay_simple",
      "JSX içinde fazla karmaşık hesaplama veya zincirlenmiş mantık var."
    );
  }
  if (code === "error_boundary_required") {
    return t?.(
      "governance.ruleMessages.error_boundary_required",
      "Kritik arayüz alanı hata sınırı olmadan çalışıyor."
    );
  }
  if (code === "button_type_required") {
    return t?.(
      "governance.ruleMessages.button_type_required",
      "Button etiketinde açık type özelliği eksik."
    );
  }
  if (code === "commit_message_convention") {
    return t?.(
      "governance.ruleMessages.commit_message_convention",
      "Commit mesajı ekip formatına uymuyor."
    );
  }
  if (code === "eslint_config_required") {
    return t?.(
      "governance.ruleMessages.eslint_config_required",
      "Projede ESLint konfigürasyonu bulunmuyor."
    );
  }
  if (code === "prettier_config_required") {
    return t?.(
      "governance.ruleMessages.prettier_config_required",
      "Projede Prettier konfigürasyonu bulunmuyor."
    );
  }
  if (code === "husky_pre_commit_required") {
    return t?.(
      "governance.ruleMessages.husky_pre_commit_required",
      "Pre-commit kalite kontrol hook'u bulunmuyor."
    );
  }
  if (code === "lint_staged_required") {
    return t?.(
      "governance.ruleMessages.lint_staged_required",
      "Değişen dosyalar için staged-file kalite kontrolü eksik."
    );
  }
  if (code === "pull_request_description_required") {
    return t?.(
      "governance.ruleMessages.pull_request_description_required",
      "Pull request açıklaması beklenen ayrıntıyı içermiyor."
    );
  }
  if (code === "lazy_loading_images") {
    return t?.(
      "governance.ruleMessages.lazy_loading_images",
      "Kritik olmayan görselde loading=\"lazy\" kullanımı eksik."
    );
  }
  if (code === "optimized_images_preferred") {
    return t?.(
      "governance.ruleMessages.optimized_images_preferred",
      "Görsel varlığı daha optimize bir formatta sunulabilir."
    );
  }
  if (code === "external_links_noopener") {
    return t?.(
      "governance.ruleMessages.external_links_noopener",
      "Yeni sekmede açılan bağlantıda rel=\"noopener noreferrer\" eksik."
    );
  }
  if (code === "max_function_length") {
    const maxLines = metadata?.max_lines || 20;
    return t?.(
      "governance.ruleMessages.max_function_length",
      `Fonksiyon uzunluğu ${maxLines} satır sınırını aşıyor.`
    ) || `Fonksiyon uzunluğu ${maxLines} satır sınırını aşıyor.`;
  }

  return violation?.message || t?.("governance.noDescription", "Açıklama yok");
};

const extractFunctionName = (message = "") => {
  const match = String(message).match(/Function '([^']+)'/i);
  return match?.[1] || "problemliFonksiyon";
};

const toPascalCase = (value = "") =>
  String(value)
    .replace(/[^A-Za-z0-9]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");

export const getViolationFixExample = (violation) => {
  const code = violation?.code || "";

  if (code === "max_function_length") {
    const functionName =
      violation?.metadata?.function_name || extractFunctionName(violation?.message);
    const isPython = String(violation?.file_path || "").endsWith(".py");
    const pascalName = toPascalCase(functionName);
    const helpers = violation?.metadata?.suggested_helpers || [
      isPython ? `_prepare_${functionName}_data` : `prepare${pascalName}Data`,
      isPython ? `_apply_${functionName}_rules` : `create${pascalName}Handlers`,
      isPython ? `_build_${functionName}_result` : `render${pascalName}View`,
    ];
    const [prepareHelper, handlerHelper, renderHelper] = helpers;
    if (isPython) {
      return [
        `# Hedef: ${functionName} fonksiyonunu ${violation?.metadata?.max_lines || 20} satirin altina indirin.`,
        "# Ana fonksiyon sadece akisi yonetsin; detaylari helper fonksiyonlara tasiyin.",
        "",
        `def ${functionName}(params):`,
        `    prepared_data = ${prepareHelper}(params)`,
        `    result = ${handlerHelper}(prepared_data)`,
        `    return ${renderHelper}(result)`,
        "",
        `def ${prepareHelper}(params):`,
        "    # Mevcut fonksiyondaki veri hazirlama, filtreleme veya hesaplama satirlarini buraya tasiyin.",
        "    return {}",
        "",
        `def ${handlerHelper}(prepared_data):`,
        "    # Mevcut fonksiyondaki karar, validasyon veya is kurali satirlarini buraya tasiyin.",
        "    return prepared_data",
        "",
        `def ${renderHelper}(result):`,
        "    # Mevcut fonksiyondaki sonuc olusturma/dondurme kismini burada sade tutun.",
        "    return result",
      ].join("\n");
    }
    return [
      `// Hedef: ${functionName} fonksiyonunu ${violation?.metadata?.max_lines || 20} satirin altina indirin.`,
      `// Ana fonksiyon sadece akisi yonetsin; detaylari helper fonksiyonlara tasiyin.`,
      "",
      `const ${functionName} = (params) => {`,
      `  const preparedData = ${prepareHelper}(params);`,
      `  const handlers = ${handlerHelper}(params);`,
      "",
      `  return ${renderHelper}(preparedData, handlers);`,
      `};`,
      "",
      `const ${prepareHelper} = (params) => {`,
      `  // Mevcut fonksiyondaki veri hazirlama, filtreleme veya hesaplama satirlarini buraya tasiyin.`,
      `  return {};`,
      `};`,
      "",
      `const ${handlerHelper} = (params) => {`,
      `  // Mevcut fonksiyondaki event handler veya state guncelleme kisimlarini buraya tasiyin.`,
      `  return {};`,
      `};`,
      "",
      `const ${renderHelper} = (preparedData, handlers) => {`,
      `  // Mevcut JSX/render donusunu burada sade ve okunur sekilde kurun.`,
      `  return null;`,
      `};`,
    ].join("\n");
  }

  if (code === "no_var_keyword") {
    return [
      "// Hatali",
      "var total = calculateTotal(items);",
      "",
      "// Dogrusu",
      "const total = calculateTotal(items);",
      "",
      "// Deger sonradan yeniden ataniyorsa:",
      "let total = 0;",
      "total = calculateTotal(items);",
    ].join("\n");
  }

  if (code === "python_snake_case_variables") {
    const variableMatch = String(violation?.message || "").match(/'([^']+)'/);
    const variableName = variableMatch?.[1] || "userName";
    const snakeName = variableName
      .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
      .replace(/[^A-Za-z0-9_]+/g, "_")
      .toLowerCase();
    return [
      "# Hatali",
      `${variableName} = get_user_data()`,
      "",
      "# Dogrusu",
      `${snakeName} = get_user_data()`,
    ].join("\n");
  }

  if (code === "required_readme") {
    return [
      "# Proje Adi",
      "",
      "## Kurulum",
      "Projeyi calistirmak icin gerekli adimlari yazin.",
      "",
      "## Gelistirme",
      "Lokal calistirma komutlarini yazin.",
      "",
      "## Test",
      "Test komutunu ve beklenen sonucu yazin.",
    ].join("\n");
  }

  if (code === "tests_required") {
    return [
      "// Ornek test dosyasi: __tests__/example.test.js",
      "describe('ana davranis', () => {",
      "  it('beklenen sonucu uretir', () => {",
      "    expect(true).toBe(true);",
      "  });",
      "});",
    ].join("\n");
  }

  return "";
};

const IGNORED_PATH_PARTS = new Set([
  ".git",
  ".next",
  ".nuxt",
  ".turbo",
  ".venv",
  "__pycache__",
  "build",
  "coverage",
  "dist",
  "node_modules",
  "target",
  "vendor",
]);

export const isIgnoredRepositoryPath = (filePath = "") => {
  const parts = String(filePath)
    .replaceAll("\\", "/")
    .split("/")
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);
  return parts.some((part) => IGNORED_PATH_PARTS.has(part));
};

export const getRemediationSkipMessage = (item, t) => {
  const code = item?.code || "";
  const reason = item?.reason || "";

  if (reason.includes("requires review or an AI-generated patch")) {
    if (code === "max_function_length") {
      return t(
        "governance.skipMaxFunctionLength",
        "This needs a human-reviewed refactor. The system did not change the file automatically because splitting a long function can affect behavior."
      );
    }
    return t(
      "governance.skipReviewedPatchRequired",
      "This rule needs a reviewed patch first. The system did not create a branch or change code automatically."
    );
  }

  if (reason.includes("AI remediation draft") || reason.includes("splitting a function")) {
    if (code === "max_function_length") {
      return t(
        "governance.skipMaxFunctionLengthAiDraft",
        "Bu ihlal AI taslağıyla ele alınmalı. Sistem fonksiyonu tek tıkla bölmez; davranış değişebileceği için refactor çıktısı review edilmelidir."
      );
    }
  }

  if (reason.includes("no branch was created") || reason.includes("no deterministic automatic fix")) {
    if (code === "max_function_length") {
      return t(
        "governance.skipMaxFunctionLength",
        "This needs a human-reviewed refactor. The system did not change the file automatically because splitting a long function can affect behavior."
      );
    }
    return t(
      "governance.skipReviewedPatchRequired",
      "This rule needs a reviewed patch first. The system did not create a branch or change code automatically."
    );
  }

  if (reason.includes("already exists")) {
    return t(
      "governance.skipAlreadyExists",
      "The expected file already exists on the remediation branch."
    );
  }

  return reason || t("governance.skipReviewedPatchRequired", "This rule needs a reviewed patch first.");
};

export const isAlreadyHandledRemediationItem = (item) =>
  String(item?.reason || "").includes("already exists");

export const getLatestRepositoryScan = (scans = []) => {
  const sortedScans = [...scans].sort(
    (left, right) =>
      new Date(right.completed_at || right.created_at || 0) -
      new Date(left.completed_at || left.created_at || 0)
  );
  const completedScans = sortedScans.filter((scan) => scan.status === "completed");
  const hasMeaningfulResult = (scan) =>
    Boolean(
      Number.isFinite(Number(scan?.score)) ||
        Number(scan?.violation_count || 0) > 0 ||
        (scan?.violations || []).length > 0
    );

  return (
    completedScans.find((scan) => hasMeaningfulResult(scan)) ||
    completedScans[0] ||
    sortedScans[0] ||
    null
  );
};

export const summarizeViolationsByRule = (violations = []) => {
  const summaryMap = new Map();
  violations.forEach((violation) => {
    const key = violation.code || violation.title || "unknown";
    const current = summaryMap.get(key) || {
      code: violation.code || "unknown",
      title: violation.title || "Unknown violation",
      severity: violation.severity || "medium",
      count: 0,
    };
    current.count += 1;
    summaryMap.set(key, current);
  });

  return [...summaryMap.values()].sort(
    (left, right) => right.count - left.count || left.title.localeCompare(right.title)
  );
};
