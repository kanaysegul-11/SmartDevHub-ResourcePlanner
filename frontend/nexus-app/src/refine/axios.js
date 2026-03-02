import axios from "axios";

const apiBaseUrl =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

export const apiClient = axios.create({
  baseURL: apiBaseUrl,
});

const bootstrapToken = localStorage.getItem("token");
if (bootstrapToken) {
  apiClient.defaults.headers.common.Authorization = `Token ${bootstrapToken}`;
}

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  console.log("İstek gidiyor, token:", token);
  if (!config.headers) {
    config.headers = {};
  }
  if (token) {
    config.headers.Authorization = `Token ${token}`;
  } else if (config.headers.Authorization) {
    delete config.headers.Authorization;
  }
  return config;
});

export const getApiBaseUrl = () => apiBaseUrl;
