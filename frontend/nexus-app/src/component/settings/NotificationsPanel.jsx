"use client";
import React, { useEffect, useMemo, useState } from "react";
import { FeatherBell } from "@subframe/core";
import { useNavigate } from "react-router-dom";
import { useI18n } from "../../I18nContext.jsx";
import { apiClient } from "../../refine/axios";

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
  const { language } = useI18n();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.is_read).length,
    [notifications]
  );

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get("/notifications/");
      setNotifications(response.data || []);
    } catch (error) {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const markAsRead = async (notificationId) => {
    try {
      await apiClient.patch(`/notifications/${notificationId}/`, { is_read: true });
      setNotifications((current) =>
        current.map((item) =>
          item.id === notificationId ? { ...item, is_read: true } : item
        )
      );
    } catch (error) {
      console.error("Notification update error:", error);
    }
  };

  const markAllAsRead = async () => {
    const unreadItems = notifications.filter((item) => !item.is_read);
    await Promise.all(
      unreadItems.map((item) =>
        apiClient.patch(`/notifications/${item.id}/`, { is_read: true })
      )
    );
    setNotifications((current) =>
      current.map((item) => ({ ...item, is_read: true }))
    );
  };

  const handleOpenNotification = async (item) => {
    if (!item) return;

    if (!item.is_read) {
      await markAsRead(item.id);
    }

    if (item.type === "message" && item.actor_details?.id) {
      navigate(
        item.actor_details.is_admin
          ? `/administrators?chatUser=${item.actor_details.id}`
          : `/team?chatUser=${item.actor_details.id}`
      );
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
          <h3 className="text-xl font-black text-slate-800">Bildirimler</h3>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-sky-700">
            {unreadCount} okunmamış
          </span>
          <button
            type="button"
            onClick={markAllAsRead}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            disabled={!unreadCount}
          >
            Tümünü okundu yap
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center py-20 text-sm text-slate-500">
          Bildirimler yükleniyor...
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
                {!item.is_read ? (
                  <div className="flex flex-col items-end gap-2">
                    <button
                      type="button"
                      onClick={() => markAsRead(item.id)}
                      className="rounded-full border border-sky-200 bg-white px-3 py-2 text-xs font-bold text-sky-700 transition hover:bg-sky-50"
                    >
                      Okundu
                    </button>
                    {item.link || item.type === "message" ? (
                      <button
                        type="button"
                        onClick={() => handleOpenNotification(item)}
                        className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
                      >
                        Konuşmayı aç
                      </button>
                    ) : null}
                  </div>
                ) : item.link || item.type === "message" ? (
                  <button
                    type="button"
                    onClick={() => handleOpenNotification(item)}
                    className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
                  >
                    Aç
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-300">
            <FeatherBell size={32} />
          </div>
          <h3 className="text-lg font-bold text-slate-800">Bildirim yok</h3>
        </div>
      )}
    </div>
  );
}

export default NotificationsPanel;
