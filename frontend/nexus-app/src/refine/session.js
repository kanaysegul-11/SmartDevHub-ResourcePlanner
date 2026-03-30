import { apiClient } from "./axios";

export const SESSION_UPDATED_EVENT = "nexus:session-updated";
export const SESSION_MARKER_KEY = "nexus:session-marker";

export function notifySessionUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(SESSION_UPDATED_EVENT));
  }
}

export function applySessionPayload(payload = {}) {
  const token = payload?.token;

  if (!token) {
    return false;
  }

  localStorage.setItem("token", token);
  apiClient.defaults.headers.common.Authorization = `Token ${token}`;

  if (payload?.username) {
    localStorage.setItem("username", payload.username);
  }

  if (payload?.user_id) {
    localStorage.setItem("user_id", String(payload.user_id));
  }

  if (payload?.language) {
    localStorage.setItem("language", payload.language);
  }

  localStorage.setItem("is_admin", payload?.is_admin ? "true" : "false");
  localStorage.setItem(SESSION_MARKER_KEY, String(Date.now()));
  notifySessionUpdated();

  return true;
}

export function clearSessionPayload() {
  localStorage.removeItem("token");
  localStorage.removeItem("username");
  localStorage.removeItem("user_id");
  localStorage.removeItem("is_admin");
  localStorage.removeItem("language");
  localStorage.removeItem(SESSION_MARKER_KEY);
  delete apiClient.defaults.headers.common.Authorization;
  notifySessionUpdated();
}
