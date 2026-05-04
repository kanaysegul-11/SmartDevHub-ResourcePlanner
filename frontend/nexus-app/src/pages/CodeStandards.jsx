import React, { useMemo, useState } from "react";
import { useList } from "@refinedev/core";
import { FeatherCode, FeatherShield } from "@subframe/core";
import { Link } from "react-router-dom";

import Sidebar from "../component/layout/Sidebar";
import { useI18n } from "../I18nContext.jsx";
import { useUser } from "../UserContext.jsx";
import { apiClient } from "../refine/axios";
import { Badge } from "../ui/components/Badge";
import { TopbarWithRightNav } from "../ui/components/TopbarWithRightNav";
import {
  getViolationFixExample,
  getViolationRecommendation,
} from "../utils/governanceViolations";

const EMPTY_ARRAY = [];
const RULE_CATEGORY_OPTIONS = [
  { value: "structure", label: "Yapı" },
  { value: "naming", label: "İsimlendirme" },
  { value: "style", label: "Stil" },
  { value: "testing", label: "Test" },
  { value: "security", label: "Güvenlik" },
  { value: "complexity", label: "Karmaşıklık" },
  { value: "quality", label: "Kalite" },
  { value: "workflow", label: "İş Akışı" },
  { value: "architecture", label: "Mimari" },
  { value: "performance", label: "Performans" },
  { value: "ai", label: "AI" },
];
const DEFAULT_RULE_FORM = {
  code: "",
  title: "",
  description: "",
  category: "style",
  severity: "medium",
  weight: 5,
  is_enabled: true,
};

const normalizeRuleCode = (value = "") =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const RULE_GUIDES = {
  required_readme: {
    why:
      "Dokumantasyon olmayan projelerde kurulum, calistirma ve test bilgisi kaybolur; ekip yeni projeye daha yavas adapte olur.",
    wrong: "Repository kok dizininde README.md yok.",
    right:
      "README.md icinde proje amaci, kurulum, gelistirme ve test basliklari bulunmali.",
    autoFix: "Güvenli otomatik düzeltilebilir",
  },
  tests_required: {
    why:
      "Test yapisi olmayan projelerde degisikliklerin yan etkisi gec fark edilir ve merge riski artar.",
    wrong: "Projede tests/, __tests__ veya *.test.* gibi calistirilabilir test yapisi yok.",
    right:
      "Davranisi kapsayan test dosyalari eklenmeli ve test komutu README ya da proje scriptlerinde belirtilmeli.",
    autoFix: "Kısmen otomatik, gerçek test içeriği inceleme ister",
  },
  no_var_keyword: {
    why:
      "var function-scope oldugu icin beklenmeyen yeniden tanimlama ve scope hatalarina yol acabilir.",
    wrong: "var total = calculateTotal(items);",
    right: "const total = calculateTotal(items); veya yeniden atama varsa let total = 0;",
    autoFix: "Güvenli otomatik düzeltilebilir",
  },
  python_snake_case_variables: {
    why:
      "Python kodunda ortak isimlendirme standardi okunabilirligi ve review kalitesini artirir.",
    wrong: "userName = get_user()",
    right: "user_name = get_user()",
    autoFix: "İnceleme gerektirir",
  },
  max_function_length: {
    why:
      "Uzun fonksiyonlar test etmeyi, review yapmayi ve hatanin kaynagini bulmayi zorlastirir.",
    wrong:
      "Tek fonksiyon icinde veri hazirlama, event handler, validasyon ve render mantigi birlikte duruyor.",
    right:
      "Ana fonksiyon akisi yonetmeli; veri hazirlama, handler ve render/sonuc uretme adimlari helper fonksiyonlara ayrilmali.",
    autoFix: "AI patch veya insan review gerektirir",
  },
  commit_message_pattern: {
    why:
      "Standart commit mesaji gecmisi taramayi, changelog uretmeyi ve release takibini kolaylastirir.",
    wrong: "update files",
    right: "feat(auth): add login validation",
    autoFix: "Bilgilendirme kuralı",
  },
  pull_request_description_required: {
    why:
      "Aciklamasiz PR'larda reviewer degisikligin amacini, etkisini ve test durumunu anlamakta zorlanir.",
    wrong: "Bos PR aciklamasi.",
    right: "Ne degisti, neden degisti, nasil test edildi bilgisi yazilmali.",
    autoFix: "Bilgilendirme kuralı",
  },
};

const categoryLabels = {
  documentation: "Dokumantasyon",
  testing: "Test",
  quality: "Kod Kalitesi",
  complexity: "Karmasiklik",
  style: "Stil",
  workflow: "Workflow",
};

