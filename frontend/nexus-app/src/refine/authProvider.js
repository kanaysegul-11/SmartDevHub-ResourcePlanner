import { apiClient } from "./axios";
import { applySessionPayload, clearSessionPayload } from "./session";
import { getSessionValue } from "./sessionStorage";

export const authProvider = {
  login: async ({ username, password, rememberMe = false }) => {
    try {
      const response = await apiClient.post("/login/", { username, password });
      const ok = applySessionPayload(response.data, {
        rememberMe,
        rememberedUsername: username,
        showRememberNotice: rememberMe,
      });

      if (ok) {
        return { success: true, redirectTo: "/dashboard" };
      }

      return { success: false, error: { message: "Login failed." } };
    } catch (error) {
      return {
        success: false,
        error: {
          message: error?.response?.data?.detail || "Login failed.",
        },
      };
    }
  },
  logout: async () => {
    try {
      await apiClient.post("/logout/");
    } catch (error) {
      console.warn("Logout request failed:", error);
    } finally {
      clearSessionPayload();
    }
    return { success: true, redirectTo: "/login" };
  },
  check: async () => {
    const token = getSessionValue("token");
    if (token && token !== "undefined" && token !== "null") {
      return { authenticated: true };
    }
    return { authenticated: false, redirectTo: "/login" };
  },
  getIdentity: async () => {
    const username = getSessionValue("username");
    const userId = getSessionValue("user_id");
    if (!username && !userId) {
      return null;
    }
    return {
      id: userId || "",
      name: username || "",
      isAdmin: getSessionValue("is_admin") === "true",
      language: getSessionValue("language") || localStorage.getItem("language") || "en",
    };
  },
};
