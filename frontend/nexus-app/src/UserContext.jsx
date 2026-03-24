import { createContext, useContext, useEffect, useState } from "react";
import { apiClient } from "./refine/axios";

const UserContext = createContext(null);

export const UserProvider = ({ children }) => {
  const [userData, setUserData] = useState({
    username: localStorage.getItem("username") || "User",
    email: "",
    firstName: "",
    lastName: "",
    avatar: localStorage.getItem("userAvatar") || "",
    isAdmin: localStorage.getItem("is_admin") === "true",
    language: localStorage.getItem("language") || "en",
  });

  const syncFromStorage = () => {
    setUserData((prev) => ({
      ...prev,
      username: localStorage.getItem("username") || prev.username || "User",
      avatar: localStorage.getItem("userAvatar") || prev.avatar || "",
      isAdmin: localStorage.getItem("is_admin") === "true",
      language: localStorage.getItem("language") || prev.language || "en",
    }));
  };

  const updateUserData = (nextData) => {
    setUserData((prev) => {
      const merged = { ...prev, ...nextData };
      if (merged.username) {
        localStorage.setItem("username", merged.username);
      }
      if (typeof merged.avatar === "string") {
        localStorage.setItem("userAvatar", merged.avatar);
      }
      if (merged.language) {
        localStorage.setItem("language", merged.language);
      }
      localStorage.setItem("is_admin", merged.isAdmin ? "true" : "false");
      return merged;
    });
  };

  const refreshUserData = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await apiClient.get("/update-profile/");
      updateUserData(response.data || {});
    } catch (error) {
      console.error("User fetch error:", error);
      syncFromStorage();
    }
  };

  useEffect(() => {
    refreshUserData();
  }, []);

  return (
    <UserContext.Provider
      value={{ userData, setUserData: updateUserData, refreshUserData }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);

  if (!context) {
    throw new Error("useUser must be used within a UserProvider.");
  }

  return context;
};

