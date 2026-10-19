import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { authApi } from "../api/auth.api";
import { setAccessToken } from "../api/client";
import type { AuthUser } from "./types";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const version = useRef(0);

  useEffect(() => {
    let cancelled = false;
    const currentVersion = version.current;

    async function restoreSession() {
      try {
        const token = await authApi.restore();

        if (!token) return;

        const response = await authApi.me();

        if (!cancelled && version.current === currentVersion) {
          setUser(response.user);
        }
      } catch {
        if (!cancelled && version.current === currentVersion) {
          setUser(null);
          setAccessToken(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void restoreSession();

    return () => {
      cancelled = true;
    };
  }, []);

  async function login(email: string, password: string) {
    const response = await authApi.login({
      email: email.trim().toLowerCase(),
      password,
    });

    version.current += 1;
    setAccessToken(response.accessToken);
    setUser(response.user);
    return response.user;
  }

  async function logout() {
    version.current += 1;

    try {
      await authApi.logout();
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth debe utilizarse dentro de AuthProvider");
  }

  return context;
}
