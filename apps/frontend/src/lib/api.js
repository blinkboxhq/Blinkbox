import axios from "axios";
import { toast } from "sonner";
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
    // The server answers every write that hits a full database with the same
    // 503. One toast (deduplicated by id) explains it wherever it happened; the
    // sign-in page already shows the message inline.
    const data = err.response?.data;
    if (err.response?.status === 503 && data?.code === "DB_FULL" && !String(err.config?.url || "").startsWith("/api/auth/")) {
      toast.error(data.message, { id: "db-full", duration: 10000 });
    }
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
