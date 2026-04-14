import { defaultLanguage, translations } from "../../i18n/translations.js";

export const SOFTWARE_ASSET_PROVIDER_CODES = [
  "manual",
  "cursor",
  "adobe",
  "figma",
  "github",
  "microsoft",
  "openai",
  "other",
];

export const SOFTWARE_ASSET_RECORD_TYPES = [
  "saas",
  "desktop_license",
  "team_tool",
  "single_user_license",
  "api_subscription",
  "support_service",
];

export const SOFTWARE_ASSET_BILLING_CYCLES = [
  "monthly",
  "quarterly",
  "yearly",
  "one_time",
];

export const SOFTWARE_ASSET_STATUS_CODES = ["active", "inactive", "archived"];
export const SOFTWARE_ASSET_CURRENCY_CODES = ["TRY", "USD", "EUR", "GBP"];
export const LICENSE_REQUEST_TYPES = [
  "access_request",
  "new_purchase",
  "seat_increase",
  "replacement",
];

export const SOFTWARE_ASSET_INPUT_CLASS_NAME =
  "w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-400/30 disabled:bg-slate-50";

export const SOFTWARE_ASSET_TEXTAREA_CLASS_NAME =
  "min-h-[120px] w-full resize-none rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm leading-7 text-slate-900 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-400/30 disabled:bg-slate-50";

export const CSV_SAMPLE_HEADERS =
  "name,vendor,record_type,license_mode,provider_code,billing_cycle,purchase_price,currency,seats_total,assigned_user,shared_users,renewal_date,department,cost_center";

const stringifyMetadata = (value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return "";
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "";
  }
};

export const buildEmptySoftwareAssetForm = ({ licenseMode = "shared" } = {}) => ({
  name: "",
  vendor: "",
  plan_name: "",
  record_type: "saas",
  license_mode: licenseMode,
  operational_status: "active",
  provider_code: "manual",
  record_source: "manual",
  account_email: "",
  billing_email: "",
  seats_total: 1,
  billing_cycle: "monthly",
  department: "",
  cost_center: "",
  invoice_number: "",
  contract_reference: "",
  purchase_date: "",
  renewal_date: "",
  auto_renew: false,
  purchase_price: "",
  currency: "USD",
  approved_by: "",
  purchased_by: "",
  renewal_owner: "",
  vendor_contact: "",
  support_link: "",
  documentation_link: "",
  external_id: "",
  external_workspace_id: "",
  is_scim_managed: false,
  is_sso_managed: false,
  notes: "",
  extra_metadata_text: "",
  shared_user_ids: [],
  assigned_user_id: "",
});

export const buildSoftwareAssetFormFromAsset = (asset) => ({
  name: asset?.name || "",
  vendor: asset?.vendor || "",
  plan_name: asset?.plan_name || "",
  record_type: asset?.record_type || "saas",
  license_mode: asset?.license_mode || "shared",
  operational_status: asset?.operational_status || "active",
  provider_code: asset?.provider_code || "manual",
  record_source: asset?.record_source || "manual",
  account_email: asset?.account_email || asset?.primary_assignment?.effective_email || "",
  billing_email: asset?.billing_email || "",
  seats_total: Number(asset?.seats_total || 1),
  billing_cycle: asset?.billing_cycle || "monthly",
  department: asset?.department || "",
  cost_center: asset?.cost_center || "",
  invoice_number: asset?.invoice_number || "",
  contract_reference: asset?.contract_reference || "",
  purchase_date: asset?.purchase_date || "",
  renewal_date: asset?.renewal_date || "",
  auto_renew: Boolean(asset?.auto_renew),
  purchase_price: asset?.purchase_price ?? "",
  currency: asset?.currency || "USD",
  approved_by: String(asset?.approved_by || ""),
  purchased_by: String(asset?.purchased_by || ""),
  renewal_owner: String(asset?.renewal_owner || ""),
  vendor_contact: asset?.vendor_contact || "",
  support_link: asset?.support_link || "",
  documentation_link: asset?.documentation_link || "",
  external_id: asset?.external_id || "",
  external_workspace_id: asset?.external_workspace_id || "",
  is_scim_managed: Boolean(asset?.is_scim_managed),
  is_sso_managed: Boolean(asset?.is_sso_managed),
  notes: asset?.notes || "",
  extra_metadata_text: stringifyMetadata(asset?.extra_metadata),
  shared_user_ids: (asset?.assignments || []).map((assignment) => String(assignment.user)),
  assigned_user_id: String(asset?.primary_assignment?.user || ""),
});

export const buildEmptyLicenseRequestForm = () => ({
  requested_product: "",
  provider_code: "other",
  request_type: "access_request",
  preferred_plan: "",
  justification: "",
});

export const buildRequestDraftFromRequest = (request) => ({
  status: request?.status || "pending",
  asset: String(request?.asset || ""),
  resolution_note: request?.resolution_note || "",
});

export function safeParseMetadataText(text) {
  const value = String(text || "").trim();
  if (!value) {
    return { ok: true, value: {} };
  }

  try {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { ok: false, error: "Metadata must be a JSON object." };
    }
    return { ok: true, value: parsed };
  } catch {
    return { ok: false, error: "Metadata must be valid JSON." };
  }
}

