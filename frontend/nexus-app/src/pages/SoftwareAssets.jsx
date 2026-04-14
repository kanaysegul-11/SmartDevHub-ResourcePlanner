import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCreate, useDelete, useInvalidate, useList, useUpdate } from "@refinedev/core";
import {
  FeatherAlertTriangle,
  FeatherClock3,
  FeatherFileText,
  FeatherRefreshCw,
  FeatherSearch,
  FeatherSparkles,
  FeatherTrendingUp,
} from "@subframe/core";
import { toast } from "sonner";

import Sidebar from "../component/layout/Sidebar";
import ConfirmDialog from "../component/common/ConfirmDialog.jsx";
import SoftwareAssetPanel from "../component/softwareAssets/SoftwareAssetPanel.jsx";
import SoftwareAssetsOverview from "../component/softwareAssets/SoftwareAssetsOverview.jsx";
import SoftwareAssetsTableCard from "../component/softwareAssets/SoftwareAssetsTableCard.jsx";
import { useUser } from "../UserContext.jsx";
import { useI18n } from "../I18nContext.jsx";
import { apiClient } from "../refine/axios.js";
import { Tabs } from "../ui/components/Tabs";
import {
  LICENSE_REQUEST_TYPES,
  buildEmptyLicenseRequestForm,
  buildEmptySoftwareAssetForm,
  buildRequestDraftFromRequest,
  buildSoftwareAssetFormFromAsset,
  getSoftwareAssetAlertCopy,
  getSoftwareAssetAuditLogCopy,
  getSoftwareAssetSyncLogCopy,
  getSoftwareAssetsCopy,
  interpolateTemplate,
  parseCsvText,
  safeParseMetadataText,
} from "../component/softwareAssets/softwareAssetsContent.js";

const TAB_ITEMS = ["shared", "assigned", "renewals", "cost", "sync", "alerts"];

const normalizeImportToken = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/ı/g, "i")
    .replace(/İ/g, "i")
    .replace(/ş/g, "s")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");

const normalizeRecordType = (value) => {
  const token = normalizeImportToken(value);
  if (!token) return "";
  if (["saas", "software", "cloudsoftware"].includes(token)) return "saas";
  if (["desktoplicense", "desktop", "masaustu", "masaustulisans"].includes(token)) {
    return "desktop_license";
  }
  if (["teamtool", "teamlicense", "sharedtool", "ortaklisans", "ekiparaci", "takimaraci"].includes(token)) {
    return "team_tool";
  }
  if (["singleuserlicense", "singleuser", "assignedlicense", "personal", "kisisel", "bireysel", "tekkullanici"].includes(token)) {
    return "single_user_license";
  }
  if (["apisubscription", "api", "apiaboneligi"].includes(token)) return "api_subscription";
  if (["supportservice", "support", "destek", "destekhizmeti"].includes(token)) {
    return "support_service";
  }
  return token;
};

const normalizeLicenseMode = (value) => {
  const token = normalizeImportToken(value);
  if (!token) return "";
  if (["shared", "team", "pool", "ortak", "paylasimli"].includes(token)) return "shared";
  if (["assigned", "personal", "singleuser", "user", "kisisel", "bireysel", "tekkullanici"].includes(token)) {
    return "assigned";
  }
  return token;
};

const normalizeOperationalStatus = (value) => {
  const token = normalizeImportToken(value);
  if (!token) return "";
  if (["active", "aktif"].includes(token)) return "active";
  if (["inactive", "pasif", "disabled"].includes(token)) return "inactive";
  if (["archived", "arsiv", "arsivli", "archive"].includes(token)) return "archived";
  return token;
};

const normalizeBillingCycle = (value) => {
  const token = normalizeImportToken(value);
  if (!token) return "";
  if (
    ["monthly", "month", "mo", "ay", "aylik", "heray"].includes(token) ||
    /^ayl[i]?k$/.test(token)
  ) {
    return "monthly";
  }
  if (
    ["quarterly", "quarter", "ceyreklik", "ucaylik", "3aylik"].includes(token)
  ) {
    return "quarterly";
  }
  if (
    ["yearly", "annual", "annually", "year", "yillik", "senelik"].includes(token) ||
    /^y[i]?ll[i]?k$/.test(token)
  ) {
    return "yearly";
  }
  if (
    ["onetime", "oneoff", "teksefer", "tekseferlik", "birkerelik"].includes(token)
  ) {
    return "one_time";
  }
  return token;
};

const normalizeCurrency = (value) => {
  const raw = String(value || "").trim().toUpperCase();
  const token = normalizeImportToken(value);
  if (!token) return "";
  if (["usd", "dolar", "usdollar"].includes(token) || raw === "$") return "USD";
  if (["eur", "euro"].includes(token)) return "EUR";
  if (["try", "tl", "lira"].includes(token) || raw === "₺") return "TRY";
  if (["gbp", "sterlin", "pound"].includes(token) || raw === "£") return "GBP";
  return raw || token.toUpperCase();
};

const normalizeProviderCode = (value, vendor) => {
  const token = normalizeImportToken(value || vendor);
  if (!token) return "";
  if (token.includes("github")) return "github";
  if (token.includes("microsoft")) return "microsoft";
  if (token.includes("adobe")) return "adobe";
  if (token.includes("figma")) return "figma";
  if (token.includes("openai")) return "openai";
  if (token.includes("cursor")) return "cursor";
  return ["manual", "other"].includes(token) ? token : "manual";
};

const normalizeRecordSource = (value) => {
  const token = normalizeImportToken(value);
  if (!token) return "";
  if (["manual", "manuel", "handmade"].includes(token)) return "manual";
  if (["providersync", "sync", "senkron", "entegrasyon"].includes(token)) {
    return "provider_sync";
  }
  return token;
};

const normalizePurchasePrice = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const compact = raw.replace(/\s+/g, "");
  if (/^\d{1,3}(\.\d{3})+,\d+$/.test(compact)) {
    return compact.replace(/\./g, "").replace(",", ".");
  }
  if (/^\d{1,3}(,\d{3})+\.\d+$/.test(compact)) {
    return compact.replace(/,/g, "");
  }
  if (/^\d+,\d+$/.test(compact)) {
    return compact.replace(",", ".");
  }
  return compact;
};

const normalizeBoolean = (value, fallback = false) => {
  if (typeof value === "boolean") return value;
  const token = normalizeImportToken(value);
  if (!token) return fallback;
  if (["true", "yes", "evet", "1", "on"].includes(token)) return true;
  if (["false", "no", "hayir", "hayr", "0", "off"].includes(token)) return false;
  return fallback;
};

const parseImportMetadata = (value) => {
  const parsed = safeParseMetadataText(value);
  return parsed.ok ? parsed.value : {};
};

