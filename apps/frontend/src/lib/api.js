import axios from "axios";
import { API_BASE as API_URL } from "../config/selfHost";

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("blinkbox_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("blinkbox_token");
      localStorage.removeItem("blinkbox_user");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  },
);

export { API_URL };
export default api;
