import { apiClient } from "./axios";

export const authProvider = {
  login: async ({ username, password }) => {
    try {
      const response = await apiClient.post("/login/", { username, password });
      const token = response.data?.token;

      if (token) {
        localStorage.setItem("token", token);
        apiClient.defaults.headers.common.Authorization = `Token ${token}`;
        if (response.data?.username) {
          localStorage.setItem("username", response.data.username);
        }
        if (response.data?.user_id) {
          localStorage.setItem("user_id", String(response.data.user_id));
        }
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
      localStorage.removeItem("token");
      localStorage.removeItem("username");
      localStorage.removeItem("user_id");
      delete apiClient.defaults.headers.common.Authorization;
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
    };
  },
};
