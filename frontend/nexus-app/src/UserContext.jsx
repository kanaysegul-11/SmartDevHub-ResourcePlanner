import {
  useCallback,
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import { apiClient } from "./refine/axios";
import { SESSION_UPDATED_EVENT } from "./refine/session";
import {
  getSessionValue,
  hasSessionValue,
  REMEMBER_ME_KEY,
  setSessionValue,
} from "./refine/sessionStorage";

const UserContext = createContext(null);
const defaultUserData = {
  id: getSessionValue("user_id") || "",
  username: getSessionValue("username") || "User",
  email: "",
  firstName: "",
  lastName: "",
  avatar: localStorage.getItem("userAvatar") || "",
  isAdmin: getSessionValue("is_admin") === "true",
  language: getSessionValue("language") || localStorage.getItem("language") || "en",
};

const readUserDataFromStorage = (prevState = defaultUserData) => {
  const hasToken = hasSessionValue("token");

  return {
    ...prevState,
    id: hasToken ? getSessionValue("user_id") || prevState.id || "" : "",
    username: hasToken
      ? getSessionValue("username") || prevState.username || "User"
      : "User",
    avatar: hasToken ? localStorage.getItem("userAvatar") || prevState.avatar || "" : "",
    isAdmin: hasToken && getSessionValue("is_admin") === "true",
    language: hasToken
      ? getSessionValue("language") || localStorage.getItem("language") || prevState.language || "en"
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
      const rememberMe = localStorage.getItem(REMEMBER_ME_KEY) === "true";

      if (merged.username) {
        setSessionValue("username", merged.username, { rememberMe });
      }
      if (merged.id) {
        setSessionValue("user_id", merged.id, { rememberMe });
      }
      if (typeof merged.avatar === "string") {
        localStorage.setItem("userAvatar", merged.avatar);
      }
      if (merged.language) {
        setSessionValue("language", merged.language, { rememberMe });
        localStorage.setItem("language", merged.language);
      }
      setSessionValue("is_admin", merged.isAdmin ? "true" : "false", { rememberMe });
      return merged;
    });
  }, []);

  const refreshUserData = useCallback(async () => {
    try {
      const token = getSessionValue("token");
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
      const token = getSessionValue("token");
      if (token) {
        syncFromStorage();
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