const EXTRA_RULE_GUIDES = {
  semantic_html_structure: {
    why:
      "Semantik HTML yapisi SEO, ekran okuyucu uyumlulugu ve sayfa bolumlerinin daha net anlasilmasi icin onemlidir.",
    wrong: "Tum sayfa yapisini anlamsiz div katmanlariyla kurmak.",
    right:
      "Icerige gore header, nav, main, section, article, aside ve footer etiketlerini tercih edin.",
    autoFix: "Mimari review gerekir",
  },
  image_alt_required: {
    why:
      "Alt metinler erisilebilirlik icin zorunludur; ekran okuyucular gorselin amacini ancak alt metinle aktarabilir.",
    wrong: '<img src="/banner.png" />',
    right: '<img src="/banner.png" alt="Urun tanitim banneri" />',
    autoFix: "Inceleme gerektirir",
  },
  form_label_required: {
    why:
      "Form alanlarinin label ile baglanmasi hem klavye kullanimi hem de ekran okuyucu deneyimi icin onemlidir.",
    wrong: '<input id="email" type="email" placeholder="E-posta" />',
    right:
      '<label htmlFor="email">E-posta</label>\n<input id="email" type="email" />',
    autoFix: "Inceleme gerektirir",
  },
  strict_equality_required: {
    why:
      "Gevsek esitlik operatorleri tip donusumu yaptigi icin beklenmeyen buglara yol acabilir.",
    wrong: "if (value == 0) { ... }",
    right: "if (value === 0) { ... }",
    autoFix: "Cogu durumda guvenli, yine de review onerilir",
  },
  no_dangerously_set_inner_html: {
    why:
      "dangerouslySetInnerHTML kontrolsuz kullanildiginda XSS aciklarina neden olabilir.",
    wrong: '<div dangerouslySetInnerHTML={{ __html: userContent }} />',
    right: "Kullanici icerigini sanitize edin veya guvenli render yontemi kullanin.",
    autoFix: "Guvenlik review gerekir",
  },
  css_tokens_required: {
    why:
      "Renk, bosluk ve tipografi tokenlari ortak tasarim dili saglar ve stil daginikligini azaltir.",
    wrong: "color: #1d4ed8; padding: 14px;",
    right: "color: var(--primary-color); padding: var(--space-3);",
    autoFix: "Mimari review gerekir",
  },
  mobile_first_css: {
    why:
      "Mobil oncelikli stiller daha tutarli responsive davranis ve daha temiz override akisi saglar.",
    wrong: "@media (max-width: 768px) ile tum mantigi sondan eklemek.",
    right: "Temel stilleri mobil icin yazip daha sonra min-width ile buyutmek.",
    autoFix: "Mimari review gerekir",
  },
  react_props_destructuring: {
    why:
      "Props destructuring bilesen imzasini daha okunur yapar ve JSX icindeki props.xxx tekrarini azaltir.",
    wrong: "const Card = (props) => <h1>{props.title}</h1>;",
    right: "const Card = ({ title }) => <h1>{title}</h1>;",
    autoFix: "Guvenli refactor olabilir",
  },
  react_hooks_top_level: {
    why:
      "Hook'lar sadece bilesenlerin veya custom hook'larin en ust seviyesinde cagirilmalidir; aksi halde state sirasi bozulabilir.",
    wrong: "if (isOpen) { useEffect(() => { ... }, []); }",
    right: "useEffect(() => { if (isOpen) { ... } }, [isOpen]);",
    autoFix: "Inceleme gerektirir",
  },
  jsx_logic_should_stay_simple: {
    why:
      "Karmasik JSX ici mantik okunabilirligi ve test edilebilirligi dusurur.",
    wrong: "return <div>{items.filter(...).map(...).reduce(...)}</div>;",
    right: "Hesaplamayi return oncesinde bir degiskene alip JSX'i sade tutun.",
    autoFix: "Inceleme gerektirir",
  },
  error_boundary_required: {
    why:
      "Kritik arayuz bolumleri hata verdiginde tum sayfanin cokmesini engellemek gerekir.",
    wrong: "Tum uygulama tek bir hata ile beyaz ekrana dusuyor.",
    right: "Kritik bilesen agaclarini ErrorBoundary ile sarin.",
    autoFix: "Mimari review gerekir",
  },
  button_type_required: {
    why:
      "Form icindeki button elemanlari type belirtmezse beklenmeyen submit davranislari olusabilir.",
    wrong: "<button>Kapat</button>",
    right: '<button type="button">Kapat</button>',
    autoFix: "Guvenli refactor olabilir",
  },
  bem_class_naming: {
    why:
      "BEM sinif isimlendirmesi buyuyen arayuzlerde stil cakismalarini azaltir ve okunabilirligi artirir.",
    wrong: '.bigBlueButton veya .cardButtonActive gibi daginik isimler',
    right: ".card__button--active gibi blok__eleman--modifiye yapisi",
    autoFix: "Mimari review gerekir",
  },
  css_scope_strategy_preferred: {
    why:
      "Tailwind, CSS Modules veya benzeri scoped yaklasimlar global stil cakismalarini azaltir.",
    wrong: "Genel CSS dosyalarinda birbirine carpan siniflar kullanmak.",
    right: "Tailwind utility siniflari, CSS Modules veya benzeri yali bir yontem kullanin.",
    autoFix: "Mimari review gerekir",
  },
  component_naming_conventions: {
    why:
      "PascalCase bilesen isimleri React tarafinda bilesenleri HTML etiketlerinden ayirmayi kolaylastirir.",
    wrong: "userProfile.jsx icinde export default function userProfile()",
    right: "UserProfile.jsx icinde export default function UserProfile()",
    autoFix: "Guvenli refactor olabilir",
  },
  function_naming_conventions: {
    why:
      "camelCase isimlendirme JS/TS ekosisteminde ortak okunabilirlik saglar.",
    wrong: "Get_User_Data veya get_user_data",
    right: "getUserData",
    autoFix: "Inceleme gerektirir",
  },
  constant_naming_conventions: {
    why:
      "Paylasilan sabitleri UPPER_SNAKE_CASE ile tutmak kritik konfigrasyonlari ayristirir.",
    wrong: "const apiUrl = '/api';",
    right: "const API_URL = '/api';",
    autoFix: "Inceleme gerektirir",
  },
  index_exports_preferred: {
    why:
      "Index export dosyalari import yollarini sade tutar ve klasor sinirlarini netlestirir.",
    wrong: "Her kullanimda derin dosya yoluna inmek.",
    right: "components/Button/index.js veya benzeri bir barrel export kullanmak.",
    autoFix: "Mimari review gerekir",
  },
  component_file_extension_convention: {
    why:
      "UI ve saf mantik dosyalarini uzanti bazinda ayirmak kod tabanini daha okunur hale getirir.",
    wrong: "React bilesenini .js icinde, saf util dosyasini .jsx icinde tutmak.",
    right: "Gorsel bilesenler icin .jsx, mantik dosyalari icin .js kullanin.",
    autoFix: "Guvenli refactor olabilir",
  },
  route_level_lazy_loading: {
    why:
      "Sayfa seviyesinde lazy loading ilk bundle boyutunu dusurur ve acilis performansini iyilestirir.",
    wrong: "Tum sayfalari ilk bundle icine almak.",
    right: "React.lazy ve Suspense ile route veya agir bolumleri gec yuklemek.",
    autoFix: "Mimari review gerekir",
  },
  commit_message_convention: {
    why:
      "Standart commit mesaji gecmisi taramayi, changelog uretmeyi ve release takibini kolaylastirir.",
    wrong: "update files",
    right: "feat(auth): add login validation",
    autoFix: "Bilgilendirme kurali",
  },
  eslint_config_required: {
    why:
      "ESLint ortak bir stil ve hata yakalama bariyeri saglar; ekipte farkli yazim aliskanliklarini bir standarda ceker.",
    wrong: "Projede hicbir ESLint config dosyasi yok.",
    right: "eslint.config.js veya esdeger bir konfigrasyon dosyasi ekleyin.",
    autoFix: "Yapilandirma gerekir",
  },
  prettier_config_required: {
    why:
      "Prettier ekipte ayni format duzenini korur ve gereksiz diffleri azaltir.",
    wrong: "Projede .prettierrc veya prettier.config.js yok.",
    right: "Paylasilan bir Prettier config dosyasi ekleyin.",
    autoFix: "Yapilandirma gerekir",
  },
  husky_pre_commit_required: {
    why:
      "Pre-commit hooklari bozuk kodun repoya girmesini daha commit aninda durdurur.",
    wrong: "Commit oncesi hicbir otomatik kontrol yok.",
    right: ".husky/pre-commit icinde lint veya test gibi hizli kontroller calissin.",
    autoFix: "Yapilandirma gerekir",
  },
  lint_staged_required: {
    why:
      "lint-staged sadece degisen dosyalarda kontrol calistirarak kaliteyi hizli korur.",
    wrong: "Committe degisen dosyalarda hic staged-file kontrolu yok.",
    right: "package.json veya ayri config icinde lint-staged tanimlayin.",
    autoFix: "Yapilandirma gerekir",
  },
  lazy_loading_images: {
    why:
      "Ekranin altinda kalan gorselleri gec yuklemek ilk acilis performansini iyilestirir.",
    wrong: '<img src="/gallery/photo.jpg" alt="Galeri fotografi" />',
    right:
      '<img src="/gallery/photo.jpg" alt="Galeri fotografi" loading="lazy" />',
    autoFix: "Guvenli refactor olabilir",
  },
  optimized_images_preferred: {
    why:
      "WebP ve AVIF gibi formatlar daha kucuk dosya boyutuyla daha hizli acilis saglar.",
    wrong: "Buyuk kahraman gorselini agir PNG/JPEG olarak tutmak.",
    right: "Uygun oldugunda WebP veya AVIF tercih edin.",
    autoFix: "Asset optimizasyonu gerekir",
  },
  external_links_noopener: {
    why:
      "Yeni sekmede acilan linklerde rel noopener/noreferrer kullanmak tab-nabbing riskini azaltir.",
    wrong: '<a href="https://example.com" target="_blank">Detay</a>',
    right:
      '<a href="https://example.com" target="_blank" rel="noopener noreferrer">Detay</a>',
    autoFix: "Guvenli refactor olabilir",
  },
};

