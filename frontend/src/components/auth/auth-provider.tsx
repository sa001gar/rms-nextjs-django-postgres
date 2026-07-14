'use client';

import { createContext, useContext, useCallback, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { clearTokens } from "@/lib/auth/session";
import type { User, UserRole } from "@/types";

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, role: UserRole) => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const store = useAuthStore();

  const login = useCallback(async (email: string, password: string, role: UserRole): Promise<boolean> => {
    try {
      if (role === "student") await store.studentLogin(email, password);
      else await store.login(email, password);
      return true;
    } catch {
      return false;
    }
  }, [store]);

  const logout = useCallback(async () => {
    await store.logout();
    clearTokens();
    router.push("/login");
  }, [store, router]);

  return (
    <AuthContext.Provider value={{
      user: store.user,
      isAuthenticated: store.isAuthenticated,
      isLoading: store.isLoading,
      login,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuthContext must be used within an AuthProvider");
  return context;
}
