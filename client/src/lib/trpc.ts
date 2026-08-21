import axios from "axios";
import { getToken, redirectToLogin } from "./auth";

// Axios instance pointing to Express backend (proxied via Vite → localhost:5000)
const api = axios.create({
  baseURL: "/api",
  withCredentials: true,
});

// Attach JWT token from localStorage if available
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * Endpoints where a 401 is a legitimate answer rather than an expired session.
 *
 * POST /auth/login returns 401 for a wrong password — bouncing to the login
 * page there would reload it and wipe the "Invalid email or password" toast
 * before the user could read it. These are excluded so the calling page can
 * surface the backend's own message.
 */
const AUTH_ENDPOINTS = ["/auth/login", "/auth/register"];

/**
 * Every protected route (feedback, stats, analyze) answers 401 once the JWT
 * expires — tokens last 7 days, so this happens mid-session in normal use.
 * Handling it here means no page has to check for it individually, and a stale
 * session lands on /login instead of rendering an empty chart or an error card.
 */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url ?? "";
    const isAuthAttempt = AUTH_ENDPOINTS.some((path) => url.startsWith(path));

    if (error.response?.status === 401 && !isAuthAttempt) {
      redirectToLogin();
    }
    return Promise.reject(error);
  }
);

export default api;

// Re-export a dummy trpc object so imports don't break if any component references it
// (unused but prevents import errors during migration)
export const trpc = {} as any;
