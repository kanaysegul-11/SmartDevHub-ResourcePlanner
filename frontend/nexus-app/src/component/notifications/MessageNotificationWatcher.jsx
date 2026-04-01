"use client";

import React, { useCallback, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { useI18n } from "../../I18nContext.jsx";
import { useUser } from "../../UserContext.jsx";
import { emitNotificationsUpdated } from "../../refine/notifications.js";
import {
  SESSION_MARKER_KEY,
  SESSION_UPDATED_EVENT,
} from "../../refine/session";
import { apiClient } from "../../refine/axios";
import { getSessionValue } from "../../refine/sessionStorage";

const MESSAGE_NOTIFICATION_POLL_MS = 5000;
const TOASTABLE_NOTIFICATION_TYPES = new Set(["message", "comment"]);

const interpolate = (template, values) =>
  String(template || "").replace(/\{\{(\w+)\}\}/g, (_, key) =>
    values?.[key] == null ? "" : String(values[key])
  );

const readSeenNotificationIds = (storageKey) => {
  if (typeof window === "undefined" || !storageKey) {
    return new Set();
  }

  try {
    const raw = window.sessionStorage.getItem(storageKey);
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed.map((id) => String(id)) : []);
  } catch {
    return new Set();
  }
};

const writeSeenNotificationIds = (storageKey, ids) => {
  if (typeof window === "undefined" || !storageKey) {
    return;
  }

  window.sessionStorage.setItem(storageKey, JSON.stringify(Array.from(ids)));
};

function MessageNotificationWatcher() {
  const { t } = useI18n();
  const { userData } = useUser();
  const token = getSessionValue("token");
  const sessionMarker =
    getSessionValue(SESSION_MARKER_KEY) ||
    getSessionValue("user_id") ||
    userData?.username ||
    "anonymous";
  const userNotificationKey =
    getSessionValue("user_id") || userData?.id || userData?.username || "anonymous";

  const seenStorageKey = useMemo(
    () =>
      `nexus:seen-message-notifications:${sessionMarker}:${String(
        userNotificationKey
      )}`,
    [sessionMarker, userNotificationKey]
  );

  const getSenderName = useCallback(
    (item) => {
      const actor = item?.actor_details || {};
      const fullName = `${actor.first_name || ""} ${actor.last_name || ""}`.trim();
      return fullName || actor.username || t("notifications.messageSenderFallback");
    },
    [t]
  );

  const getToastPayload = useCallback(
    (item) => {
      const senderName = getSenderName(item);

      if (item?.type === "comment") {
        return {
          title: t("notifications.commentToastTitle"),
          description: interpolate(t("notifications.commentToastBody"), {
            sender: senderName,
          }),
        };
      }

      return {
        title: t("notifications.messageToastTitle"),
        description: interpolate(t("notifications.messageToastBody"), {
          sender: senderName,
        }),
      };
    },
    [getSenderName, t]
  );

  const loadUnreadMessageNotifications = useCallback(async () => {
    if (!getSessionValue("token")) {
      return;
    }

    try {
      const response = await apiClient.get("/notifications/", {
        params: { is_read: false },
      });
      const unreadNotifications = Array.isArray(response.data) ? response.data : [];
      emitNotificationsUpdated(unreadNotifications.length);

      const unreadMessageNotifications = unreadNotifications
        .filter((item) => TOASTABLE_NOTIFICATION_TYPES.has(item.type))
        .sort(
          (left, right) =>
            new Date(left.created_at || 0).getTime() -
            new Date(right.created_at || 0).getTime()
        );

      const seenIds = readSeenNotificationIds(seenStorageKey);
      const unseenNotifications = unreadMessageNotifications.filter(
        (item) => !seenIds.has(String(item.id))
      );

      if (!unseenNotifications.length) {
        return;
      }

      unseenNotifications.forEach((item) => {
        const toastPayload = getToastPayload(item);
        toast(toastPayload.title, {
          id: `notification-${sessionMarker}-${item.type}-${item.id}`,
          description: toastPayload.description,
          duration: 3500,
        });
        seenIds.add(String(item.id));
      });

      writeSeenNotificationIds(seenStorageKey, seenIds);
    } catch (error) {
      console.error("Message notifications could not be loaded:", error);
    }
  }, [getToastPayload, seenStorageKey, sessionMarker]);

  useEffect(() => {
    if (!token) {
      return undefined;
    }

    void loadUnreadMessageNotifications();

    const intervalId = window.setInterval(() => {
      void loadUnreadMessageNotifications();
    }, MESSAGE_NOTIFICATION_POLL_MS);

    const handleFocus = () => {
      void loadUnreadMessageNotifications();
    };

    const handleSessionUpdated = () => {
      void loadUnreadMessageNotifications();
    };

    window.addEventListener("focus", handleFocus);
    window.addEventListener(SESSION_UPDATED_EVENT, handleSessionUpdated);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener(SESSION_UPDATED_EVENT, handleSessionUpdated);
    };
  }, [loadUnreadMessageNotifications, token]);

  return null;
}

export default MessageNotificationWatcher;
