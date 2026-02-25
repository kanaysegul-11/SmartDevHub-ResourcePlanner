import { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [userData, setUserData] = useState({
    username: localStorage.getItem("username") || "Kullanici",
    email: "",
    firstName: "",
    lastName: "",
    avatar: localStorage.getItem("userAvatar") || "",
  });

  const syncFromStorage = () => {
    setUserData((prev) => ({
      ...prev,
      username: localStorage.getItem("username") || prev.username || "Kullanici",
      avatar: localStorage.getItem("userAvatar") || prev.avatar || "",
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
      return merged;
    });
  };
  const refreshUserData = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await axios.get("http://localhost:8000/api/update-profile/", {
        headers: {
          Authorization: `Token ${token}`,
        },
      });

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
    <UserContext.Provider value={{ userData, setUserData: updateUserData, refreshUserData }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);