import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useCreate, useDelete, useInvalidate, useList, useUpdate } from "@refinedev/core";
import { FeatherAlertTriangle, FeatherFileText, FeatherRefreshCw } from "@subframe/core";
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
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isBulkAssigning, setIsBulkAssigning] = useState(false);
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

  const selectedAsset = useMemo(
    () =>
      isCreateMode
        ? null
        : assets.find((asset) => String(asset.id) === String(selectedAssetId)) || null,
    [assets, isCreateMode, selectedAssetId]
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
      if (TAB_ITEMS.includes(current)) return current;
      return isAdmin ? "shared" : "assigned";
    });
  }, [isAdmin]);

  const filteredAssets = useMemo(() => {
    const search = filters.search.trim().toLowerCase();
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
      if (filters.lifecycle !== "all" && asset.lifecycle_status !== filters.lifecycle) return false;
      if (filters.renewal !== "all" && asset.renewal_window !== filters.renewal) return false;
      return true;
    });

    return items.sort((left, right) => {
      if (filters.sort === "cost_desc") {
        return Number(right.annual_cost_estimate || 0) - Number(left.annual_cost_estimate || 0);
      }
      if (filters.sort === "vendor_asc") {
        return String(left.vendor || "").localeCompare(String(right.vendor || ""));
      }
      if (filters.sort === "updated_desc") {
        return String(right.updated_at || "").localeCompare(String(left.updated_at || ""));
      }
      if (filters.sort === "utilization_desc") {
        return Number(right.utilization_rate || 0) - Number(left.utilization_rate || 0);
      }
      return String(left.renewal_date || "9999").localeCompare(String(right.renewal_date || "9999"));
    });
  }, [assets, filters]);

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
    setFormData((current) => ({
      ...current,
      shared_user_ids: (current.shared_user_ids || []).includes(String(userId))
        ? current.shared_user_ids.filter((id) => id !== String(userId))
        : [...(current.shared_user_ids || []), String(userId)],
    }));

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
    name: row.name || row.product || "",
    vendor: row.vendor || providerLabels[row.provider_code] || "",
    record_type: row.record_type || "saas",
    license_mode: row.license_mode || "shared",
    provider_code: row.provider_code || "manual",
    billing_cycle: row.billing_cycle || "monthly",
    purchase_price: row.purchase_price || null,
    currency: row.currency || "USD",
    seats_total: Number(row.seats_total || 1),
    renewal_date: row.renewal_date || null,
    department: row.department || "",
    cost_center: row.cost_center || "",
    assigned_user_id: resolveUserId(row.assigned_user || row.assigned_user_id),
    shared_user_ids: String(row.shared_users || row.shared_user_ids || "")
      .split(/[|;]+/)
      .map(resolveUserId)
      .filter(Boolean),
  });

  const handleImport = async () => {
    try {
      setIsImporting(true);
      const rows = parseCsvText(csvText)
        .map(mapCsvRowToPayload)
        .filter((row) => row.name && row.vendor);
      const response = await apiClient.post("/software-assets/import-csv/", { rows });
      toast.success(copy.successImport, {
        description: interpolateTemplate(copy.importCreatedDescription, {
          count: response.data.created_count || 0,
        }),
      });
      setCsvText("");
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

    if (activeTab === "cost") {
      return (
        <div className="space-y-6">
          <div className="rounded-[28px] border border-slate-200/80 bg-white/85 p-5 shadow-[0_18px_50px_rgba(148,163,184,0.1)]">
            <h3 className="font-['Newsreader'] text-2xl tracking-tight text-slate-950">
              {copy.tabs.cost}
            </h3>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-[20px] border border-slate-200 bg-white p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{copy.monthlyCost}</p>
                <p className="mt-2 text-3xl font-black text-slate-950">
                  {formatMoney(summary.stats?.monthly_cost_total || 0)}
                </p>
              </div>
              <div className="rounded-[20px] border border-slate-200 bg-white p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{copy.annualCost}</p>
                <p className="mt-2 text-3xl font-black text-slate-950">
                  {formatMoney(summary.stats?.annual_cost_total || 0)}
                </p>
              </div>
              <div className="rounded-[20px] border border-slate-200 bg-white p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{copy.costPerSeat}</p>
                <p className="mt-2 text-3xl font-black text-slate-950">
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
            <div className="rounded-[28px] border border-white/65 bg-white/75 p-5 shadow-[0_20px_50px_rgba(148,163,184,0.1)] backdrop-blur">
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.4fr)_repeat(5,minmax(0,1fr))]">
                <input
                  value={filters.search}
                  onChange={(event) =>
                    setFilters((current) => ({ ...current, search: event.target.value }))
                  }
                  placeholder={copy.filterSearch}
                  className="w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-400/30"
                />
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
                      className="w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none"
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

              <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
                <Tabs className="overflow-x-auto">
                  {TAB_ITEMS.map((tabKey) => (
                    <Tabs.Item
                      key={tabKey}
                      active={activeTab === tabKey}
                      onClick={() => setActiveTab(tabKey)}
                    >
                      {copy.tabs[tabKey]}
                    </Tabs.Item>
                  ))}
                </Tabs>
                <select
                  value={filters.sort}
                  onChange={(event) =>
                    setFilters((current) => ({ ...current, sort: event.target.value }))
                  }
                  className="rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none"
                >
                  <option value="renewal_asc">{sortOptions.renewal_asc}</option>
                  <option value="cost_desc">{sortOptions.cost_desc}</option>
                  <option value="vendor_asc">{sortOptions.vendor_asc}</option>
                  <option value="updated_desc">{sortOptions.updated_desc}</option>
                  <option value="utilization_desc">{sortOptions.utilization_desc}</option>
                </select>
              </div>
            </div>

            {isAdmin && isImportOpen ? (
              <div className="rounded-[28px] border border-white/65 bg-white/85 p-5 shadow-[0_18px_50px_rgba(148,163,184,0.1)]">
                <h3 className="font-['Newsreader'] text-2xl tracking-tight text-slate-950">
                  {copy.importTitle}
                </h3>
                <p className="mt-2 text-sm leading-7 text-slate-600">{copy.importHint}</p>
                <textarea
                  value={csvText}
                  onChange={(event) => setCsvText(event.target.value)}
                  placeholder={copy.importPlaceholder}
                  className="mt-4 min-h-[180px] w-full rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-400/30"
                />
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleImport}
                    disabled={isImporting}
                    className="rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white"
                  >
                    {copy.runImport}
                  </button>
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {copy.importPlaceholder}
                  </span>
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
                    disabled={isBulkAssigning}
                    className="rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white"
                  >
                    {copy.bulkApply}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedRowIds([])}
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

            <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
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
                    shared_user_ids: licenseMode === "shared" ? current.shared_user_ids || [] : [],
                    assigned_user_id: licenseMode === "assigned" ? current.assigned_user_id || "" : "",
                  }))
                }
                onToggleSharedUser={toggleSharedUser}
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