const flattenImportErrorMessages = (errors) =>
  Object.entries(errors || {}).flatMap(([field, value]) => {
    const entries = Array.isArray(value) ? value : [value];
    return entries.map((entry) => `${field}: ${String(entry)}`);
  });

function SoftwareAssets() {
  const { userData } = useUser();
  const { language } = useI18n();
  const isAdmin = Boolean(userData?.isAdmin);
  const invalidate = useInvalidate();
  const { mutate: createAsset, isLoading: isCreating } = useCreate();
  const { mutate: updateAsset, isLoading: isUpdating } = useUpdate();
  const { mutate: deleteAsset, isLoading: isDeleting } = useDelete();
  const assetsQuery = useList({
    resource: "software-assets",
    queryOptions: { staleTime: 15000, refetchOnWindowFocus: false },
  });
  const usersQuery = useList({
    resource: "users",
    queryOptions: { staleTime: 15000, refetchOnWindowFocus: false, enabled: isAdmin },
  });

  const copy = useMemo(() => getSoftwareAssetsCopy(language), [language]);
  const assets = useMemo(() => assetsQuery.data?.data ?? [], [assetsQuery.data]);
  const userOptions = useMemo(() => usersQuery.data?.data ?? [], [usersQuery.data]);
  const providerLabels = copy.providers || {};
  const recordTypeLabels = copy.recordTypes || {};
  const billingCycleLabels = copy.billingCycles || {};
  const requestTypeLabels = copy.requestTypes || {};
  const requestStatusLabels = copy.requestStatuses || {};
  const sortOptions = copy.sortOptions || {};
  const availableTabs = useMemo(
    () => TAB_ITEMS.filter((tabKey) => isAdmin || tabKey !== "cost"),
    [isAdmin]
  );
  const availableSortOptions = useMemo(
    () =>
      [
        { value: "renewal_asc", label: sortOptions.renewal_asc },
        isAdmin ? { value: "cost_desc", label: sortOptions.cost_desc } : null,
        { value: "vendor_asc", label: sortOptions.vendor_asc },
        { value: "updated_desc", label: sortOptions.updated_desc },
        { value: "utilization_desc", label: sortOptions.utilization_desc },
      ].filter(Boolean),
    [isAdmin, sortOptions]
  );
  const statusLabels = useMemo(
    () => ({ active: copy.active, inactive: copy.inactive, archived: copy.archived }),
    [copy]
  );

  const [summary, setSummary] = useState({
    stats: {},
    provider_spend: [],
    renewals: { expired: [], next_7_days: [] },
    alerts: [],
    sync_logs: [],
    audit_logs: [],
    requests: [],
    request_stats: {},
    user_cards: [],
  });
  const toolbarSignals = useMemo(
    () => [
      {
        label: copy.totalRecords,
        value: summary.stats?.total_records || 0,
        icon: <FeatherSparkles size={14} />,
      },
      {
        label: copy.expiringSoon,
        value: summary.stats?.expiring_7_days || 0,
        icon: <FeatherClock3 size={14} />,
      },
      {
        label: copy.active,
        value: summary.stats?.active_records || 0,
        icon: <FeatherTrendingUp size={14} />,
      },
    ],
    [copy.active, copy.expiringSoon, copy.totalRecords, summary.stats]
  );
  const [activeTab, setActiveTab] = useState(() => (isAdmin ? "shared" : "assigned"));
  const [selectedAssetId, setSelectedAssetId] = useState(null);
  const [selectedRowIds, setSelectedRowIds] = useState([]);
  const [bulkUserIds, setBulkUserIds] = useState([]);
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [formData, setFormData] = useState(() => buildEmptySoftwareAssetForm());
  const [requestForm, setRequestForm] = useState(() => buildEmptyLicenseRequestForm());
  const [requestDrafts, setRequestDrafts] = useState({});
  const [csvText, setCsvText] = useState("");
  const [selectedCsvFileName, setSelectedCsvFileName] = useState("");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isBulkAssigning, setIsBulkAssigning] = useState(false);
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isReclaiming, setIsReclaiming] = useState(false);
  const [processingRequestId, setProcessingRequestId] = useState(null);
  const [filters, setFilters] = useState({
    search: "",
    provider: "all",
    lifecycle: "all",
    mode: "all",
    source: "all",
    renewal: "all",
    sort: "renewal_asc",
  });
  const csvFileInputRef = useRef(null);

  const selectedAsset = useMemo(
    () =>
      isCreateMode
        ? null
        : assets.find((asset) => String(asset.id) === String(selectedAssetId)) || null,
    [assets, isCreateMode, selectedAssetId]
  );
  const selectedAssets = useMemo(
    () => assets.filter((asset) => selectedRowIds.includes(String(asset.id))),
    [assets, selectedRowIds]
  );

  const formatDate = useCallback(
    (value) => {
      if (!value) return copy.noValue;
      const date = new Date(value);
      return Number.isNaN(date.getTime())
        ? copy.noValue
        : new Intl.DateTimeFormat(language || "en", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          }).format(date);
    },
    [copy.noValue, language]
  );

  const formatDateTime = useCallback(
    (value) => {
      if (!value) return copy.noValue;
      const date = new Date(value);
      return Number.isNaN(date.getTime())
        ? copy.noValue
        : new Intl.DateTimeFormat(language || "en", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }).format(date);
    },
    [copy.noValue, language]
  );

  const formatMoney = useCallback(
    (value, currency = "USD") =>
      new Intl.NumberFormat(language || "en", {
        style: "currency",
        currency: currency || "USD",
        maximumFractionDigits: 2,
      }).format(Number(value || 0)),
    [language]
  );

  const getLifecycleVariant = (status) =>
    ["expired", "inactive", "archived"].includes(status)
      ? "error"
      : status === "expiring_soon"
        ? "warning"
        : "success";

  const getLifecycleLabel = (status) =>
    status === "expired"
      ? copy.expired
      : status === "expiring_soon"
        ? copy.expiringLabel
        : status === "inactive"
          ? copy.inactive
          : status === "archived"
            ? copy.archived
            : copy.active;

  const getRecordSourceLabel = (value) =>
    value === "provider_sync" ? copy.providerSync : copy.manualRecord;

  const getModeLabel = (value) => (value === "assigned" ? copy.assigned : copy.shared);

  const loadSummary = useCallback(async () => {
    try {
      const response = await apiClient.get("/software-assets/summary/");
      setSummary(response.data || {});
    } catch {
      toast.error(copy.errorLoad);
    }
  }, [copy.errorLoad]);

  const refreshAll = useCallback(async () => {
    await assetsQuery.refetch?.();
    await usersQuery.refetch?.();
    await loadSummary();
    invalidate({ resource: "software-assets", invalidates: ["list", "detail"] });
  }, [assetsQuery, invalidate, loadSummary, usersQuery]);

  useEffect(() => {
    if (assetsQuery.data || assetsQuery.error) {
      void loadSummary();
    }
  }, [assetsQuery.data, assetsQuery.error, loadSummary]);

  useEffect(() => {
    if (!assets.length) {
      setSelectedAssetId(null);
      if (!isCreateMode) setFormData(buildEmptySoftwareAssetForm());
      return;
    }

    if (isCreateMode) return;

    const fallbackAsset =
      assets.find((asset) => String(asset.id) === String(selectedAssetId)) || assets[0];
    setSelectedAssetId(fallbackAsset.id);
    setFormData(buildSoftwareAssetFormFromAsset(fallbackAsset));
  }, [assets, isCreateMode, selectedAssetId]);

  useEffect(() => {
    setRequestDrafts(
      Object.fromEntries(
        (summary.requests || []).map((request) => [request.id, buildRequestDraftFromRequest(request)])
      )
    );
  }, [summary.requests]);

  useEffect(() => {
    setActiveTab((current) => {
      if (availableTabs.includes(current)) return current;
      return isAdmin ? "shared" : "assigned";
    });
  }, [availableTabs, isAdmin]);

  useEffect(() => {
    setFilters((current) => {
      if (availableSortOptions.some((option) => option.value === current.sort)) {
        return current;
      }

      return {
        ...current,
        sort: "renewal_asc",
      };
    });
  }, [availableSortOptions]);

  const filteredAssets = useMemo(() => {
    const search = filters.search.trim().toLowerCase();
    const effectiveSort = isAdmin || filters.sort !== "cost_desc" ? filters.sort : "renewal_asc";
    const items = assets.filter((asset) => {
      const searchable = [
        asset.name,
        asset.vendor,
        asset.plan_name,
        asset.account_email,
        asset.billing_email,
        asset.vendor_contact,
        asset.department,
        asset.cost_center,
        asset.primary_assignment?.user_details?.username,
      ]
        .join(" ")
        .toLowerCase();

      if (search && !searchable.includes(search)) return false;
      if (filters.provider !== "all" && asset.provider_code !== filters.provider) return false;
      if (filters.mode !== "all" && asset.license_mode !== filters.mode) return false;
      if (filters.source !== "all" && asset.record_source !== filters.source) return false;
      if (filters.lifecycle === "all" && asset.lifecycle_status === "archived") return false;
      if (filters.lifecycle !== "all" && asset.lifecycle_status !== filters.lifecycle) return false;
      if (filters.renewal !== "all" && asset.renewal_window !== filters.renewal) return false;
      return true;
    });

    return items.sort((left, right) => {
      if (effectiveSort === "cost_desc") {
        return Number(right.annual_cost_estimate || 0) - Number(left.annual_cost_estimate || 0);
      }
      if (effectiveSort === "vendor_asc") {
        return String(left.vendor || "").localeCompare(String(right.vendor || ""));
      }
      if (effectiveSort === "updated_desc") {
        return String(right.updated_at || "").localeCompare(String(left.updated_at || ""));
      }
      if (effectiveSort === "utilization_desc") {
        return Number(right.utilization_rate || 0) - Number(left.utilization_rate || 0);
      }
      return String(left.renewal_date || "9999").localeCompare(String(right.renewal_date || "9999"));
    });
  }, [assets, filters, isAdmin]);

  const sharedAssets = useMemo(
    () => filteredAssets.filter((asset) => asset.license_mode === "shared"),
    [filteredAssets]
  );
  const assignedAssets = useMemo(
    () => filteredAssets.filter((asset) => asset.license_mode === "assigned"),
    [filteredAssets]
  );
  const renewalAssets = useMemo(
    () => filteredAssets.filter((asset) => asset.renewal_date),
    [filteredAssets]
  );

  const startCreate = (licenseMode) => {
    if (!isAdmin) return;
    setIsCreateMode(true);
    setSelectedAssetId(null);
    setSelectedRowIds([]);
    setFormData(buildEmptySoftwareAssetForm({ licenseMode }));
  };

  const toggleSharedUser = (userId) =>
    setFormData((current) => {
      const nextSharedUserIds = (current.shared_user_ids || []).includes(String(userId))
        ? current.shared_user_ids.filter((id) => id !== String(userId))
        : [...(current.shared_user_ids || []), String(userId)];

      return {
        ...current,
        shared_user_ids: nextSharedUserIds,
        seats_total: Math.max(Number(current.seats_total || 1), nextSharedUserIds.length || 1),
      };
    });

  const toggleAllSharedUsers = () =>
    setFormData((current) => {
      const allUserIds = userOptions.map((user) => String(user.id));
      const allSelected =
        allUserIds.length > 0 &&
        allUserIds.every((userId) => (current.shared_user_ids || []).includes(userId));
      const nextSharedUserIds = allSelected ? [] : allUserIds;

      return {
        ...current,
        shared_user_ids: nextSharedUserIds,
        seats_total: allSelected
          ? Math.max(Number(current.seats_total || 1), 1)
          : Math.max(Number(current.seats_total || 1), nextSharedUserIds.length || 1),
      };
    });

  const toggleRowSelection = (assetId, checked) =>
    setSelectedRowIds((current) =>
      checked
        ? [...new Set([...current, String(assetId)])]
        : current.filter((id) => id !== String(assetId))
    );

  const toggleAllRows = (records) => {
    const recordIds = records.map((record) => String(record.id));
    const allSelected = recordIds.every((id) => selectedRowIds.includes(id));
    setSelectedRowIds((current) =>
      allSelected
        ? current.filter((id) => !recordIds.includes(id))
        : [...new Set([...current, ...recordIds])]
    );
  };

  const buildPayload = () => {
    const metadata = safeParseMetadataText(formData.extra_metadata_text);
    if (!metadata.ok) throw new Error(copy.errorMetadata);

    return {
      name: String(formData.name || "").trim(),
      vendor: String(formData.vendor || "").trim(),
      plan_name: String(formData.plan_name || "").trim(),
      record_type: formData.record_type,
      license_mode: formData.license_mode,
      operational_status: formData.operational_status,
      provider_code: formData.provider_code,
      record_source: formData.record_source,
      account_email: String(formData.account_email || "").trim(),
      billing_email: String(formData.billing_email || "").trim(),
      seats_total: formData.license_mode === "shared" ? Number(formData.seats_total || 1) : 1,
      billing_cycle: formData.billing_cycle,
      department: String(formData.department || "").trim(),
      cost_center: String(formData.cost_center || "").trim(),
      invoice_number: String(formData.invoice_number || "").trim(),
      contract_reference: String(formData.contract_reference || "").trim(),
      purchase_date: formData.purchase_date || null,
      renewal_date: formData.renewal_date || null,
      auto_renew: Boolean(formData.auto_renew),
      purchase_price: formData.purchase_price === "" ? null : String(formData.purchase_price),
      currency: formData.currency || "USD",
      approved_by: formData.approved_by ? Number(formData.approved_by) : null,
      purchased_by: formData.purchased_by ? Number(formData.purchased_by) : null,
      renewal_owner: formData.renewal_owner ? Number(formData.renewal_owner) : null,
      vendor_contact: String(formData.vendor_contact || "").trim(),
      support_link: String(formData.support_link || "").trim(),
      documentation_link: String(formData.documentation_link || "").trim(),
      external_id: String(formData.external_id || "").trim(),
      external_workspace_id: String(formData.external_workspace_id || "").trim(),
      is_scim_managed: Boolean(formData.is_scim_managed),
      is_sso_managed: Boolean(formData.is_sso_managed),
      notes: String(formData.notes || "").trim(),
      extra_metadata: metadata.value,
      shared_user_ids:
        formData.license_mode === "shared" ? (formData.shared_user_ids || []).map(Number) : [],
      assigned_user_id:
        formData.license_mode === "assigned"
          ? Number(formData.assigned_user_id || 0) || null
          : null,
    };
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    try {
      const payload = buildPayload();
      const onSuccess = async () => {
        toast.success(selectedAsset && !isCreateMode ? copy.successUpdate : copy.successCreate);
        setIsCreateMode(false);
        await refreshAll();
      };
      const onError = () => toast.error(copy.errorSave);

      if (selectedAsset && !isCreateMode) {
        updateAsset(
          { resource: "software-assets", id: selectedAsset.id, values: payload },
          { onSuccess, onError }
        );
      } else {
        createAsset({ resource: "software-assets", values: payload }, { onSuccess, onError });
      }
    } catch (error) {
      toast.error(error.message || copy.errorSave);
    }
  };

  const handleDelete = () =>
    deleteAsset(
      { resource: "software-assets", id: selectedAsset.id },
      {
        onSuccess: async () => {
          toast.success(copy.successDelete);
          setDeleteConfirmOpen(false);
          setSelectedAssetId(null);
          await refreshAll();
        },
        onError: () => toast.error(copy.errorDelete),
      }
    );

  const handleSyncRecord = async () => {
    try {
      setIsSyncing(true);
      await apiClient.post(`/software-assets/${selectedAsset.id}/sync/`);
      toast.success(copy.successSync);
      await refreshAll();
    } catch {
      toast.error(copy.errorSync);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleReclaimRecord = async () => {
    try {
      setIsReclaiming(true);
      await apiClient.post(`/software-assets/${selectedAsset.id}/reclaim/`, {
        user_ids: (selectedAsset.assignments || []).map((assignment) => assignment.user),
      });
      toast.success(copy.successReclaim);
      await refreshAll();
    } catch {
      toast.error(copy.errorReclaim);
    } finally {
      setIsReclaiming(false);
    }
  };

  const resolveUserId = (value) => {
    const raw = String(value || "").trim().toLowerCase();
    if (!raw) return null;

    const numeric = Number(raw);
    if (!Number.isNaN(numeric) && userOptions.some((user) => Number(user.id) === numeric)) {
      return numeric;
    }

    return (
      userOptions.find((user) =>
        [user.username, user.email].some(
          (candidate) => String(candidate || "").trim().toLowerCase() === raw
        )
      )?.id || null
    );
  };

  const mapCsvRowToPayload = (row) => ({
    name: row.name || row.product || row.urun || "",
    vendor: row.vendor || row.provider || row.saglayici || "",
    plan_name: row.plan_name || row.plan || "",
    record_type: normalizeRecordType(row.record_type || row.type || row.tip) || "saas",
    license_mode:
      normalizeLicenseMode(row.license_mode || row.user_scope || row.kimlik || row.kapsam) ||
      "shared",
    operational_status:
      normalizeOperationalStatus(row.operational_status || row.status || row.durum) ||
      "active",
    provider_code:
      normalizeProviderCode(row.provider_code, row.vendor || row.provider || row.saglayici) ||
      "manual",
    record_source:
      normalizeRecordSource(row.record_source || row.source || row.kayit_kaynagi) || "manual",
    account_email: String(row.account_email || row.hesap_epostasi || "").trim(),
    billing_email: String(row.billing_email || row.fatura_epostasi || "").trim(),
    billing_cycle:
      normalizeBillingCycle(row.billing_cycle || row.faturalama || row.billing) || "monthly",
    purchase_price:
      normalizePurchasePrice(row.purchase_price || row.price || row.fiyat) || null,
    currency: normalizeCurrency(row.currency || row.para_birimi) || "USD",
    seats_total: Number(row.seats_total || row.total_seats || row.seats || row.koltuk || 1),
    invoice_number: String(row.invoice_number || row.fatura_numarasi || "").trim(),
    contract_reference: String(row.contract_reference || row.sozlesme_referansi || "").trim(),
    purchase_date: row.purchase_date || row.satin_alma_tarihi || null,
    renewal_date: row.renewal_date || null,
    auto_renew: normalizeBoolean(row.auto_renew || row.otomatik_yenileme, false),
    department: row.department || "",
    cost_center: row.cost_center || "",
    approved_by: resolveUserId(row.approved_by || row.onaylayan),
    purchased_by: resolveUserId(row.purchased_by || row.satin_alan),
    renewal_owner: resolveUserId(row.renewal_owner || row.yenileme_sorumlusu),
    vendor_contact: String(row.vendor_contact || row.satici_iletisimi || "").trim(),
    support_link: String(row.support_link || row.destek_linki || "").trim(),
    documentation_link: String(row.documentation_link || row.dokumantasyon_linki || "").trim(),
    external_id: String(row.external_id || row.harici_kimlik || "").trim(),
    external_workspace_id: String(
      row.external_workspace_id || row.harici_calisma_alani || ""
    ).trim(),
    is_scim_managed: normalizeBoolean(row.is_scim_managed || row.scim_yonetimli, false),
    is_sso_managed: normalizeBoolean(row.is_sso_managed || row.sso_yonetimli, false),
    notes: row.notes || row.note || row.aciklama || "",
    extra_metadata: parseImportMetadata(
      row.extra_metadata || row.extra_metadata_text || row.metadata || row.ek_metadata
    ),
    assigned_user_id: resolveUserId(row.assigned_user || row.assigned_user_id),
    shared_user_ids: String(row.shared_users || row.shared_user_ids || "")
      .split(/[|;]+/)
      .map(resolveUserId)
      .filter(Boolean),
  });

  const clearImportDraft = useCallback(() => {
    setCsvText("");
    setSelectedCsvFileName("");
    if (csvFileInputRef.current) {
      csvFileInputRef.current.value = "";
    }
  }, []);

  const handleCsvFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      setCsvText(text);
      setSelectedCsvFileName(file.name || "");
    } catch {
      clearImportDraft();
      toast.error(copy.importReadError);
    }
  };

  const handleImport = async () => {
    const trimmedCsvText = String(csvText || "").trim();

    if (!trimmedCsvText) {
      toast.error(copy.errorImport, {
        description: copy.importEmpty,
      });
      return;
    }

    try {
      setIsImporting(true);
      const rows = parseCsvText(trimmedCsvText)
        .map(mapCsvRowToPayload)
        .filter((row) => row.name && row.vendor);
      const response = await apiClient.post("/software-assets/import-csv/", { rows });
      const createdCount = response.data.created_count || 0;
      const skippedCount = response.data.skipped_count || 0;
      const importErrors = Array.isArray(response.data.errors) ? response.data.errors : [];

      if (!createdCount && importErrors.length) {
        const firstError = importErrors[0] || {};
        toast.error(copy.errorImport, {
          description: interpolateTemplate(copy.importRowError, {
            row: firstError.row || 1,
            message: flattenImportErrorMessages(firstError.errors).join(", "),
          }),
        });
        return;
      }

      const importDescription = skippedCount
        ? interpolateTemplate(
            createdCount ? copy.importCreatedAndSkippedDescription : copy.importSkippedOnlyDescription,
            { created: createdCount, skipped: skippedCount }
          )
        : interpolateTemplate(copy.importCreatedDescription, {
            count: createdCount,
          });

      toast.success(copy.successImport, {
        description: importDescription,
      });
      if (importErrors.length) {
        const firstError = importErrors[0] || {};
        toast.error(copy.importPartialError, {
          description: interpolateTemplate(copy.importRowError, {
            row: firstError.row || 1,
            message: flattenImportErrorMessages(firstError.errors).join(", "),
          }),
        });
      }
      clearImportDraft();
      setIsImportOpen(false);
      await refreshAll();
    } catch {
      toast.error(copy.errorImport);
    } finally {
      setIsImporting(false);
    }
  };

  const handleBulkAssign = async () => {
    try {
      setIsBulkAssigning(true);
      await apiClient.post("/software-assets/bulk-assign/", {
        asset_ids: selectedRowIds.map(Number),
        user_ids: bulkUserIds.map(Number),
      });
      toast.success(copy.successBulkAssign);
      setSelectedRowIds([]);
      setBulkUserIds([]);
      await refreshAll();
    } catch {
      toast.error(copy.errorBulkAssign);
    } finally {
      setIsBulkAssigning(false);
    }
  };

  const handleBulkDelete = async () => {
    const assetIds = selectedRowIds.map(Number);
    if (!assetIds.length) return;

    try {
      setIsBulkDeleting(true);
      const response = await apiClient.post("/software-assets/bulk-delete/", {
        asset_ids: assetIds,
      });
      const deletedIds = (response.data?.deleted_ids || assetIds).map(Number);

      toast.success(copy.successBulkDelete);
      setBulkDeleteConfirmOpen(false);
      setBulkUserIds([]);
      setSelectedRowIds([]);
      if (deletedIds.includes(Number(selectedAssetId || 0))) {
        setSelectedAssetId(null);
      }
      await refreshAll();
    } catch (error) {
      toast.error(error.response?.data?.detail || copy.errorBulkDelete);
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleRequestSubmit = async (event) => {
    event.preventDefault();
    try {
      await apiClient.post("/license-requests/", requestForm);
      toast.success(copy.successRequest);
      setRequestForm(buildEmptyLicenseRequestForm());
      await loadSummary();
    } catch {
      toast.error(copy.errorRequest);
    }
  };

  const handleRequestProcess = async (requestId) => {
    try {
      setProcessingRequestId(requestId);
      const draft = requestDrafts[requestId] || {};
      await apiClient.patch(`/license-requests/${requestId}/`, {
        status: draft.status,
        asset: draft.asset ? Number(draft.asset) : null,
        resolution_note: draft.resolution_note || "",
      });
      toast.success(copy.successRequestUpdate);
      await refreshAll();
    } catch {
      toast.error(copy.errorRequestUpdate);
    } finally {
      setProcessingRequestId(null);
    }
  };

  const renderSimpleList = (title, items, icon) => (
    <div className="rounded-[28px] border border-slate-200/80 bg-white/85 p-5 shadow-[0_18px_50px_rgba(148,163,184,0.1)]">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="font-['Newsreader'] text-2xl tracking-tight text-slate-950">{title}</h3>
      </div>
      <div className="mt-4 space-y-3">
        {!items?.length ? (
          <div className="rounded-[18px] border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500">
            {copy.noRecords}
          </div>
        ) : (
          items.map((item) => (
            <button
              key={`${title}-${item.id}`}
              type="button"
              onClick={() => setSelectedAssetId(item.id)}
              className="w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-left transition hover:bg-slate-50"
            >
              <p className="font-semibold text-slate-900">{item.name}</p>
              <p className="mt-1 text-xs text-slate-500">
                {[item.vendor, formatDate(item.renewal_date)].filter(Boolean).join(" / ")}
              </p>
              <p className="mt-2 text-xs text-slate-400">
                {[item.primary_assignment?.email, item.vendor_contact].filter(Boolean).join(" / ") ||
                  copy.noValue}
              </p>
            </button>
          ))
        )}
      </div>
    </div>
  );

  const renderTable = (title, records) => (
    <SoftwareAssetsTableCard
      title={title}
      count={records.length}
      records={records}
      emptyMessage={copy.noRecords}
      copy={copy}
      isAdmin={isAdmin}
      isCreateMode={isCreateMode}
      selectedAssetId={selectedAssetId}
      onSelectAsset={(id) => {
        setIsCreateMode(false);
        setSelectedAssetId(id);
      }}
      formatDate={formatDate}
      formatMoney={formatMoney}
      providerLabels={providerLabels}
      recordTypeLabels={recordTypeLabels}
      billingCycleLabels={billingCycleLabels}
      getModeLabel={getModeLabel}
      getLifecycleLabel={getLifecycleLabel}
      getLifecycleVariant={getLifecycleVariant}
      selectedRowIds={selectedRowIds}
      onToggleRowSelection={toggleRowSelection}
      onToggleAllRows={() => toggleAllRows(records)}
    />
  );

  const renderRequests = () => (
    <div className="rounded-[28px] border border-slate-200/80 bg-white/85 p-5 shadow-[0_18px_50px_rgba(148,163,184,0.1)]">
      <h3 className="font-['Newsreader'] text-2xl tracking-tight text-slate-950">
        {copy.requestsTitle}
      </h3>
      <p className="mt-2 text-sm leading-7 text-slate-600">{copy.requestsHint}</p>

      {!isAdmin ? (
        <form onSubmit={handleRequestSubmit} className="mt-5 space-y-3">
          <input
            value={requestForm.requested_product}
            onChange={(event) =>
              setRequestForm((current) => ({
                ...current,
                requested_product: event.target.value,
              }))
            }
            placeholder={copy.requestProduct}
            className="w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none"
          />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <select
              value={requestForm.provider_code}
              onChange={(event) =>
                setRequestForm((current) => ({
                  ...current,
                  provider_code: event.target.value,
                }))
              }
              className="rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm"
            >
              {Object.entries(providerLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <select
              value={requestForm.request_type}
              onChange={(event) =>
                setRequestForm((current) => ({
                  ...current,
                  request_type: event.target.value,
                }))
              }
              className="rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm"
            >
              {LICENSE_REQUEST_TYPES.map((value) => (
                <option key={value} value={value}>
                  {requestTypeLabels[value]}
                </option>
              ))}
            </select>
          </div>
          <input
            value={requestForm.preferred_plan}
            onChange={(event) =>
              setRequestForm((current) => ({ ...current, preferred_plan: event.target.value }))
            }
            placeholder={copy.requestPlan}
            className="w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none"
          />
          <textarea
            value={requestForm.justification}
            onChange={(event) =>
              setRequestForm((current) => ({ ...current, justification: event.target.value }))
            }
            placeholder={copy.requestJustification}
            className="min-h-[120px] w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none"
          />
          <button
            type="submit"
            className="rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white"
          >
            {copy.requestSubmit}
          </button>
        </form>
      ) : null}

      <div className="mt-5 space-y-3">
        {(summary.requests || []).map((request) => {
          const draft = requestDrafts[request.id] || buildRequestDraftFromRequest(request);

          return (
            <div
              key={`request-${request.id}`}
              className="rounded-[18px] border border-slate-200 bg-white px-4 py-4"
            >
              <p className="font-semibold text-slate-900">{request.requested_product}</p>
              <p className="mt-1 text-xs text-slate-500">
                {[
                  request.requester_details?.username,
                  requestTypeLabels[request.request_type],
                  providerLabels[request.provider_code],
                ]
                  .filter(Boolean)
                  .join(" / ")}
              </p>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                {request.justification || copy.noValue}
              </p>

              {isAdmin ? (
                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                  <select
                    value={draft.status}
                    onChange={(event) =>
                      setRequestDrafts((current) => ({
                        ...current,
                        [request.id]: { ...draft, status: event.target.value },
                      }))
                    }
                    className="rounded-[16px] border border-slate-200 bg-white px-3 py-2 text-sm"
                  >
                    {["pending", "approved", "fulfilled", "rejected"].map((value) => (
                      <option key={value} value={value}>
                        {requestStatusLabels[value]}
                      </option>
                    ))}
                  </select>
                  <select
                    value={draft.asset}
                    onChange={(event) =>
                      setRequestDrafts((current) => ({
                        ...current,
                        [request.id]: { ...draft, asset: event.target.value },
                      }))
                    }
                    className="rounded-[16px] border border-slate-200 bg-white px-3 py-2 text-sm"
                  >
                    <option value="">{copy.noValue}</option>
                    {assets.map((asset) => (
                      <option key={asset.id} value={asset.id}>
                        {asset.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={processingRequestId === request.id}
                    onClick={() => handleRequestProcess(request.id)}
                    className="rounded-[16px] bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {copy.requestUpdate}
                  </button>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderAlertButton = (alert) => {
    const localizedAlert = getSoftwareAssetAlertCopy(alert, copy);

    return (
      <button
        key={`${alert.kind}-${alert.asset_id}-${alert.user_id || "none"}`}
        type="button"
        onClick={() => alert.asset_id && setSelectedAssetId(alert.asset_id)}
        className="w-full rounded-[18px] border border-slate-200 bg-white px-4 py-4 text-left transition hover:bg-slate-50"
      >
        <p className="font-semibold text-slate-900">{localizedAlert.title}</p>
        <p className="mt-2 text-sm leading-7 text-slate-600">{localizedAlert.description}</p>
      </button>
    );
  };

  const renderLogPanel = (title, items, icon, resolver) => (
    <div className="rounded-[28px] border border-slate-200/80 bg-white/85 p-5 shadow-[0_18px_50px_rgba(148,163,184,0.1)]">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="font-['Newsreader'] text-2xl tracking-tight text-slate-950">{title}</h3>
      </div>
      <div className="mt-4 space-y-3">
        {(items || []).map((item) => {
          const localizedItem = resolver(item);
          return (
            <div
              key={`${title}-${item.id}`}
              className="rounded-[18px] border border-slate-200 bg-white px-4 py-4"
            >
              <p className="font-semibold text-slate-900">{localizedItem.title}</p>
              <p className="mt-1 text-xs text-slate-500">{localizedItem.description}</p>
              <p className="mt-2 text-xs text-slate-400">{formatDateTime(item.created_at)}</p>
            </div>
          );
        })}
        {!items?.length ? (
          <div className="rounded-[18px] border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500">
            {copy.logsEmpty}
          </div>
        ) : null}
      </div>
    </div>
  );

  const renderTabContent = () => {
    if (activeTab === "shared") return renderTable(copy.tabs.shared, sharedAssets);
    if (activeTab === "assigned") return renderTable(copy.tabs.assigned, assignedAssets);
    if (activeTab === "renewals") return renderTable(copy.tabs.renewals, renewalAssets);

    if (activeTab === "cost" && isAdmin) {
      return (
        <div className="space-y-6">
          <div className="rounded-[28px] border border-slate-200/80 bg-white/85 p-5 shadow-[0_18px_50px_rgba(148,163,184,0.1)]">
            <h3 className="font-['Newsreader'] text-2xl tracking-tight text-slate-950">
              {copy.tabs.cost}
            </h3>
            <div className="mt-4 flex flex-col gap-4 md:flex-row md:flex-wrap">
              <div className="w-full rounded-[20px] border border-slate-200 bg-white p-4 md:min-w-[14rem] md:flex-[1_1_14rem]">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{copy.monthlyCost}</p>
                <p className="mt-2 whitespace-nowrap text-[clamp(2rem,1.4rem+1vw,3rem)] font-black leading-none tracking-tight tabular-nums text-slate-950">
                  {formatMoney(summary.stats?.monthly_cost_total || 0)}
                </p>
              </div>
              <div className="w-full rounded-[20px] border border-slate-200 bg-white p-4 md:min-w-[14rem] md:flex-[1_1_14rem]">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{copy.annualCost}</p>
                <p className="mt-2 whitespace-nowrap text-[clamp(2rem,1.4rem+1vw,3rem)] font-black leading-none tracking-tight tabular-nums text-slate-950">
                  {formatMoney(summary.stats?.annual_cost_total || 0)}
                </p>
              </div>
              <div className="w-full rounded-[20px] border border-slate-200 bg-white p-4 md:min-w-[14rem] md:flex-[1_1_14rem]">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{copy.costPerSeat}</p>
                <p className="mt-2 whitespace-nowrap text-[clamp(2rem,1.4rem+1vw,3rem)] font-black leading-none tracking-tight tabular-nums text-slate-950">
                  {formatMoney(summary.stats?.cost_per_used_seat || 0)}
                </p>
              </div>
            </div>
            <div className="mt-5 space-y-3">
              {(summary.provider_spend || []).map((provider) => (
                <div
                  key={provider.provider_code}
                  className="rounded-[18px] border border-slate-200 bg-white px-4 py-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-slate-900">
                      {providerLabels[provider.provider_code] || provider.provider_code}
                    </p>
                    <p className="text-sm text-slate-500">
                      {interpolateTemplate(copy.recordCount, { count: provider.record_count })}
                    </p>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">
                    {formatMoney(provider.monthly_cost || 0)} / {formatMoney(provider.annual_cost || 0)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {renderTable(copy.tabs.cost, filteredAssets)}
        </div>
      );
    }

    if (activeTab === "sync") {
      return (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          {renderLogPanel(
            copy.tabs.sync,
            summary.sync_logs,
            <FeatherRefreshCw className="text-sky-500" />,
            (item) => getSoftwareAssetSyncLogCopy(item, copy)
          )}
          {renderLogPanel(
            copy.auditTrail,
            summary.audit_logs,
            <FeatherFileText className="text-slate-500" />,
            (item) => getSoftwareAssetAuditLogCopy(item, copy)
          )}
        </div>
      );
    }

    if (activeTab === "alerts") {
      return (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.1fr)_0.9fr]">
          <div className="rounded-[28px] border border-slate-200/80 bg-white/85 p-5 shadow-[0_18px_50px_rgba(148,163,184,0.1)]">
            <h3 className="font-['Newsreader'] text-2xl tracking-tight text-slate-950">
              {copy.tabs.alerts}
            </h3>
            <div className="mt-4 space-y-3">
              {(summary.alerts || []).map(renderAlertButton)}
              {!summary.alerts?.length ? (
                <div className="rounded-[18px] border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500">
                  {copy.alertsEmpty}
                </div>
              ) : null}
            </div>
          </div>

          {renderRequests()}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="flex h-screen w-full items-start overflow-hidden bg-transparent font-sans text-slate-900">
      <Sidebar activeItem="software-assets" showTeamSubmenu={true} logoClickable={true} />
      <div className="relative flex grow flex-col items-start self-stretch overflow-y-auto pb-10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.76),transparent_36%)]" />
        <div className="relative flex w-full flex-col gap-6">
          <SoftwareAssetsOverview
            copy={copy}
            isAdmin={isAdmin}
            stats={summary.stats || {}}
            formatMoney={formatMoney}
            onCreateShared={() => startCreate("shared")}
            onCreateAssigned={() => startCreate("assigned")}
            onOpenImport={() => setIsImportOpen((current) => !current)}
            onOpenRequest={() => setActiveTab("alerts")}
          />

          {assetsQuery.error ? (
            <div className="mx-6 rounded-[24px] border border-red-200 bg-red-50/80 px-5 py-4 text-sm text-red-700 md:mx-8 xl:mx-10">
              {copy.errorLoad}
            </div>
          ) : null}

          <div className="flex w-full flex-col gap-6 px-6 md:px-8 xl:px-10">
            <div className="relative overflow-hidden rounded-[32px] border border-white/70 bg-[radial-gradient(circle_at_top_left,rgba(191,219,254,0.2),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.94),rgba(255,255,255,0.82))] p-5 shadow-[0_22px_60px_rgba(148,163,184,0.12)] backdrop-blur">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-[linear-gradient(90deg,rgba(15,23,42,0.04),transparent)]" />
              <div className="relative">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/78 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      <FeatherSparkles size={14} />
                      {copy.workspace}
                    </div>
                    <p className="max-w-2xl text-sm leading-7 text-slate-600">
                      {copy.intro}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {toolbarSignals.map((signal) => (
                      <span
                        key={signal.label}
                        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/82 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600"
                      >
                        {signal.icon}
                        {signal.label}: {signal.value}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.65fr)_repeat(5,minmax(0,1fr))]">
                  <label className="space-y-2 xl:col-span-1">
                    <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                      {copy.filterSearch}
                    </span>
                    <div className="relative">
                      <FeatherSearch
                        size={18}
                        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                      />
                      <input
                        value={filters.search}
                        onChange={(event) =>
                          setFilters((current) => ({ ...current, search: event.target.value }))
                        }
                        placeholder={copy.filterSearch}
                        className="w-full rounded-[20px] border border-slate-200 bg-white/90 px-12 py-3.5 text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-400/30"
                      />
                    </div>
                  </label>
                  {[
                    { key: "provider", label: copy.filterProvider, options: { all: copy.filterAll, ...providerLabels } },
                    {
                      key: "lifecycle",
                      label: copy.filterStatus,
                      options: {
                        all: copy.filterAll,
                        active: copy.active,
                        expiring_soon: copy.expiringLabel,
                        expired: copy.expired,
                        inactive: copy.inactive,
                        archived: copy.archived,
                      },
                    },
                    {
                      key: "mode",
                      label: copy.filterMode,
                      options: { all: copy.filterAll, shared: copy.shared, assigned: copy.assigned },
                    },
                    {
                      key: "source",
                      label: copy.filterSource,
                      options: { all: copy.filterAll, manual: copy.manualRecord, provider_sync: copy.providerSync },
                    },
                    {
                      key: "renewal",
                      label: copy.filterRenewal,
                      options: {
                        all: copy.filterAll,
                        "7_days": "7",
                        expired: copy.expired,
                        future: copy.future,
                      },
                    },
                  ].map((filterItem) => (
                    <label key={filterItem.key} className="space-y-2">
                      <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                        {filterItem.label}
                      </span>
                      <select
                        value={filters[filterItem.key]}
                        onChange={(event) =>
                          setFilters((current) => ({
                            ...current,
                            [filterItem.key]: event.target.value,
                          }))
                        }
                        className="w-full rounded-[20px] border border-slate-200 bg-white/88 px-4 py-3.5 text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-400/30"
                      >
                        {Object.entries(filterItem.options).map(([value, label]) => (
                          <option key={`${filterItem.key}-${value}`} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>

                <div className="mt-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div className="overflow-x-auto rounded-[22px] border border-slate-200/80 bg-white/78 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
                    <Tabs className="overflow-x-auto">
                      {availableTabs.map((tabKey) => (
                        <Tabs.Item
                          key={tabKey}
                          active={activeTab === tabKey}
                          onClick={() => setActiveTab(tabKey)}
                        >
                          {copy.tabs[tabKey]}
                        </Tabs.Item>
                      ))}
                    </Tabs>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white/82 text-slate-500">
                      <FeatherTrendingUp size={16} />
                    </span>
                    <select
                      value={filters.sort}
                      onChange={(event) =>
                        setFilters((current) => ({ ...current, sort: event.target.value }))
                      }
                      className="rounded-[20px] border border-slate-200 bg-white/88 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-400/30"
                    >
                      {availableSortOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {isAdmin && isImportOpen ? (
              <div className="rounded-[28px] border border-white/65 bg-white/85 p-5 shadow-[0_18px_50px_rgba(148,163,184,0.1)]">
                <h3 className="font-['Newsreader'] text-2xl tracking-tight text-slate-950">
                  {copy.importTitle}
                </h3>
                <p className="mt-2 text-sm leading-7 text-slate-600">{copy.importHint}</p>
                <div className="mt-4 rounded-[24px] border border-dashed border-slate-200 bg-slate-50/70 p-4">
                  <input
                    ref={csvFileInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    onChange={handleCsvFileChange}
                    className="hidden"
                    id="software-assets-csv-file-input"
                  />
                  <div className="flex flex-wrap items-center gap-3">
                    <label
                      htmlFor="software-assets-csv-file-input"
                      className="cursor-pointer rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      {copy.importChooseFile}
                    </label>
                    {csvText ? (
                      <button
                        type="button"
                        onClick={clearImportDraft}
                        className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                      >
                        {copy.importClear}
                      </button>
                    ) : null}
                    <span className="text-sm text-slate-500">
                      {selectedCsvFileName
                        ? interpolateTemplate(copy.importFileSelected, {
                            fileName: selectedCsvFileName,
                          })
                        : copy.importFileHint}
                    </span>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleImport}
                    disabled={isImporting || !csvText}
                    className="rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white"
                  >
                    {copy.runImport}
                  </button>
                </div>
              </div>
            ) : null}

            {isAdmin && selectedRowIds.length ? (
              <div className="rounded-[28px] border border-slate-200/80 bg-white/85 p-5 shadow-[0_18px_50px_rgba(148,163,184,0.1)]">
                <h3 className="font-['Newsreader'] text-2xl tracking-tight text-slate-950">
                  {copy.bulkTitle}
                </h3>
                <p className="mt-2 text-sm leading-7 text-slate-600">{copy.bulkHint}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {userOptions.map((user) => {
                    const active = bulkUserIds.includes(String(user.id));
                    return (
                      <button
                        key={`bulk-user-${user.id}`}
                        type="button"
                        onClick={() =>
                          setBulkUserIds((current) =>
                            active
                              ? current.filter((id) => id !== String(user.id))
                              : [...current, String(user.id)]
                          )
                        }
                        className={`rounded-full px-3 py-2 text-sm font-semibold transition ${
                          active
                            ? "bg-slate-950 text-white"
                            : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        {user.username}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleBulkAssign}
                    disabled={isBulkAssigning || isBulkDeleting}
                    className="rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white"
                  >
                    {copy.bulkApply}
                  </button>
                  <button
                    type="button"
                    onClick={() => setBulkDeleteConfirmOpen(true)}
                    disabled={isBulkAssigning || isBulkDeleting}
                    className="rounded-full border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-60"
                  >
                    {copy.bulkDelete}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedRowIds([])}
                    disabled={isBulkDeleting}
                    className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700"
                  >
                    {copy.clearSelection}
                  </button>
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {selectedRowIds.length} {copy.selectedRows}
                  </span>
                </div>
              </div>
            ) : null}

            <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_440px]">
              <div className="flex min-w-0 flex-col gap-6">{renderTabContent()}</div>
              <SoftwareAssetPanel
                copy={copy}
                isAdmin={isAdmin}
                isCreateMode={isCreateMode}
                selectedAsset={selectedAsset}
                formData={formData}
                userOptions={userOptions}
                providerLabels={providerLabels}
                recordTypeLabels={recordTypeLabels}
                billingCycleLabels={billingCycleLabels}
                statusLabels={statusLabels}
                canEditSelectedAsset={Boolean(isAdmin && (isCreateMode || selectedAsset))}
                canDeleteSelectedAsset={Boolean(isAdmin && selectedAsset)}
                isSaving={isCreating || isUpdating}
                isDeleting={isDeleting}
                isSyncing={isSyncing}
                isReclaiming={isReclaiming}
                onSubmit={handleSubmit}
                onDeleteClick={() => setDeleteConfirmOpen(true)}
                onCancelCreate={() => setIsCreateMode(false)}
                onSetLicenseMode={(licenseMode) =>
                  setFormData((current) => ({
                    ...current,
                    license_mode: licenseMode,
                    seats_total: licenseMode === "shared" ? Math.max(Number(current.seats_total || 1), 1) : 1,
                    shared_user_ids: licenseMode === "shared" ? [] : [],
                    assigned_user_id: licenseMode === "assigned" ? current.assigned_user_id || "" : "",
                  }))
                }
                onToggleSharedUser={toggleSharedUser}
                onToggleAllSharedUsers={toggleAllSharedUsers}
                onSyncRecord={handleSyncRecord}
                onReclaimRecord={handleReclaimRecord}
                setFormData={setFormData}
                formatDateTime={formatDateTime}
                formatMoney={formatMoney}
                getModeLabel={getModeLabel}
                getRecordSourceLabel={getRecordSourceLabel}
                getLifecycleLabel={getLifecycleLabel}
                getLifecycleVariant={getLifecycleVariant}
              />
            </section>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={bulkDeleteConfirmOpen}
        title={copy.bulkDeleteTitle}
        description={interpolateTemplate(copy.bulkDeleteDescription, {
          count: selectedAssets.length,
        })}
        confirmLabel={copy.bulkDelete}
        cancelLabel={copy.no}
        onClose={() => setBulkDeleteConfirmOpen(false)}
        onConfirm={handleBulkDelete}
        isProcessing={isBulkDeleting}
      />

      <ConfirmDialog
        open={deleteConfirmOpen}
        title={copy.delete}
        description={copy.delete}
        confirmLabel={copy.yes}
        cancelLabel={copy.no}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleDelete}
        isProcessing={isDeleting}
      />
    </div>
  );
}

export default SoftwareAssets;
