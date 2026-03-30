import React from "react";
import { FeatherAlertTriangle } from "@subframe/core";
import { useI18n } from "../../I18nContext.jsx";

function ConfirmDialog({
  open = false,
  title = "",
  description = "",
  confirmLabel,
  cancelLabel,
  onConfirm,
  onClose,
  isProcessing = false,
  tone = "danger",
}) {
  const { t } = useI18n();

  if (!open) return null;

  const confirmButtonClass =
    tone === "danger"
      ? "bg-red-600 text-white hover:bg-red-500"
      : "bg-slate-950 text-white hover:bg-slate-800";

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[30px] border border-white/30 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,255,255,0.9))] p-6 shadow-[0_28px_80px_rgba(15,23,42,0.28)] sm:p-7">
        <div className="flex items-start gap-4">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] ${
              tone === "danger"
                ? "bg-red-100 text-red-600"
                : "bg-sky-100 text-sky-700"
            }`}
          >
            <FeatherAlertTriangle size={20} />
          </div>
          <div className="min-w-0">
            <h3 className="text-xl font-black tracking-tight text-slate-950">
              {title}
            </h3>
            {description ? (
              <p className="mt-3 text-sm leading-7 text-slate-600">{description}</p>
            ) : null}
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {cancelLabel || t("app.cancel")}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isProcessing}
            className={`rounded-2xl px-4 py-3 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${confirmButtonClass}`}
          >
            {confirmLabel || t("app.confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;
