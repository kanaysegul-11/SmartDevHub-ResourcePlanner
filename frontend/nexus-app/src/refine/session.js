import { apiClient } from "./axios";
import {
  clearSessionValue,
  queueRememberedLoginNotice,
  setRememberedLogin,
  setSessionValue,
} from "./sessionStorage";

export const SESSION_UPDATED_EVENT = "nexus:session-updated";
export const SESSION_MARKER_KEY = "nexus:session-marker";

export function notifySessionUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(SESSION_UPDATED_EVENT));
  }
}

export function applySessionPayload(payload = {}, options = {}) {
  const token = payload?.token;
  const rememberMe = options?.rememberMe ?? true;
  const rememberedUsername = payload?.username || options?.rememberedUsername || "";
  const showRememberNotice = options?.showRememberNotice ?? false;

  if (!token) {
    return false;
  }

  setSessionValue("token", token, { rememberMe });
  apiClient.defaults.headers.common.Authorization = `Token ${token}`;

  if (payload?.username || rememberedUsername) {
    setSessionValue("username", payload?.username || rememberedUsername, {
      rememberMe,
    });
  }

  if (payload?.user_id) {
    setSessionValue("user_id", String(payload.user_id), { rememberMe });
  }

  if (payload?.language) {
    setSessionValue("language", payload.language, { rememberMe });
    localStorage.setItem("language", payload.language);
  }

  setSessionValue("is_admin", payload?.is_admin ? "true" : "false", { rememberMe });
  setSessionValue(SESSION_MARKER_KEY, String(Date.now()), { rememberMe });
  setRememberedLogin(rememberedUsername, rememberMe);

  if (rememberMe && showRememberNotice) {
    queueRememberedLoginNotice();
  }

  notifySessionUpdated();

  return true;
}

export function clearSessionPayload() {
  clearSessionValue("token");
  clearSessionValue("username");
  clearSessionValue("user_id");
  clearSessionValue("is_admin");
  clearSessionValue("language");
  clearSessionValue(SESSION_MARKER_KEY);
  delete apiClient.defaults.headers.common.Authorization;
  notifySessionUpdated();
}
