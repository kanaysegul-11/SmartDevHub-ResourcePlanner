"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FeatherBell, FeatherTrash2 } from "@subframe/core";
import { useNavigate } from "react-router-dom";
import { useI18n } from "../../I18nContext.jsx";
import ConfirmDialog from "../common/ConfirmDialog.jsx";
import { apiClient } from "../../refine/axios";
import { emitNotificationsUpdated } from "../../refine/notifications.js";

function formatDate(value, language) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(language || "en", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function NotificationsPanel() {
  const { language, t } = useI18n();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingIds, setDeletingIds] = useState([]);
  const [clearingAll, setClearingAll] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [confirmState, setConfirmState] = useState(null);

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.is_read).length,
    [notifications]
  );

  const updateNotificationsState = (nextNotifications) => {
    setNotifications(nextNotifications);
    emitNotificationsUpdated(
      nextNotifications.filter((item) => !item.is_read).length
    );
  };

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");
    try {
      const response = await apiClient.get("/notifications/");
      updateNotificationsState(response.data || []);
    } catch {
      setErrorMessage(t("notifications.loadError"));
      updateNotificationsState([]);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  const markAsRead = async (notificationId) => {
    try {
      await apiClient.patch(`/notifications/${notificationId}/`, { is_read: true });
      setNotifications((current) => {
        const nextNotifications = current.map((item) =>
          item.id === notificationId ? { ...item, is_read: true } : item
        );
        emitNotificationsUpdated(
          nextNotifications.filter((item) => !item.is_read).length
        );
        return nextNotifications;
      });
    } catch (error) {
      console.error("Notification update error:", error);
    }
  };

  const markAllAsRead = async () => {
    const unreadItems = notifications.filter((item) => !item.is_read);

    try {
      await Promise.all(
        unreadItems.map((item) =>
          apiClient.patch(`/notifications/${item.id}/`, { is_read: true })
        )
      );
      setNotifications((current) => {
        const nextNotifications = current.map((item) => ({
          ...item,
          is_read: true,
        }));
        emitNotificationsUpdated(0);
        return nextNotifications;
      });
    } catch (error) {
      console.error("Notification bulk update error:", error);
    }
  };

  const deleteNotification = async (notificationId) => {
    setDeletingIds((current) => [...current, notificationId]);

    try {
      await apiClient.delete(`/notifications/${notificationId}/`);
      setNotifications((current) => {
        const nextNotifications = current.filter((item) => item.id !== notificationId);
        emitNotificationsUpdated(
          nextNotifications.filter((item) => !item.is_read).length
        );
        return nextNotifications;
      });
    } catch (error) {
      console.error("Notification delete error:", error);
    } finally {
      setDeletingIds((current) => current.filter((id) => id !== notificationId));
      setConfirmState(null);
    }
  };

  const deleteAllNotifications = async () => {
    if (!notifications.length) return;

    setClearingAll(true);
    try {
      await apiClient.delete("/notifications/clear-all/");
      updateNotificationsState([]);
    } catch (error) {
      console.error("Notification clear-all error:", error);
    } finally {
      setClearingAll(false);
      setConfirmState(null);
    }
  };

  const handleOpenNotification = async (item) => {
    if (!item) return;

    if (!item.is_read) {
      await markAsRead(item.id);
    }

    if (item.type === "message") {
      if (item.link) {
        navigate(item.link);
        return;
      }

      if (item.actor_details?.id) {
        navigate(
          item.actor_details.is_admin
            ? `/administrators?chatUser=${item.actor_details.id}`
            : `/team?chatUser=${item.actor_details.id}`
        );
      }
      return;
    }

    if (item.link) {
      navigate(item.link);
    }
  };

  return (
    <div className="animate-in fade-in flex h-full flex-col">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h3 className="text-xl font-black text-slate-800">
            {t("notifications.title")}
          </h3>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-sky-700">
            {unreadCount} {t("notifications.unreadCount")}
          </span>
          <button
            type="button"
            onClick={markAllAsRead}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            disabled={!unreadCount}
          >
            {t("notifications.markAllAsRead")}
          </button>
          <button
            type="button"
            onClick={() =>
              setConfirmState({
                mode: "delete-all",
                title: t("notifications.deleteAllTitle"),
                description: t("notifications.deleteAllConfirm"),
                confirmLabel: t("notifications.deleteAll"),
              })
            }
            className="inline-flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100"
            disabled={!notifications.length || clearingAll}
          >
            <FeatherTrash2 size={16} />
            {t("notifications.deleteAll")}
          </button>
        </div>
      </div>

      {errorMessage && !loading ? (
        <div className="mt-6 rounded-[24px] border border-red-200 bg-red-50/80 px-5 py-4 text-sm text-red-700">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p>{errorMessage}</p>
            <button
              type="button"
              onClick={() => void loadNotifications()}
              className="rounded-full border border-red-200 bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-red-700 transition hover:bg-red-100"
            >
              {t("app.retry")}
            </button>
          </div>
        </div>
      ) : null}

      {loading ? (
        <div className="flex flex-1 items-center justify-center py-20 text-sm text-slate-500">
          {t("notifications.loading")}
        </div>
      ) : notifications.length ? (
        <div className="mt-6 flex flex-col gap-4">
          {notifications.map((item) => (
            <div
              key={item.id}
              className={`rounded-[28px] border p-5 transition ${
                item.is_read
                  ? "border-slate-200 bg-slate-50/70"
                  : "border-sky-200 bg-sky-50/60 shadow-[0_12px_28px_rgba(125,211,252,0.12)]"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-4">
                  <div className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] bg-white text-sky-600">
                    <FeatherBell size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="break-words text-base font-black text-slate-900">
                      {item.title}
                    </p>
                    <p className="mt-2 break-words text-sm leading-7 text-slate-600">
                      {item.body}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                      <span>{item.type}</span>
                      <span>{formatDate(item.created_at, language)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {!item.is_read ? (
                    <button
                      type="button"
                      onClick={() => markAsRead(item.id)}
                      className="rounded-full border border-sky-200 bg-white px-3 py-2 text-xs font-bold text-sky-700 transition hover:bg-sky-50"
                      disabled={deletingIds.includes(item.id)}
                    >
                      {t("notifications.markAsRead")}
                    </button>
                  ) : null}
                  {item.link || item.type === "message" ? (
                    <button
                      type="button"
                      onClick={() => handleOpenNotification(item)}
                      className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
                      disabled={deletingIds.includes(item.id)}
                    >
                      {!item.is_read && item.type === "message"
                        ? t("notifications.openConversation")
                        : t("notifications.open")}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() =>
                      setConfirmState({
                        mode: "delete-one",
                        notificationId: item.id,
                        title: t("notifications.deleteTitle"),
                        description: t("notifications.deleteConfirm"),
                        confirmLabel: t("notifications.delete"),
                      })
                    }
                    className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-white px-3 py-2 text-xs font-bold text-red-700 transition hover:bg-red-50"
                    disabled={deletingIds.includes(item.id)}
                  >
                    <FeatherTrash2 size={14} />
                    {t("notifications.delete")}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-300">
            <FeatherBell size={32} />
          </div>
          <h3 className="text-lg font-bold text-slate-800">
            {t("notifications.empty")}
          </h3>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(confirmState)}
        title={confirmState?.title}
        description={confirmState?.description}
        confirmLabel={confirmState?.confirmLabel || t("notifications.delete")}
        onClose={() => setConfirmState(null)}
        onConfirm={() => {
          if (confirmState?.mode === "delete-all") {
            void deleteAllNotifications();
            return;
          }

          if (confirmState?.notificationId) {
            void deleteNotification(confirmState.notificationId);
          }
        }}
        isProcessing={clearingAll || Boolean(confirmState?.notificationId && deletingIds.includes(confirmState.notificationId))}
      />
    </div>
  );
}

export default NotificationsPanel;
