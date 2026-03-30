export const NOTIFICATIONS_UPDATED_EVENT = "notifications-updated";

export function emitNotificationsUpdated(unreadCount) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(NOTIFICATIONS_UPDATED_EVENT, {
      detail: { unreadCount },
    })
  );
}
