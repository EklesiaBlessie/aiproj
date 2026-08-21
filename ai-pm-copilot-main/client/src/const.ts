// Auth utility: redirect to login page
export const startLogin = () => {
  window.location.href = "/login";
};

export const COOKIE_NAME = "ai_pm_session";
export const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
