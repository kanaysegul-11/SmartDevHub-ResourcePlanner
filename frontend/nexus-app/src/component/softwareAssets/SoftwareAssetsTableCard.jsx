import React from "react";
import { FeatherCheckSquare, FeatherLayers, FeatherSparkles } from "@subframe/core";

import { Badge } from "../../ui/components/Badge";

function MetaPill({ children, tone = "neutral" }) {
  const toneClasses =
    tone === "dark"
      ? "border-slate-800/80 bg-slate-950 text-slate-100"
      : "border-slate-200 bg-slate-50 text-slate-600";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-[0.08em] ${toneClasses}`}
    >
      {children}
    </span>
  );
}

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
  const allSelected =
    selectableCount > 0 &&
    records.every((record) => selectedRowIds.includes(String(record.id)));

  return (
    <div className="relative overflow-hidden rounded-[34px] border border-white/70 bg-[radial-gradient(circle_at_top_left,rgba(191,219,254,0.24),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.96),rgba(255,255,255,0.84))] p-6 shadow-[0_26px_80px_rgba(148,163,184,0.14)] backdrop-blur lg:p-7">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[linear-gradient(90deg,rgba(15,23,42,0.04),transparent)]" />

      <div className="relative">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <h2 className="font-['Newsreader'] text-3xl font-medium tracking-tight text-slate-950">
                {title}
              </h2>
              <Badge variant="neutral" icon={<FeatherLayers />}>
                {count}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              <MetaPill>{copy.totalRecords}: {count}</MetaPill>
              {isAdmin && selectedRowIds.length ? (
                <MetaPill tone="dark">
                  {selectedRowIds.length} {copy.selectedRows}
                </MetaPill>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
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
        </div>

        {!records.length ? (
          <div className="rounded-[26px] border border-dashed border-slate-200 bg-[linear-gradient(180deg,rgba(248,250,252,0.96),rgba(241,245,249,0.82))] px-5 py-12 text-center text-sm text-slate-500">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-slate-950/[0.04] text-slate-500">
              <FeatherSparkles size={22} />
            </div>
            <p className="mt-4 text-base font-semibold text-slate-700">{emptyMessage}</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/92 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-[linear-gradient(180deg,rgba(248,250,252,0.98),rgba(241,245,249,0.92))]">
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
                    const isSelected =
                      !isCreateMode &&
                      String(selectedAssetId) === String(asset.id);
                    const primaryAssignment =
                      asset.primary_assignment || asset.assignments?.[0];
                    const activeAssignments = asset.assignments || [];
                    const billingLabel =
                      billingCycleLabels[asset.billing_cycle] ||
                      asset.billing_cycle ||
                      copy.noValue;
                    const coverageValue =
                      asset.license_mode === "shared"
                        ? activeAssignments.length
                          ? `${activeAssignments
                              .slice(0, 2)
                              .map(
                                (assignment) =>
                                  assignment.user_details?.username ||
                                  assignment.effective_email
                              )
                              .filter(Boolean)
                              .join(", ")}${
                              activeAssignments.length > 2
                                ? ` +${activeAssignments.length - 2}`
                                : ""
                            }`
                          : copy.noValue
                        : primaryAssignment?.user_details?.username ||
                          primaryAssignment?.effective_email ||
                          asset.account_email ||
                          copy.noValue;
                    const rowSelected = selectedRowIds.includes(String(asset.id));

                    return (
                      <tr
                        key={asset.id}
                        className={`cursor-pointer align-top transition ${
                          isSelected
                            ? "bg-sky-50/85 shadow-[inset_4px_0_0_rgba(14,165,233,0.85)]"
                            : "hover:bg-slate-50/90"
                        }`}
                        onClick={() => onSelectAsset(asset.id)}
                      >
                        {isAdmin ? (
                          <td className="px-4 py-4 align-top">
                            <input
                              type="checkbox"
                              checked={rowSelected}
                              onChange={(event) =>
                                onToggleRowSelection(
                                  asset.id,
                                  event.target.checked
                                )
                              }
                              onClick={(event) => event.stopPropagation()}
                              className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                            />
                          </td>
                        ) : null}
                        <td className="px-4 py-4 align-top">
                          <div className="space-y-2">
                            <span className="block font-bold text-slate-900">
                              {asset.name}
                            </span>
                            <div className="flex flex-wrap gap-2">
                              {asset.plan_name ? (
                                <MetaPill>{asset.plan_name}</MetaPill>
                              ) : null}
                              <MetaPill>{getModeLabel(asset.license_mode)}</MetaPill>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 align-top text-slate-600">
                          {recordTypeLabels[asset.record_type] ||
                            asset.record_type ||
                            copy.noValue}
                        </td>
                        <td className="px-4 py-4 align-top text-slate-600">
                          <div className="max-w-[15rem] leading-6">
                            {coverageValue}
                          </div>
                        </td>
                        <td className="px-4 py-4 align-top text-slate-600">
                          <div className="flex flex-col gap-2">
                            <span>
                              {asset.vendor ||
                                providerLabels[asset.provider_code] ||
                                copy.noValue}
                            </span>
                            <MetaPill>
                              {providerLabels[asset.provider_code] || copy.noValue}
                            </MetaPill>
                          </div>
                        </td>
                        <td className="px-4 py-4 align-top text-slate-600">
                          {isAdmin ? (
                            <div className="rounded-[18px] border border-slate-200 bg-slate-50/80 px-3 py-2">
                              <div className="font-semibold text-slate-900">
                                {formatMoney(
                                  asset.monthly_cost_estimate || 0,
                                  asset.currency
                                )}
                              </div>
                              <div className="mt-1 text-xs text-slate-400">
                                {billingLabel}
                              </div>
                            </div>
                          ) : (
                            billingLabel
                          )}
                        </td>
                        <td className="px-4 py-4 align-top text-slate-600">
                          {formatDate(asset.renewal_date)}
                        </td>
                        <td className="px-4 py-4 align-top text-slate-600">
                          <span className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-700">
                            {asset.license_mode === "shared"
                              ? `${asset.seats_used || 0}/${asset.seats_total || 1}`
                              : "1/1"}
                          </span>
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
    </div>
  );
}

export default SoftwareAssetsTableCard;
