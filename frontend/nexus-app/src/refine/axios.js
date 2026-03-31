import axios from "axios";
import { getSessionValue } from "./sessionStorage";

const apiBaseUrl =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

export const apiClient = axios.create({
  baseURL: apiBaseUrl,
});

const bootstrapToken = getSessionValue("token");
if (bootstrapToken) {
  apiClient.defaults.headers.common.Authorization = `Token ${bootstrapToken}`;
}

apiClient.interceptors.request.use((config) => {
  const token = getSessionValue("token");
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
