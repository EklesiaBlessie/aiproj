import { startLogin } from "@/const";
import { useCallback, useEffect, useMemo, useState } from "react";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

type User = {
  id: string;
  email: string;
  name: string;
  role?: string;
  token?: string;
};

function getStoredUser(): User | null {
  try {
    const raw = localStorage.getItem("user");
    const twoFactor = localStorage.getItem("twoFactorVerified");
    const user = raw ? JSON.parse(raw) : null;
    if (user?.token && twoFactor === "true") return user;
  } catch {}
  return null;
}

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath } = options ?? {};
  const [user, setUser] = useState<User | null>(getStoredUser);
  const [loading, setLoading] = useState(false);

  const logout = useCallback(async () => {
    localStorage.removeItem("user");
    localStorage.removeItem("twoFactorVerified");
    localStorage.removeItem("pendingUser");
    localStorage.removeItem("authStep");
    setUser(null);
    window.location.href = "/login";
  }, []);

  const state = useMemo(
    () => ({
      user,
      loading,
      error: null,
      isAuthenticated: Boolean(user?.token),
    }),
    [user, loading]
  );

  useEffect(() => {
    if (!redirectOnUnauthenticated) return;
    if (loading) return;
    if (state.user) return;
    if (typeof window === "undefined") return;
    if (redirectPath && window.location.pathname === redirectPath) return;

    if (redirectPath) {
      window.location.href = redirectPath;
    } else {
      startLogin();
    }
  }, [redirectOnUnauthenticated, redirectPath, loading, state.user]);

  return {
    ...state,
    refresh: () => setUser(getStoredUser()),
    logout,
  };
}
