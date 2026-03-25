import { apiClient } from "./axios";
import { applySessionPayload, clearSessionPayload } from "./session";

export const authProvider = {
  login: async ({ username, password }) => {
    try {
      const response = await apiClient.post("/login/", { username, password });
      const ok = applySessionPayload(response.data);

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
    const token = localStorage.getItem("token");
    if (token && token !== "undefined" && token !== "null") {
      return { authenticated: true };
    }
    return { authenticated: false, redirectTo: "/login" };
  },
  getIdentity: async () => {
    const username = localStorage.getItem("username");
    const userId = localStorage.getItem("user_id");
    if (!username && !userId) {
      return null;
    }
    return {
      id: userId || "",
      name: username || "",
      isAdmin: localStorage.getItem("is_admin") === "true",
      language: localStorage.getItem("language") || "en",
    };
  },
};