const EXTENDED_CATEGORY_LABELS = {
  ...categoryLabels,
  structure: "Yapi",
  naming: "Isimlendirme",
  security: "Guvenlik",
  ai: "AI",
  architecture: "Mimari",
  performance: "Performans",
};

const createCompanyStandardSections = (language) => {
  if (language === "tr") {
    return [
      {
        id: "delivery",
        eyebrow: "Teslim standardi",
        title: "Kod calisir, okunur ve aciklanabilir olmali",
        body:
          "Sirket icinde kabul edilen kod sadece sonucu veren degil; ekipteki baska bir gelistiricinin okuyup devralabilecegi kadar duzenli kod olmalidir.",
        bullets: [
          "Placeholder veya yari kalmis kod kabul edilmez.",
          "Dosya isimleri, component isimleri ve klasor duzeni tutarli olur.",
          "Kod review yorumuna ihtiyac duymadan temel amacini anlatabilmelidir.",
        ],
      },
      {
        id: "frontend",
        eyebrow: "Arayuz standardi",
        title: "Erisilebilir ve semantik bir arayuz zorunludur",
        body:
          "Ozellikle urun, panel ve form ekranlarinda semantic HTML, label iliskisi ve guvenli buton davranisi standart kabul edilir.",
        bullets: [
          "header, main, section, article gibi etiketler dogru yerde kullanilir.",
          "img alt, form label/htmlFor ve button type gibi temel A11y kurallari atlanmaz.",
          "Responsive davranis mobil oncelikli kurulur.",
        ],
      },
      {
        id: "architecture",
        eyebrow: "Mimari standard",
        title: "Kod buyudukce degil, parcalandikca yonetilebilir olmali",
        body:
          "Sirket projelerinde tek dosyada yigilan mantik yerine moduler, isimlendirmesi net ve test eklemeye uygun bir yapi beklenir.",
        bullets: [
          "Buyuk bilesenler daha kucuk parcalara bolunur.",
          "Agir hesaplar JSX disina tasinir.",
          "Hook kullanimi top-level ve tahmin edilebilir olur.",
        ],
      },
      {
        id: "workflow",
        eyebrow: "Takim is akisi",
        title: "Kod kadar commit ve PR kalitesi de standardin parcasi",
        body:
          "Gercek yazilim sirketlerinde kalite sadece kod satirinda degil; commit mesaji, PR aciklamasi ve degisikligin izlenebilirliginde de olculur.",
        bullets: [
          "Commit mesaji standart prefix ve anlamli ozet icerir.",
          "PR aciklamasi ne degisti, neden degisti ve nasil test edildi bilgisini verir.",
          "Kod bir sonraki gelistiriciye temiz devir mantigiyla teslim edilir.",
        ],
      },
      {
        id: "quality",
        eyebrow: "Kalite kapisi",
        title: "Prompt yonlendirir, denetim dogrular",
        body:
          "AI ile kod yazilsa bile sirket standardi ancak tarama, lint ve review ile gercekten korunabilir.",
        bullets: [
          "Prompt sadece yonlendirme katmanidir.",
          "Kurallar sayfasi ortak standardi tanimlar.",
          "Governance ve review sureci standarda gercek uyumu kontrol eder.",
        ],
      },
      {
        id: "performance",
        eyebrow: "Performans tabani",
        title: "Ilk acilis ve bakim maliyeti birlikte dusunulur",
        body:
          "Ozellikle frontend islerinde performans yalnizca hiz degil; bundle boyutu, lazy loading ve gorsel optimizasyonu ile birlikte ele alinir.",
        bullets: [
          "Route veya agir bolumler lazy load edilmeye uygun tasarlanir.",
          "Gorsellerde uygun yerde loading='lazy' kullanilir.",
          "Gereksiz bagimlilik ve tekrarli yapi olusturulmaz.",
        ],
      },
    ];
  }

  return [
    {
      id: "delivery",
      eyebrow: "Delivery baseline",
      title: "Code must be workable, readable, and explainable",
      body:
        "In a software company, accepted code is not only code that works. It must also be structured so another engineer can read it and continue the work safely.",
      bullets: [
        "No placeholders or half-finished code.",
        "File names, component names, and folder structure stay consistent.",
        "The intent should be understandable without heavy review comments.",
      ],
    },
    {
      id: "frontend",
      eyebrow: "UI baseline",
      title: "Accessible and semantic UI is mandatory",
      body:
        "For product, panel, and form screens, semantic HTML, label relationships, and safe button behavior are treated as baseline quality rules.",
      bullets: [
        "Use header, main, section, article, and related semantic landmarks correctly.",
        "Do not skip img alt, form label/htmlFor, or button type rules.",
        "Responsive behavior is built mobile-first.",
      ],
    },
    {
      id: "architecture",
      eyebrow: "Architecture baseline",
      title: "Code should become manageable by being modular",
      body:
        "Company projects should avoid single-file logic piles and instead prefer modular, clearly named, test-friendly structures.",
      bullets: [
        "Large components are split into smaller pieces.",
        "Heavy calculations move outside JSX.",
        "Hooks stay top-level and predictable.",
      ],
    },
    {
      id: "workflow",
      eyebrow: "Team workflow",
      title: "Commit and PR quality are part of the standard too",
      body:
        "In real software teams, quality is measured not only in code lines but also in commit messages, PR descriptions, and traceable change history.",
      bullets: [
        "Commit messages use a standard prefix and meaningful summary.",
        "PR descriptions explain what changed, why it changed, and how it was tested.",
        "Code is delivered so the next engineer can safely continue from it.",
      ],
    },
    {
      id: "quality",
      eyebrow: "Quality gate",
      title: "Prompts guide the result, governance verifies it",
      body:
        "Even when AI is used, company standards are only protected when scanning, linting, and review confirm the output.",
      bullets: [
        "The prompt is a guidance layer.",
        "The rules page defines the shared engineering baseline.",
        "Governance and review check real compliance.",
      ],
    },
    {
      id: "performance",
      eyebrow: "Performance baseline",
      title: "First load and maintenance cost are considered together",
      body:
        "Frontend performance is not only about speed; it also includes bundle size, lazy loading, and image optimization choices.",
      bullets: [
        "Routes or heavy areas are structured for lazy loading.",
        "Use loading='lazy' where appropriate for images.",
        "Avoid unnecessary dependencies and repeated structures.",
      ],
    },
  ];
};

