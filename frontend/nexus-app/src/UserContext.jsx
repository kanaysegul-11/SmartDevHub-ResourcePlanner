import {
  useCallback,
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import { apiClient } from "./refine/axios";
import { SESSION_UPDATED_EVENT } from "./refine/session";

const UserContext = createContext(null);
const defaultUserData = {
  username: localStorage.getItem("username") || "User",
  email: "",
  firstName: "",
  lastName: "",
  avatar: localStorage.getItem("userAvatar") || "",
  isAdmin: localStorage.getItem("is_admin") === "true",
  language: localStorage.getItem("language") || "en",
};

const readUserDataFromStorage = (prevState = defaultUserData) => {
  const hasToken = Boolean(localStorage.getItem("token"));

  return {
    ...prevState,
    username: hasToken
      ? localStorage.getItem("username") || prevState.username || "User"
      : "User",
    avatar: hasToken ? localStorage.getItem("userAvatar") || prevState.avatar || "" : "",
    isAdmin: hasToken && localStorage.getItem("is_admin") === "true",
    language: hasToken
      ? localStorage.getItem("language") || prevState.language || "en"
      : "en",
  };
};

export const UserProvider = ({ children }) => {
  const [userData, setUserDataState] = useState(() => readUserDataFromStorage());

  const syncFromStorage = useCallback(() => {
    setUserDataState((prev) => readUserDataFromStorage(prev));
  }, []);

  const updateUserData = useCallback((nextData) => {
    setUserDataState((prev) => {
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
  }, []);

  const refreshUserData = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        syncFromStorage();
        return;
      }

      const response = await apiClient.get("/update-profile/");
      updateUserData(response.data || {});
    } catch (error) {
      console.error("User fetch error:", error);
      syncFromStorage();
    }
  }, [syncFromStorage, updateUserData]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void refreshUserData();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [refreshUserData]);

  useEffect(() => {
    const handleSessionUpdated = () => {
      const token = localStorage.getItem("token");
      if (token) {
        void refreshUserData();
        return;
      }

      syncFromStorage();
    };

    window.addEventListener(SESSION_UPDATED_EVENT, handleSessionUpdated);
    window.addEventListener("storage", handleSessionUpdated);

    return () => {
      window.removeEventListener(SESSION_UPDATED_EVENT, handleSessionUpdated);
      window.removeEventListener("storage", handleSessionUpdated);
    };
  }, [refreshUserData, syncFromStorage]);

  return (
    <UserContext.Provider
      value={{ userData, setUserData: updateUserData, refreshUserData }}
    >
      {children}
    </UserContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useUser = () => {
  const context = useContext(UserContext);

  if (!context) {
    throw new Error("useUser must be used within a UserProvider.");
  }

  return context;
};
