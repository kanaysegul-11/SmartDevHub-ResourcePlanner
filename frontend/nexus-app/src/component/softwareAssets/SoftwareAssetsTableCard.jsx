import React from "react";
import { FeatherCheckSquare, FeatherLayers } from "@subframe/core";

import { Badge } from "../../ui/components/Badge";

function SoftwareAssetsTableCard({
  title,
  count,
  records,
  emptyMessage,
  copy,
  isAdmin,
  isCreateMode,
  selectedAssetId,
  onSelectAsset,
  formatDate,
  formatMoney,
  providerLabels,
  recordTypeLabels,
  billingCycleLabels,
  getModeLabel,
  getLifecycleLabel,
  getLifecycleVariant,
  selectedRowIds = [],
  onToggleRowSelection,
  onToggleAllRows,
}) {
  const selectableCount = records.length;
  const allSelected = selectableCount > 0 && records.every((record) => selectedRowIds.includes(String(record.id)));

  return (
    <div className="rounded-[32px] border border-white/65 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(255,255,255,0.82))] p-6 shadow-[0_24px_70px_rgba(148,163,184,0.12)] backdrop-blur lg:p-7">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h2 className="font-['Newsreader'] text-3xl font-medium tracking-tight text-slate-950">
            {title}
          </h2>
          <Badge variant="neutral" icon={<FeatherLayers />}>
            {count}
          </Badge>
        </div>

        {isAdmin && selectableCount ? (
          <button
            type="button"
            onClick={onToggleAllRows}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 transition hover:bg-slate-50"
          >
            <FeatherCheckSquare size={14} />
            {allSelected ? copy.clearSelection : copy.selectAll}
          </button>
        ) : null}
      </div>

      {!records.length ? (
        <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50/80 px-5 py-10 text-center text-sm text-slate-500">
          {emptyMessage}
        </div>
      ) : (
        <div className="overflow-hidden rounded-[24px] border border-slate-200/80 bg-white/85">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50/80">
                <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  {isAdmin ? <th className="px-4 py-3" /> : null}
                  <th className="px-4 py-3">{copy.tableProduct}</th>
                  <th className="px-4 py-3">{copy.tableType}</th>
                  <th className="px-4 py-3">{copy.tableOwner}</th>
                  <th className="px-4 py-3">{copy.tableProvider}</th>
                  <th className="px-4 py-3">{copy.tableBilling}</th>
                  <th className="px-4 py-3">{copy.tableRenewal}</th>
                  <th className="px-4 py-3">{copy.tableSeats}</th>
                  <th className="px-4 py-3">{copy.tableStatus}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.map((asset) => {
                  const isSelected = !isCreateMode && String(selectedAssetId) === String(asset.id);
                  const primaryAssignment = asset.primary_assignment || asset.assignments?.[0];
                  const activeAssignments = asset.assignments || [];
                  const coverageValue =
                    asset.license_mode === "shared"
                      ? activeAssignments.length
                        ? `${activeAssignments
                            .slice(0, 2)
                            .map((assignment) => assignment.user_details?.username || assignment.effective_email)
                            .filter(Boolean)
                            .join(", ")}${activeAssignments.length > 2 ? ` +${activeAssignments.length - 2}` : ""}`
                        : copy.noValue
                      : primaryAssignment?.user_details?.username ||
                        primaryAssignment?.effective_email ||
                        asset.account_email ||
                        copy.noValue;
                  const rowSelected = selectedRowIds.includes(String(asset.id));

                  return (
                    <tr
                      key={asset.id}
                      className={`cursor-pointer transition ${isSelected ? "bg-sky-50/70" : "hover:bg-slate-50/80"}`}
                      onClick={() => onSelectAsset(asset.id)}
                    >
                      {isAdmin ? (
                        <td className="px-4 py-4 align-top">
                          <input
                            type="checkbox"
                            checked={rowSelected}
                            onChange={(event) => onToggleRowSelection(asset.id, event.target.checked)}
                            onClick={(event) => event.stopPropagation()}
                            className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                          />
                        </td>
                      ) : null}
                      <td className="px-4 py-4 align-top">
                        <div className="flex flex-col gap-1">
                          <span className="font-bold text-slate-900">{asset.name}</span>
                          <span className="text-xs text-slate-500">
                            {[asset.plan_name, getModeLabel(asset.license_mode)].filter(Boolean).join(" / ")}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 align-top text-slate-600">
                        {recordTypeLabels[asset.record_type] || asset.record_type || copy.noValue}
                      </td>
                      <td className="px-4 py-4 align-top text-slate-600">{coverageValue}</td>
                      <td className="px-4 py-4 align-top text-slate-600">
                        <div className="flex flex-col gap-1">
                          <span>{asset.vendor || providerLabels[asset.provider_code] || copy.noValue}</span>
                          <span className="text-xs text-slate-400">{providerLabels[asset.provider_code] || copy.noValue}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 align-top text-slate-600">
                        <div className="flex flex-col gap-1">
                          <span>{formatMoney(asset.monthly_cost_estimate || 0, asset.currency)}</span>
                          <span className="text-xs text-slate-400">
                            {billingCycleLabels[asset.billing_cycle] || asset.billing_cycle || copy.noValue}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 align-top text-slate-600">{formatDate(asset.renewal_date)}</td>
                      <td className="px-4 py-4 align-top text-slate-600">
                        {asset.license_mode === "shared"
                          ? `${asset.seats_used || 0}/${asset.seats_total || 1}`
                          : "1/1"}
                      </td>
                      <td className="px-4 py-4 align-top">
                        <Badge variant={getLifecycleVariant(asset.lifecycle_status)}>
                          {getLifecycleLabel(asset.lifecycle_status)}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default SoftwareAssetsTableCard;
