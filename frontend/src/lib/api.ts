import axios from "axios";

const ACCESS_TOKEN_KEY = "la_access_token";
const REFRESH_TOKEN_KEY = "la_refresh_token";

export const tokenStore = {
  getAccess: () => localStorage.getItem(ACCESS_TOKEN_KEY),
  getRefresh: () => localStorage.getItem(REFRESH_TOKEN_KEY),
  set: (accessToken: string, refreshToken: string) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  },
  clear: () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },
};

export const API_BASE_URL = import.meta.env.VITE_API_URL || "/api"; // dev: Vite proxy; prod: set VITE_API_URL to the deployed backend

/** PUT a file to a presigned R2 URL, throwing on failure instead of silently pretending it worked. */
export async function uploadToR2(uploadUrl: string, file: File): Promise<void> {
  const res = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type || "application/octet-stream" },
    body: file,
  });
  if (!res.ok) throw new Error(`File upload to storage failed (${res.status}). Check your connection and try again.`);
}

export const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = tokenStore.getAccess();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshingPromise: Promise<string> | null = null;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry && tokenStore.getRefresh()) {
      originalRequest._retry = true;
      try {
        if (!refreshingPromise) {
          refreshingPromise = axios
            .post(`${API_BASE_URL}/auth/refresh`, { refreshToken: tokenStore.getRefresh() })
            .then(({ data }) => {
              tokenStore.set(data.accessToken, data.refreshToken);
              return data.accessToken as string;
            })
            .finally(() => {
              refreshingPromise = null;
            });
        }
        const newAccessToken = await refreshingPromise;
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch {
        tokenStore.clear();
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);
