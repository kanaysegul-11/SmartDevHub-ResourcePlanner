import React from "react";
import {
  FeatherExternalLink,
  FeatherRefreshCw,
  FeatherShield,
  FeatherTrash2,
  FeatherUndo2,
} from "@subframe/core";

import { Badge } from "../../ui/components/Badge";
import {
  SOFTWARE_ASSET_BILLING_CYCLES,
  SOFTWARE_ASSET_CURRENCY_CODES,
  SOFTWARE_ASSET_INPUT_CLASS_NAME,
  SOFTWARE_ASSET_PROVIDER_CODES,
  SOFTWARE_ASSET_RECORD_TYPES,
  SOFTWARE_ASSET_STATUS_CODES,
  SOFTWARE_ASSET_TEXTAREA_CLASS_NAME,
} from "./softwareAssetsContent";

function DetailRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="font-semibold text-slate-500">{label}</span>
      <span className="max-w-[62%] break-words text-right font-semibold text-slate-900">
        {value}
      </span>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="rounded-[24px] border border-slate-200/80 bg-white/85 p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{title}</p>
      <div className="mt-4 grid grid-cols-1 gap-4">{children}</div>
    </div>
  );
}

function TextField({ label, value, onChange, disabled, type = "text", required = false }) {
  return (
    <label className="space-y-2">
      <span className="block text-sm font-medium text-slate-700">{label}</span>
      <input
        type={type}
        value={value}
        onChange={onChange}
        disabled={disabled}
        required={required}
        className={SOFTWARE_ASSET_INPUT_CLASS_NAME}
      />
    </label>
  );
}

