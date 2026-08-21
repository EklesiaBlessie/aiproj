/* ────────────────────────────────────────────────────────────────────────────
 * Session storage — the one place that knows how a login is persisted.
 *
 * The same two localStorage keys were previously read and written by hand in
 * App.tsx, Sidebar.tsx, Login.tsx, SignUp.tsx, _core/hooks/useAuth.ts and
 * lib/trpc.ts. Six copies of the same string literals drift the moment one of
 * them changes, so the shape lives here and everything else calls these
 * helpers.
 *
 * Key contract (kept as-is so useAuth and the existing pages keep working):
 *   user                → JSON blob including the JWT under `token`
 *   twoFactorVerified   → "true" once the login flow has completed
 * ──────────────────────────────────────────────────────────────────────── */

const USER_KEY = 'user';
const TWO_FACTOR_KEY = 'twoFactorVerified';
const PENDING_USER_KEY = 'pendingUser';
const AUTH_STEP_KEY = 'authStep';

export interface StoredUser {
  id: string;
  email: string;
  name: string;
  role?: string;
  token: string;
  rememberMe?: boolean;
}

/** The user object returned inside `data.user` by /auth/login and /auth/register. */
export interface ApiUser {
  id: string;
  email: string;
  name: string;
  role?: string;
  createdAt?: string;
}

export function getStoredUser(): StoredUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.token ? (parsed as StoredUser) : null;
  } catch {
    return null;
  }
}

export function getToken(): string | null {
  return getStoredUser()?.token ?? null;
}

/**
 * Read the `exp` claim without pulling in a JWT library.
 *
 * Signature verification is the server's job — this only avoids firing a
 * request we already know will come back 401, so a malformed or unreadable
 * token is simply treated as expired.
 */
export function isTokenExpired(token: string): boolean {
  try {
    const [, payload] = token.split('.');
    if (!payload) return true;
    // base64url → base64, then pad to a multiple of 4.
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const claims = JSON.parse(atob(padded));
    if (typeof claims.exp !== 'number') return false; // no expiry claim → let the server decide
    return claims.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
}

/** True when a token is present and has not expired. */
export function hasValidSession(): boolean {
  const token = getToken();
  return Boolean(token) && !isTokenExpired(token as string);
}

export function saveSession(user: ApiUser, token: string, extra?: { rememberMe?: boolean }): void {
  const stored: StoredUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    token,
    ...(extra?.rememberMe !== undefined ? { rememberMe: extra.rememberMe } : {}),
  };
  localStorage.setItem(USER_KEY, JSON.stringify(stored));
  // useAuth() treats a session without this flag as unauthenticated.
  localStorage.setItem(TWO_FACTOR_KEY, 'true');
}

export function clearSession(): void {
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(TWO_FACTOR_KEY);
  localStorage.removeItem(PENDING_USER_KEY);
  localStorage.removeItem(AUTH_STEP_KEY);
}

/**
 * Patch fields on the cached session without touching the token.
 *
 * The Settings page can rename the user, and the sidebar reads that name from
 * this cache — without this the new name would only appear after the next
 * login. Deliberately a merge, so the JWT and id are never disturbed.
 */
export function updateStoredProfile(patch: Partial<Pick<StoredUser, 'name' | 'email' | 'role'>>): void {
  const current = getStoredUser();
  if (!current) return;
  localStorage.setItem(USER_KEY, JSON.stringify({ ...current, ...patch }));
}

export const LOGIN_PATH = '/login';

/** Clear the session and hard-navigate to the login page (no-op if already there). */
export function redirectToLogin(): void {
  clearSession();
  if (typeof window !== 'undefined' && window.location.pathname !== LOGIN_PATH) {
    window.location.href = LOGIN_PATH;
  }
}
