import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { apiRequest } from "@/lib/api";
import { queryClient } from "@/lib/query-client";
import type { AuthUser } from "@/types/domain";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

type LoginPayload = {
  token: string;
  user: AuthUser;
};

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  status: AuthStatus;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => void;
};

const TOKEN_STORAGE_KEY = "furniture-erp.token";
const AuthContext = createContext<AuthContextValue | null>(null);

function getStoredToken() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => getStoredToken());
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>(() => (getStoredToken() ? "loading" : "unauthenticated"));

  useEffect(() => {
    if (!token) {
      setUser(null);
      setStatus("unauthenticated");
      return;
    }

    let cancelled = false;
    setStatus("loading");

    apiRequest<AuthUser>("/auth/me", { token })
      .then((currentUser) => {
        if (cancelled) {
          return;
        }

        setUser(currentUser);
        setStatus("authenticated");
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        if (typeof window !== "undefined") {
          window.localStorage.removeItem(TOKEN_STORAGE_KEY);
        }

        setToken(null);
        setUser(null);
        setStatus("unauthenticated");
        queryClient.clear();
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  async function login(email: string, password: string) {
    const payload = await apiRequest<LoginPayload>("/auth/login", {
      method: "POST",
      body: { email, password },
    });

    if (typeof window !== "undefined") {
      window.localStorage.setItem(TOKEN_STORAGE_KEY, payload.token);
    }

    setToken(payload.token);
    setUser(payload.user);
    setStatus("authenticated");
    queryClient.clear();

    return payload.user;
  }

  function logout() {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    }

    setToken(null);
    setUser(null);
    setStatus("unauthenticated");
    queryClient.clear();
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      status,
      login,
      logout,
    }),
    [status, token, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