function SelectField({ label, value, onChange, options, disabled }) {
  return (
    <label className="space-y-2">
      <span className="block text-sm font-medium text-slate-700">{label}</span>
      <select value={value} onChange={onChange} disabled={disabled} className={SOFTWARE_ASSET_INPUT_CLASS_NAME}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function CheckboxField({ checked, onChange, label, disabled }) {
  return (
    <label className="flex items-center gap-3 rounded-[18px] border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm font-medium text-slate-700">
      <input
        type="checkbox"
        checked={Boolean(checked)}
        onChange={onChange}
        disabled={disabled}
        className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
      />
      {label}
    </label>
  );
}

function ActionLink({ href, label }) {
  if (!href) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
    >
      <FeatherExternalLink size={14} />
      {label}
    </a>
  );
}

function SoftwareAssetPanel(props) {
  const {
    copy,
    isAdmin,
    isCreateMode,
    selectedAsset,
    formData,
    userOptions,
    providerLabels,
    recordTypeLabels,
    billingCycleLabels,
    statusLabels,
    canEditSelectedAsset,
    canDeleteSelectedAsset,
    isSaving,
    isDeleting,
    isSyncing,
    isReclaiming,
    onSubmit,
    onDeleteClick,
    onCancelCreate,
    onSetLicenseMode,
    onToggleSharedUser,
    onSyncRecord,
    onReclaimRecord,
    setFormData,
    formatDateTime,
    formatMoney,
    getModeLabel,
    getRecordSourceLabel,
    getLifecycleLabel,
    getLifecycleVariant,
  } = props;
  const labels = copy.panel || {};

  const userFieldOptions = [{ value: "", label: copy.noValue }].concat(
    userOptions.map((user) => ({ value: String(user.id), label: user.username }))
  );
  const setValue = (key, value) => setFormData((current) => ({ ...current, [key]: value }));

  const detailContent = selectedAsset ? (
    <div className="rounded-[24px] border border-slate-200/80 bg-white/85 p-5 text-sm text-slate-600">
      <div className="grid grid-cols-1 gap-3">
        <div className="flex items-center justify-between gap-4">
          <span className="font-semibold text-slate-500">{copy.tableStatus}</span>
          <Badge variant={getLifecycleVariant(selectedAsset.lifecycle_status)}>
            {getLifecycleLabel(selectedAsset.lifecycle_status)}
          </Badge>
        </div>
        <DetailRow label={copy.tableType} value={recordTypeLabels[selectedAsset.record_type] || copy.noValue} />
        <DetailRow label={copy.filterMode} value={getModeLabel(selectedAsset.license_mode)} />
        <DetailRow label={copy.filterProvider} value={providerLabels[selectedAsset.provider_code] || copy.noValue} />
        <DetailRow label={copy.filterSource} value={getRecordSourceLabel(selectedAsset.record_source)} />
        <DetailRow label={copy.filterStatus} value={statusLabels[selectedAsset.operational_status] || copy.noValue} />
        <DetailRow label={labels.billingCycle} value={billingCycleLabels[selectedAsset.billing_cycle] || copy.noValue} />
        <DetailRow label={labels.purchasePrice} value={formatMoney(selectedAsset.purchase_price || 0, selectedAsset.currency)} />
        <DetailRow label={copy.monthlyCost} value={formatMoney(selectedAsset.monthly_cost_estimate || 0, selectedAsset.currency)} />
        <DetailRow label={copy.annualCost} value={formatMoney(selectedAsset.annual_cost_estimate || 0, selectedAsset.currency)} />
        <DetailRow label={labels.department} value={selectedAsset.department || copy.noValue} />
        <DetailRow label={labels.costCenter} value={selectedAsset.cost_center || copy.noValue} />
        <DetailRow label={labels.invoiceContract} value={[selectedAsset.invoice_number, selectedAsset.contract_reference].filter(Boolean).join(" / ") || copy.noValue} />
        <DetailRow label={labels.vendorContact} value={selectedAsset.vendor_contact || copy.noValue} />
        <DetailRow label={labels.lastSynced} value={formatDateTime(selectedAsset.last_synced_at)} />
        <DetailRow label={labels.workspaceExternal} value={[selectedAsset.external_workspace_id, selectedAsset.external_id].filter(Boolean).join(" / ") || copy.noValue} />
        <DetailRow label={labels.seats} value={selectedAsset.license_mode === "shared" ? `${selectedAsset.seats_used || 0}/${selectedAsset.seats_total || 1}` : "1/1"} />
      </div>
    </div>
  ) : null;

  if (!isCreateMode && !selectedAsset) {
    return (
      <div className="rounded-[34px] border border-white/65 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,255,255,0.9))] p-7 shadow-[0_24px_70px_rgba(148,163,184,0.16)] backdrop-blur xl:self-start">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">{copy.detailTitle}</p>
        <p className="mt-3 text-2xl font-black tracking-tight text-slate-950">{copy.detailTitle}</p>
        <p className="mt-6 text-sm leading-7 text-slate-600">{copy.noSelection}</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="rounded-[34px] border border-white/65 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,255,255,0.9))] p-7 shadow-[0_24px_70px_rgba(148,163,184,0.16)] backdrop-blur xl:self-start">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">{copy.detailTitle}</p>
        <p className="mt-3 break-words text-2xl font-black tracking-tight text-slate-950">
          {selectedAsset?.name || copy.detailTitle}
        </p>
        <div className="mt-6 space-y-5">
          <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 px-4 py-4 text-sm leading-7 text-slate-600">
            {copy.userHint}
          </div>
          <div className="flex flex-wrap gap-3">
            <ActionLink href={selectedAsset?.support_link} label={selectedAsset?.vendor_contact || labels.support} />
            <ActionLink href={selectedAsset?.documentation_link} label={labels.documentation} />
          </div>
          {detailContent}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[34px] border border-white/65 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,255,255,0.9))] p-7 shadow-[0_24px_70px_rgba(148,163,184,0.16)] backdrop-blur xl:self-start">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">{copy.detailTitle}</p>
      <p className="mt-3 break-words text-2xl font-black tracking-tight text-slate-950">
        {isCreateMode ? copy.saveCreate : selectedAsset?.name || copy.detailTitle}
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-5">
        <Section title={labels.identity}>
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: "shared", label: copy.shared },
              { value: "assigned", label: copy.assigned },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => onSetLicenseMode(option.value)}
                className={`rounded-[18px] border px-4 py-3 text-sm font-semibold transition ${
                  formData.license_mode === option.value
                    ? "border-slate-950 bg-slate-950 text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <TextField label={labels.product} value={formData.name} onChange={(event) => setValue("name", event.target.value)} disabled={!canEditSelectedAsset} required />
            <TextField label={labels.vendor} value={formData.vendor} onChange={(event) => setValue("vendor", event.target.value)} disabled={!canEditSelectedAsset} required />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <TextField label={labels.plan} value={formData.plan_name} onChange={(event) => setValue("plan_name", event.target.value)} disabled={!canEditSelectedAsset} />
            <SelectField label={labels.recordType} value={formData.record_type} onChange={(event) => setValue("record_type", event.target.value)} disabled={!canEditSelectedAsset} options={SOFTWARE_ASSET_RECORD_TYPES.map((value) => ({ value, label: recordTypeLabels[value] }))} />
            <SelectField label={labels.status} value={formData.operational_status} onChange={(event) => setValue("operational_status", event.target.value)} disabled={!canEditSelectedAsset} options={SOFTWARE_ASSET_STATUS_CODES.map((value) => ({ value, label: statusLabels[value] }))} />
          </div>
        </Section>

        <Section title={labels.assignmentBilling}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <TextField label={labels.department} value={formData.department} onChange={(event) => setValue("department", event.target.value)} disabled={!canEditSelectedAsset} />
            <TextField label={labels.costCenter} value={formData.cost_center} onChange={(event) => setValue("cost_center", event.target.value)} disabled={!canEditSelectedAsset} />
          </div>
          {formData.license_mode === "assigned" ? (
            <SelectField label={labels.assignedUser} value={String(formData.assigned_user_id || "")} onChange={(event) => setValue("assigned_user_id", event.target.value)} disabled={!canEditSelectedAsset} options={userFieldOptions} />
          ) : (
            <>
              <TextField label={labels.totalSeats} type="number" value={formData.seats_total} onChange={(event) => setValue("seats_total", event.target.value)} disabled={!canEditSelectedAsset} />
              <div className="space-y-2">
                <span className="block text-sm font-medium text-slate-700">{labels.assignedUsers}</span>
                <div className="rounded-[18px] border border-slate-200 bg-white p-3">
                  <div className="flex flex-wrap gap-2">
                    {userOptions.map((user) => {
                      const active = (formData.shared_user_ids || []).includes(String(user.id));
                      return (
                        <button
                          key={`shared-user-${user.id}`}
                          type="button"
                          onClick={() => onToggleSharedUser(user.id)}
                          disabled={!canEditSelectedAsset}
                          className={`rounded-full px-3 py-2 text-sm font-semibold transition ${
                            active
                              ? "bg-slate-950 text-white"
                              : "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          {user.username}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </>
          )}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <SelectField label={labels.provider} value={formData.provider_code} onChange={(event) => setValue("provider_code", event.target.value)} disabled={!canEditSelectedAsset} options={SOFTWARE_ASSET_PROVIDER_CODES.map((value) => ({ value, label: providerLabels[value] }))} />
            <SelectField label={labels.billingCycle} value={formData.billing_cycle} onChange={(event) => setValue("billing_cycle", event.target.value)} disabled={!canEditSelectedAsset} options={SOFTWARE_ASSET_BILLING_CYCLES.map((value) => ({ value, label: billingCycleLabels[value] }))} />
            <SelectField label={labels.currency} value={formData.currency} onChange={(event) => setValue("currency", event.target.value)} disabled={!canEditSelectedAsset} options={SOFTWARE_ASSET_CURRENCY_CODES.map((value) => ({ value, label: value }))} />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="block text-sm font-medium text-slate-700">{labels.purchasePrice}</span>
              <input
                type="number"
                value={formData.purchase_price}
                onChange={(event) => setValue("purchase_price", event.target.value)}
                disabled={!canEditSelectedAsset}
                className={SOFTWARE_ASSET_INPUT_CLASS_NAME}
              />
              <span className="text-xs leading-6 text-slate-500">{copy.purchasePriceHint}</span>
            </label>
            <TextField label={labels.recordSource} value={formData.record_source} onChange={(event) => setValue("record_source", event.target.value)} disabled={!canEditSelectedAsset} />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <TextField label={labels.purchaseDate} type="date" value={formData.purchase_date} onChange={(event) => setValue("purchase_date", event.target.value)} disabled={!canEditSelectedAsset} />
            <TextField label={labels.renewalDate} type="date" value={formData.renewal_date} onChange={(event) => setValue("renewal_date", event.target.value)} disabled={!canEditSelectedAsset} />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <SelectField label={labels.approvedBy} value={String(formData.approved_by || "")} onChange={(event) => setValue("approved_by", event.target.value)} disabled={!canEditSelectedAsset} options={userFieldOptions} />
            <SelectField label={labels.purchasedBy} value={String(formData.purchased_by || "")} onChange={(event) => setValue("purchased_by", event.target.value)} disabled={!canEditSelectedAsset} options={userFieldOptions} />
            <SelectField label={labels.renewalOwner} value={String(formData.renewal_owner || "")} onChange={(event) => setValue("renewal_owner", event.target.value)} disabled={!canEditSelectedAsset} options={userFieldOptions} />
          </div>
          <CheckboxField checked={formData.auto_renew} onChange={(event) => setValue("auto_renew", event.target.checked)} disabled={!canEditSelectedAsset} label={labels.autoRenew} />
        </Section>

        <Section title={labels.providerOps}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <TextField label={labels.accountEmail} type="email" value={formData.account_email} onChange={(event) => setValue("account_email", event.target.value)} disabled={!canEditSelectedAsset} />
            <TextField label={labels.billingEmail} type="email" value={formData.billing_email} onChange={(event) => setValue("billing_email", event.target.value)} disabled={!canEditSelectedAsset} />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <TextField label={labels.vendorContact} value={formData.vendor_contact} onChange={(event) => setValue("vendor_contact", event.target.value)} disabled={!canEditSelectedAsset} />
            <TextField label={labels.supportLink} type="url" value={formData.support_link} onChange={(event) => setValue("support_link", event.target.value)} disabled={!canEditSelectedAsset} />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <TextField label={labels.documentationLink} type="url" value={formData.documentation_link} onChange={(event) => setValue("documentation_link", event.target.value)} disabled={!canEditSelectedAsset} />
            <TextField label={labels.externalId} value={formData.external_id} onChange={(event) => setValue("external_id", event.target.value)} disabled={!canEditSelectedAsset} />
          </div>
          <TextField label={labels.externalWorkspace} value={formData.external_workspace_id} onChange={(event) => setValue("external_workspace_id", event.target.value)} disabled={!canEditSelectedAsset} />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <CheckboxField checked={formData.is_scim_managed} onChange={(event) => setValue("is_scim_managed", event.target.checked)} disabled={!canEditSelectedAsset} label={labels.scimManaged} />
            <CheckboxField checked={formData.is_sso_managed} onChange={(event) => setValue("is_sso_managed", event.target.checked)} disabled={!canEditSelectedAsset} label={labels.ssoManaged} />
          </div>
        </Section>

        <Section title={labels.notesMetadata}>
          <TextField label={labels.invoiceNumber} value={formData.invoice_number} onChange={(event) => setValue("invoice_number", event.target.value)} disabled={!canEditSelectedAsset} />
          <TextField label={labels.contractReference} value={formData.contract_reference} onChange={(event) => setValue("contract_reference", event.target.value)} disabled={!canEditSelectedAsset} />
          <textarea value={formData.notes} onChange={(event) => setValue("notes", event.target.value)} disabled={!canEditSelectedAsset} className={SOFTWARE_ASSET_TEXTAREA_CLASS_NAME} placeholder={labels.notes} />
          <label className="space-y-2">
            <span className="block text-sm font-medium text-slate-700">{copy.metadataLabel}</span>
            <textarea value={formData.extra_metadata_text} onChange={(event) => setValue("extra_metadata_text", event.target.value)} disabled={!canEditSelectedAsset} className={SOFTWARE_ASSET_TEXTAREA_CLASS_NAME} />
            <span className="text-xs leading-6 text-slate-500">{copy.metadataHint}</span>
          </label>
        </Section>

        {detailContent}

        <div className="flex flex-wrap gap-3">
          <button type="submit" disabled={isSaving} className="inline-flex items-center justify-center gap-2 rounded-[18px] bg-slate-950 px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60">
            <FeatherShield size={16} />
            {selectedAsset && !isCreateMode ? copy.saveUpdate : copy.saveCreate}
          </button>
          {isCreateMode ? (
            <button type="button" onClick={onCancelCreate} className="inline-flex items-center justify-center rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
              {copy.cancelCreate}
            </button>
          ) : null}
          {!isCreateMode && selectedAsset ? (
            <button type="button" onClick={onSyncRecord} disabled={isSyncing} className="inline-flex items-center justify-center gap-2 rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60">
              <FeatherRefreshCw size={16} />
              {copy.syncNow}
            </button>
          ) : null}
          {!isCreateMode && selectedAsset ? (
            <button type="button" onClick={onReclaimRecord} disabled={isReclaiming} className="inline-flex items-center justify-center gap-2 rounded-[18px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60">
              <FeatherUndo2 size={16} />
              {copy.reclaimAll}
            </button>
          ) : null}
          {!isCreateMode && canDeleteSelectedAsset ? (
            <button type="button" onClick={onDeleteClick} disabled={isDeleting} className="inline-flex items-center justify-center gap-2 rounded-[18px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60">
              <FeatherTrash2 size={16} />
              {copy.delete}
            </button>
          ) : null}
        </div>
      </form>
    </div>
  );
}

export default SoftwareAssetPanel;