function getRuleGuide(rule) {
  return (
    RULE_GUIDES[rule.code] || EXTRA_RULE_GUIDES[rule.code] || {
      why:
        rule.description ||
        "Bu kural şirket mühendislik standardının bir parçasıdır ve kod kalitesini korumak için izlenir.",
      wrong: rule.description || "Kuralın beklediği yapı sağlanmıyor.",
      right: getViolationRecommendation({
        code: rule.code,
        title: rule.title,
        message: rule.description,
      }),
      autoFix: "Kural tipine göre değişir",
    }
  );
}

function CodeStandards() {
  const { t, language } = useI18n();
  const { userData } = useUser();
  const isAdmin = Boolean(userData?.isAdmin);
  const [searchText, setSearchText] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState(DEFAULT_RULE_FORM);
  const [creatingRule, setCreatingRule] = useState(false);
  const [restoringRules, setRestoringRules] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState(null);
  const [editForm, setEditForm] = useState(DEFAULT_RULE_FORM);
  const [savingRuleId, setSavingRuleId] = useState(null);
  const [deletingRuleId, setDeletingRuleId] = useState(null);
  const profilesQuery = useList({ resource: "standard-profiles" });
  const refetchProfiles = profilesQuery.refetch;
  const profiles = profilesQuery.data?.data ?? EMPTY_ARRAY;
  const activeProfile =
    profiles.find((profile) => profile.is_default) || profiles[0] || null;
  const rules = useMemo(
    () =>
      (activeProfile?.rules || [])
        .filter((rule) => rule.is_enabled !== false)
        .sort((left, right) => Number(left.order || 0) - Number(right.order || 0)),
    [activeProfile]
  );
  const categories = useMemo(
    () =>
      [...new Set(rules.map((rule) => rule.category || "quality"))]
        .filter(Boolean)
        .sort(),
    [rules]
  );
  const filteredRules = useMemo(() => {
    const normalizedSearch = searchText.trim().toLowerCase();
    return rules.filter((rule) => {
      const matchesCategory =
        categoryFilter === "all" || (rule.category || "quality") === categoryFilter;
      const searchable = [
        rule.title,
        rule.code,
        rule.description,
        rule.category,
        rule.severity,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return matchesCategory && (!normalizedSearch || searchable.includes(normalizedSearch));
    });
  }, [categoryFilter, rules, searchText]);
  const companyStandardSections = useMemo(
    () => createCompanyStandardSections(language),
    [language]
  );

  const nextRuleOrder = useMemo(
    () => rules.reduce((maxValue, rule) => Math.max(maxValue, Number(rule.order || 0)), 0) + 1,
    [rules]
  );

  const startEditingRule = (rule) => {
    setEditingRuleId(rule.id);
    setEditForm({
      code: rule.code || "",
      title: rule.title || "",
      description: rule.description || "",
      category: rule.category || "style",
      severity: rule.severity || "medium",
      weight: Number(rule.weight || 0),
      is_enabled: rule.is_enabled !== false,
    });
  };

  const cancelEditingRule = () => {
    setEditingRuleId(null);
    setSavingRuleId(null);
    setDeletingRuleId(null);
  };

  const resetCreateForm = () => {
    setCreateForm(DEFAULT_RULE_FORM);
    setCreatingRule(false);
    setShowCreateForm(false);
  };

  const handleCreateRule = async () => {
    if (!activeProfile?.id) {
      window.alert("Aktif standart profil bulunamadı.");
      return;
    }

    const normalizedCode = normalizeRuleCode(createForm.code || createForm.title);
    if (!normalizedCode || !createForm.title.trim()) {
      window.alert("Kural kodu ve başlığı zorunludur.");
      return;
    }

    setCreatingRule(true);
    try {
      await apiClient.post("/standard-rules/", {
        profile: activeProfile.id,
        code: normalizedCode,
        title: createForm.title.trim(),
        description: createForm.description.trim(),
        category: createForm.category,
        severity: createForm.severity,
        weight: Number(createForm.weight || 0),
        is_enabled: Boolean(createForm.is_enabled),
        order: nextRuleOrder,
      });
      await refetchProfiles?.();
      resetCreateForm();
      window.dispatchEvent(new CustomEvent("governance-sync-requested"));
      window.alert("Yeni kural eklendi.");
    } catch (error) {
      window.alert(
        error?.response?.data?.detail ||
          error?.response?.data?.code?.[0] ||
          "Yeni kural eklenemedi."
      );
    } finally {
      setCreatingRule(false);
    }
  };

  const handleRestoreCoreRules = async () => {
    setRestoringRules(true);
    try {
      await apiClient.post("/standard-profiles/create-starter-profile/");
      await refetchProfiles?.();
      setEditingRuleId(null);
      resetCreateForm();
      window.dispatchEvent(new CustomEvent("governance-sync-requested"));
      window.alert("Temel kural kütüphanesi geri yüklendi.");
    } catch (error) {
      window.alert(
        error?.response?.data?.detail || "Temel kural kütüphanesi geri yüklenemedi."
      );
    } finally {
      setRestoringRules(false);
    }
  };

  const handleSaveRule = async (ruleId) => {
    setSavingRuleId(ruleId);
    try {
      await apiClient.patch(`/standard-rules/${ruleId}/`, {
        title: editForm.title,
        description: editForm.description,
        severity: editForm.severity,
        weight: Number(editForm.weight || 0),
        is_enabled: Boolean(editForm.is_enabled),
      });
      await refetchProfiles?.();
      setEditingRuleId(null);
      window.dispatchEvent(new CustomEvent("governance-sync-requested"));
    } catch (error) {
      window.alert(
        error?.response?.data?.detail ||
          t("governance.ruleUpdateFailed", "Kural güncellenemedi.")
      );
    } finally {
      setSavingRuleId(null);
    }
  };

  const handleDeleteRule = async (rule) => {
    if (!rule?.id) {
      return;
    }

    const confirmed = window.confirm(
      t(
        "governance.deleteRuleConfirm",
        "Bu kuralı silmek istediğinize emin misiniz? Bu işlem puanları yeniden hesaplar."
      )
    );
    if (!confirmed) {
      return;
    }

    setDeletingRuleId(rule.id);
    try {
      await apiClient.delete(`/standard-rules/${rule.id}/`);
      await refetchProfiles?.();
      setEditingRuleId(null);
      window.dispatchEvent(new CustomEvent("governance-sync-requested"));
      window.alert(
        t(
          "governance.deleteRuleSuccess",
          "Kural silindi ve etkilenen repo puanları güncellendi."
        )
      );
    } catch (error) {
      window.alert(
        error?.response?.data?.detail ||
          t(
            "governance.deleteRuleFailed",
            "Kural silinemedi veya puanlar güncellenemedi."
          )
      );
    } finally {
      setDeletingRuleId(null);
    }
  };

  return (
    <div className="app-shell flex bg-transparent font-sans text-slate-900">
      <Sidebar activeItem="governance" logoClickable={true} />
      <div className="app-shell__main relative flex flex-col items-start pb-10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.76),transparent_36%)]" />
        <div className="relative flex min-w-0 w-full flex-col gap-6">
          <TopbarWithRightNav
            className="mx-6 mt-6 rounded-[28px] border border-white/65 bg-white/55 px-6 py-4 shadow-[0_20px_50px_rgba(148,163,184,0.12)] backdrop-blur md:mx-8 xl:mx-10"
            leftSlot={
              <Badge variant="neutral" icon={<FeatherShield />}>
                {t("governance.codeRules", "Kod Kuralları")}
              </Badge>
            }
            rightSlot={
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  to="/github-governance/ai-prompts"
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
                >
                  AI Prompt Rehberi
                </Link>
                <Link
                  to="/github-governance"
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
                >
                  {t("governance.backToGovernance", "Geri dön")}
                </Link>
              </div>
            }
          />

          <div className="grid min-w-0 grid-cols-1 gap-6 px-6 md:px-8 xl:px-10">
            <section className="rounded-[32px] border border-white/65 bg-white/90 p-6 shadow-[0_24px_70px_rgba(148,163,184,0.12)]">
              <Badge variant="neutral" icon={<FeatherCode />}>
                {activeProfile?.name || t("governance.defaultProfile", "Default profile")}
              </Badge>
              <h1 className="mt-4 font-['Newsreader'] text-4xl font-medium tracking-tight text-slate-950">
                {t(
                  "governance.codeRulesTitle",
                  "Şirket kod standartları ve değerlendirme kuralları"
                )}
              </h1>
              <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-500">
                {t(
                  "governance.codeRulesBody",
                  "Bu sayfa çalışanların hangi kurallara göre değerlendirildiğini, ihlallerin nasıl düzeltileceğini ve AI düzeltme akışının hangi sınırlarla çalıştığını açıklar."
                )}
              </p>
              <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-4">
                {[
                  [t("governance.rules", "Kurallar"), rules.length],
                  [t("governance.categories", "Kategoriler"), categories.length],
                  [
                    t("governance.profile", "Profil"),
                    activeProfile?.target_stack || t("governance.defaultProfile", "Default"),
                  ],
                  [
                    t("governance.aiGuardrail", "AI sınırı"),
                    t("governance.safeBranchOnly", "Güvenli branch"),
                  ],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-[22px] border border-slate-200 bg-slate-50 p-4"
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      {label}
                    </p>
                    <p className="mt-2 text-2xl font-black text-slate-950">
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[26px] border border-white/65 bg-white/90 p-5 shadow-[0_18px_40px_rgba(148,163,184,0.1)]">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    {language === "tr"
                      ? "Sirket muhendislik omurgasi"
                      : "Company engineering baseline"}
                  </p>
                  <h2 className="mt-2 text-2xl font-black text-slate-950">
                    {language === "tr"
                      ? "Az ama net kurallar: gercek yazilim sirketi standardi"
                      : "Few but sharp rules: a realistic software company standard"}
                  </h2>
                  <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-500">
                    {language === "tr"
                      ? "Bu bolum tek tek teknik kurallarin ustunde duran ortak sirket mantigini anlatir. Yeni gelen bir gelistirici AI kullansa bile once bu omurgaya uymali."
                      : "This section explains the company baseline above the individual technical rules. Even when a new engineer uses AI, the work should first align with this shared foundation."}
                  </p>
                </div>
                <Badge variant="neutral">
                  {companyStandardSections.length}{" "}
                  {language === "tr" ? "ana baslik" : "core sections"}
                </Badge>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-2">
                {companyStandardSections.map((section) => (
                  <article
                    key={section.id}
                    className="rounded-[24px] border border-slate-200 bg-slate-50 p-5"
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                      {section.eyebrow}
                    </p>
                    <h3 className="mt-2 text-xl font-black text-slate-950">
                      {section.title}
                    </h3>
                    <p className="mt-3 text-sm leading-6 text-slate-500">
                      {section.body}
                    </p>
                    <div className="mt-4 space-y-2">
                      {section.bullets.map((bullet) => (
                        <div
                          key={bullet}
                          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-600"
                        >
                          {bullet}
                        </div>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="rounded-[26px] border border-white/65 bg-white/90 p-5 shadow-[0_18px_40px_rgba(148,163,184,0.1)]">
              <div className="flex flex-wrap items-end gap-3">
                <label className="flex min-w-[240px] flex-1 flex-col gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    {t("governance.search", "Ara")}
                  </span>
                  <input
                    value={searchText}
                    onChange={(event) => setSearchText(event.target.value)}
                    placeholder={t(
                      "governance.searchRules",
                      "Kural, kategori veya açıklama ara"
                    )}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-sky-400 focus:bg-white"
                  />
                </label>
                <label className="flex min-w-[220px] flex-col gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    {t("governance.category", "Kategori")}
                  </span>
                  <select
                    value={categoryFilter}
                    onChange={(event) => setCategoryFilter(event.target.value)}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-sky-400 focus:bg-white"
                  >
                    <option value="all">
                      {t("governance.allCategories", "Tüm kategoriler")}
                    </option>
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {EXTENDED_CATEGORY_LABELS[category] || category}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </section>

            {isAdmin ? (
              <section className="rounded-[26px] border border-white/65 bg-white/90 p-5 shadow-[0_18px_40px_rgba(148,163,184,0.1)]">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                      Admin
                    </p>
                    <h2 className="mt-2 text-2xl font-black text-slate-950">
                      Yeni kural ekle
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      Kural ekleme, düzenleme ve silme yalnızca yönetici hesaplarında görünür.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCreateForm((current) => !current)}
                    className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-800"
                  >
                    {showCreateForm ? "Formu kapat" : "Kural ekle"}
                  </button>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleRestoreCoreRules}
                    disabled={restoringRules}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-100 disabled:opacity-60"
                  >
                    {restoringRules ? "Geri yükleniyor..." : "Temel kuralları geri yükle"}
                  </button>
                </div>

                {showCreateForm ? (
                  <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
                    <label className="flex flex-col gap-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                        Kural kodu
                      </span>
                      <input
                        value={createForm.code}
                        onChange={(event) =>
                          setCreateForm((current) => ({
                            ...current,
                            code: event.target.value,
                          }))
                        }
                        placeholder="ornek_kural_kodu"
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-sky-400"
                      />
                    </label>
                    <label className="flex flex-col gap-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                        Kural başlığı
                      </span>
                      <input
                        value={createForm.title}
                        onChange={(event) =>
                          setCreateForm((current) => ({
                            ...current,
                            title: event.target.value,
                          }))
                        }
                        placeholder="Örnek: Repository README içermeli"
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-sky-400"
                      />
                    </label>
                    <label className="flex flex-col gap-2 md:col-span-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                        Açıklama
                      </span>
                      <textarea
                        value={createForm.description}
                        onChange={(event) =>
                          setCreateForm((current) => ({
                            ...current,
                            description: event.target.value,
                          }))
                        }
                        rows={4}
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-sky-400"
                      />
                    </label>
                    <label className="flex flex-col gap-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                        Kategori
                      </span>
                      <select
                        value={createForm.category}
                        onChange={(event) =>
                          setCreateForm((current) => ({
                            ...current,
                            category: event.target.value,
                          }))
                        }
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-sky-400"
                      >
                        {RULE_CATEGORY_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="flex flex-col gap-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                        Önem derecesi
                      </span>
                      <select
                        value={createForm.severity}
                        onChange={(event) =>
                          setCreateForm((current) => ({
                            ...current,
                            severity: event.target.value,
                          }))
                        }
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-sky-400"
                      >
                        <option value="low">low</option>
                        <option value="medium">medium</option>
                        <option value="high">high</option>
                        <option value="critical">critical</option>
                      </select>
                    </label>
                    <label className="flex flex-col gap-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                        Puan etkisi
                      </span>
                      <input
                        type="number"
                        min="0"
                        value={createForm.weight}
                        onChange={(event) =>
                          setCreateForm((current) => ({
                            ...current,
                            weight: event.target.value,
                          }))
                        }
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-sky-400"
                      />
                    </label>
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={createForm.is_enabled}
                        onChange={(event) =>
                          setCreateForm((current) => ({
                            ...current,
                            is_enabled: event.target.checked,
                          }))
                        }
                      />
                      <span className="text-sm text-slate-700">Kural aktif</span>
                    </label>
                    <div className="flex flex-wrap gap-2 md:col-span-2">
                      <button
                        type="button"
                        onClick={handleCreateRule}
                        disabled={creatingRule}
                        className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-60"
                      >
                        {creatingRule ? "Ekleniyor..." : "Kuralı oluştur"}
                      </button>
                      <button
                        type="button"
                        onClick={resetCreateForm}
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
                      >
                        İptal
                      </button>
                    </div>
                  </div>
                ) : null}
              </section>
            ) : null}

            <section className="grid grid-cols-1 gap-4">
              {profilesQuery.isLoading ? (
                <div className="rounded-[24px] border border-dashed border-slate-200 bg-white/80 px-4 py-8 text-sm text-slate-500">
                  {t("governance.loadingRules", "Kurallar yükleniyor...")}
                </div>
              ) : filteredRules.length ? (
                filteredRules.map((rule) => {
                  const guide = getRuleGuide(rule);
                  const fixExample = getViolationFixExample({
                    code: rule.code,
                    title: rule.title,
                    message:
                      rule.code === "max_function_length"
                        ? "Function 'exampleFunction' is 35 lines long; keep functions under 20 lines."
                        : rule.description,
                    metadata: {
                      function_name: "exampleFunction",
                      max_lines: rule.config?.max_lines || 20,
                    },
                    file_path: rule.code === "python_snake_case_variables" ? "app.py" : "app.jsx",
                  });

                  return (
                    <article
                      key={rule.id || rule.code}
                      className="rounded-[28px] border border-slate-200 bg-white/92 p-5 shadow-[0_18px_46px_rgba(148,163,184,0.1)]"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="neutral">
                              {EXTENDED_CATEGORY_LABELS[rule.category] ||
                                rule.category ||
                                "Kod Kalitesi"}
                            </Badge>
                            <Badge
                              variant={
                                rule.severity === "high" || rule.severity === "critical"
                                  ? "warning"
                                  : "neutral"
                              }
                            >
                              {rule.severity || "medium"}
                            </Badge>
                            <Badge variant="neutral">
                              {t("governance.weight", "Puan etkisi")} {rule.weight || 0}
                            </Badge>
                          </div>
                          <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950">
                            {rule.title}
                          </h2>
                          <p className="mt-1 font-mono text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                            {rule.code}
                          </p>
                        </div>
                        <Badge variant={guide.autoFix.includes("Güvenli") ? "success" : "warning"}>
                          {guide.autoFix}
                        </Badge>
                      </div>

                      {isAdmin ? (
                        <div className="mt-4 rounded-[20px] border border-slate-200 bg-slate-50 p-4">
                          {editingRuleId === rule.id ? (
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                              <label className="flex flex-col gap-2 md:col-span-2">
                                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                                  {t("governance.ruleTitle", "Kural basligi")}
                                </span>
                                <input
                                  value={editForm.title}
                                  onChange={(event) =>
                                    setEditForm((current) => ({
                                      ...current,
                                      title: event.target.value,
                                    }))
                                  }
                                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-sky-400"
                                />
                              </label>
                              <label className="flex flex-col gap-2 md:col-span-2">
                                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                                  {t("governance.ruleDescription", "Açıklama")}
                                </span>
                                <textarea
                                  value={editForm.description}
                                  onChange={(event) =>
                                    setEditForm((current) => ({
                                      ...current,
                                      description: event.target.value,
                                    }))
                                  }
                                  rows={4}
                                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-sky-400"
                                />
                              </label>
                              <label className="flex flex-col gap-2">
                                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                                  {t("governance.severity", "Önem derecesi")}
                                </span>
                                <select
                                  value={editForm.severity}
                                  onChange={(event) =>
                                    setEditForm((current) => ({
                                      ...current,
                                      severity: event.target.value,
                                    }))
                                  }
                                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-sky-400"
                                >
                                  <option value="low">low</option>
                                  <option value="medium">medium</option>
                                  <option value="high">high</option>
                                  <option value="critical">critical</option>
                                </select>
                              </label>
                              <label className="flex flex-col gap-2">
                                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                                  {t("governance.weight", "Puan etkisi")}
                                </span>
                                <input
                                  type="number"
                                  min="0"
                                  value={editForm.weight}
                                  onChange={(event) =>
                                    setEditForm((current) => ({
                                      ...current,
                                      weight: event.target.value,
                                    }))
                                  }
                                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-sky-400"
                                />
                              </label>
                              <label className="flex items-center gap-3 md:col-span-2">
                                <input
                                  type="checkbox"
                                  checked={editForm.is_enabled}
                                  onChange={(event) =>
                                    setEditForm((current) => ({
                                      ...current,
                                      is_enabled: event.target.checked,
                                    }))
                                  }
                                />
                                <span className="text-sm text-slate-700">
                                  {t("governance.ruleEnabled", "Kural aktif")}
                                </span>
                              </label>
                              <div className="flex flex-wrap gap-2 md:col-span-2">
                                <button
                                  type="button"
                                  onClick={() => handleSaveRule(rule.id)}
                                  disabled={savingRuleId === rule.id}
                                  className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-60"
                                >
                                  {savingRuleId === rule.id
                                    ? t("governance.saving", "Kaydediliyor...")
                                    : t("governance.saveRule", "Kuralı kaydet")}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteRule(rule)}
                                  disabled={deletingRuleId === rule.id}
                                  className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-bold text-rose-700 transition hover:bg-rose-100 disabled:opacity-60"
                                >
                                  {deletingRuleId === rule.id
                                    ? t("governance.deleting", "Siliniyor...")
                                    : t("governance.deleteRule", "Kuralı sil")}
                                </button>
                                <button
                                  type="button"
                                  onClick={cancelEditingRule}
                                  className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
                                >
                                  {t("governance.cancel", "İptal")}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <p className="text-sm leading-6 text-slate-600">
                                {t(
                                  "governance.ruleEditHint",
                                  "Admin olarak bu kuralın başlığını, açıklamasını, önem derecesini, puan etkisini ve aktifliğini değiştirebilirsiniz."
                                )}
                              </p>
                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => startEditingRule(rule)}
                                  className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
                                >
                                  {t("governance.editRule", "Kuralı düzenle")}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteRule(rule)}
                                  disabled={deletingRuleId === rule.id}
                                  className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-bold text-rose-700 transition hover:bg-rose-100 disabled:opacity-60"
                                >
                                  {deletingRuleId === rule.id
                                    ? t("governance.deleting", "Siliniyor...")
                                    : t("governance.deleteRule", "Kuralı sil")}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : null}

                      <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-3">
                        <div className="rounded-[20px] border border-slate-200 bg-slate-50 p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                            {t("governance.whyImportant", "Neden önemli?")}
                          </p>
                          <p className="mt-2 text-sm leading-6 text-slate-700">
                            {guide.why}
                          </p>
                        </div>
                        <div className="rounded-[20px] border border-rose-100 bg-rose-50 p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-rose-700">
                            {t("governance.wrongExample", "Hatalı örnek")}
                          </p>
                          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                            {guide.wrong}
                          </p>
                        </div>
                        <div className="rounded-[20px] border border-emerald-100 bg-emerald-50 p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
                            {t("governance.rightExample", "Doğrusu")}
                          </p>
                          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                            {guide.right}
                          </p>
                        </div>
                      </div>

                      {fixExample ? (
                        <div className="mt-4 rounded-[20px] border border-slate-200 bg-slate-950 p-4 text-white">
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-200">
                            {t("governance.suggestedCodeShape", "Önerilen kod şekli")}
                          </p>
                          <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap break-words font-mono text-xs leading-6 text-slate-100">
                            {fixExample}
                          </pre>
                        </div>
                      ) : null}
                    </article>
                  );
                })
              ) : (
                <div className="rounded-[24px] border border-dashed border-slate-200 bg-white/80 px-4 py-8 text-sm text-slate-500">
                  {t("governance.noRulesVisible", "Görünür kural bulunamadı.")}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CodeStandards;