function parseCsvLine(line, delimiter = ",") {
  const values = [];
  let current = "";
  let insideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const nextCharacter = line[index + 1];

    if (character === '"' && insideQuotes && nextCharacter === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (character === '"') {
      insideQuotes = !insideQuotes;
      continue;
    }

    if (character === delimiter && !insideQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += character;
  }

  values.push(current.trim());
  return values;
}

function detectCsvDelimiter(line) {
  return parseCsvLine(line, ";").length > parseCsvLine(line, ",").length ? ";" : ",";
}

function normalizeCsvHeader(header) {
  return String(header || "")
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_")
    .replace(/[^\w]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function parseCsvText(text) {
  const rows = String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!rows.length) {
    return [];
  }

  const delimiter = detectCsvDelimiter(rows[0]);
  const headers = parseCsvLine(rows[0], delimiter).map(normalizeCsvHeader);

  return rows.slice(1).map((line) => {
    const columns = parseCsvLine(line, delimiter);
    return headers.reduce((result, header, index) => {
      result[header] = columns[index] ?? "";
      return result;
    }, {});
  });
}

export function interpolateTemplate(template, values) {
  return String(template || "").replace(/\{\{(\w+)\}\}/g, (_, key) =>
    values?.[key] == null ? "" : String(values[key])
  );
}

export function getSoftwareAssetsCopy(language) {
  return (
    translations[language]?.softwareAssets ||
    translations[defaultLanguage]?.softwareAssets ||
    {}
  );
}

export function getSoftwareAssetAlertCopy(alert, copy) {
  const values = {
    asset: alert?.asset_name || copy.noValue,
    user: alert?.user_name || copy.noValue,
    products: Array.isArray(alert?.product_names)
      ? alert.product_names.join(", ")
      : alert?.product_names || copy.noValue,
  };

  const keyMap = {
    expired: ["expiredTitle", "expiredDescription"],
    renewal_due: ["renewalDueTitle", "renewalDueDescription"],
    paid_unused: ["paidUnusedTitle", "paidUnusedDescription"],
    seat_full: ["seatFullTitle", "seatFullDescription"],
    sync_error: ["syncErrorTitle", "syncErrorDescription"],
    source_mismatch: ["sourceMismatchTitle", "sourceMismatchDescription"],
    low_usage_before_renewal: ["lowUsageTitle", "lowUsageDescription"],
    offboarded_assignment: ["offboardedTitle", "offboardedDescription"],
    duplicate_assignment: ["duplicateTitle", "duplicateDescription"],
  };

  const [titleKey, descriptionKey] =
    keyMap[alert?.kind] || ["fallbackTitle", "fallbackDescription"];

  return {
    title:
      interpolateTemplate(copy.alerts?.[titleKey], values) ||
      alert?.title ||
      copy.noValue,
    description:
      interpolateTemplate(copy.alerts?.[descriptionKey], values) ||
      alert?.description ||
      copy.noValue,
  };
}

export function getSoftwareAssetAuditLogCopy(log, copy) {
  const actorName = `${log?.actor_details?.first_name || ""} ${log?.actor_details?.last_name || ""}`.trim();
  const actor = actorName || log?.actor_details?.username || copy.noValue;
  const requestStatuses = copy.requestStatuses || {};
  const values = {
    asset: log?.asset_name || log?.payload?.name || copy.noValue,
    actor,
    product: log?.payload?.requested_product || log?.asset_name || copy.noValue,
    from: requestStatuses[log?.payload?.from] || log?.payload?.from || copy.noValue,
    to: requestStatuses[log?.payload?.to] || log?.payload?.to || copy.noValue,
    status:
      requestStatuses[log?.payload?.status] ||
      log?.payload?.status ||
      copy.noValue,
  };

  const eventMap = {
    created: ["createdTitle", "createdDescription"],
    updated: ["updatedTitle", "updatedDescription"],
    deleted: ["deletedTitle", "deletedDescription"],
    imported: ["importedTitle", "importedDescription"],
    assignment_changed: ["assignmentChangedTitle", "assignmentChangedDescription"],
    reclaimed: ["reclaimedTitle", "reclaimedDescription"],
    sync_requested: ["syncRequestedTitle", "syncRequestedDescription"],
    sync_result: ["syncResultTitle", "syncResultDescription"],
    request_created: ["requestCreatedTitle", "requestCreatedDescription"],
    request_status_changed: ["requestStatusChangedTitle", "requestStatusChangedDescription"],
  };

  const [titleKey, descriptionKey] =
    eventMap[log?.event_type] || ["fallbackTitle", "fallbackDescription"];

  return {
    title:
      interpolateTemplate(copy.auditEvents?.[titleKey], values) ||
      log?.asset_name ||
      copy.noValue,
    description:
      interpolateTemplate(copy.auditEvents?.[descriptionKey], values) ||
      log?.message ||
      copy.noValue,
  };
}

export function getSoftwareAssetSyncLogCopy(log, copy) {
  const values = {
    asset: log?.asset_name || copy.noValue,
  };
  const syncKey =
    log?.status === "error" ? "error" : log?.status === "pending" ? "pending" : "ok";

  return {
    title:
      interpolateTemplate(copy.syncLogs?.[`${syncKey}Title`], values) ||
      log?.asset_name ||
      copy.noValue,
    description:
      interpolateTemplate(copy.syncLogs?.[`${syncKey}Description`], values) ||
      log?.message ||
      copy.noValue,
  };
}
