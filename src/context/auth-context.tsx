"use client";

import { createContext, useCallback, useContext, useSyncExternalStore } from "react";
import type { OwnerType, User } from "@/lib/types";
import { USERS } from "@/lib/data/users";
import { clearSession, loadSession, saveSession } from "@/lib/storage";
import { useHydrated } from "@/lib/use-hydrated";

interface RegisterInput {
  name: string;
  email: string;
  phone: string;
  city: string;
  type: OwnerType;
  companyName?: string;
}

interface AuthContextValue {
  user: User | null;
  /** localStorage okuması tamamlandı mı (hydration güvenliği) */
  ready: boolean;
  login: (email: string) => User;
  register: (input: RegisterInput) => User;
  logout: () => void;
  updateProfile: (patch: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// localStorage'ı external store olarak oku (snapshot referans kararlılığı için önbellek).
let cache: User | null = null;
let cacheRaw = " ";

function getSnapshot(): User | null {
  const raw = typeof window === "undefined" ? "null" : window.localStorage.getItem("avk:auth") ?? "null";
  if (raw !== cacheRaw) {
    cacheRaw = raw;
    try {
      cache = JSON.parse(raw);
    } catch {
      cache = null;
    }
  }
  return cache;
}

function getServerSnapshot(): User | null {
  return null;
}

function subscribe(cb: () => void): () => void {
  window.addEventListener("avk:storage", cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener("avk:storage", cb);
    window.removeEventListener("storage", cb);
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const user = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const ready = useHydrated();

  const login = useCallback((email: string): User => {
    const existing = USERS.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
    const account: User =
      existing ?? {
        id: "u-local",
        name: email.split("@")[0] || "Kullanıcı",
        type: "bireysel",
        verified: false,
        rating: 0,
        reviewCount: 0,
        memberSince: new Date().toISOString(),
        phone: "",
        email: email.trim(),
        city: "",
        accent: "#f5b100",
      };
    saveSession(account);
    return account;
  }, []);

  const register = useCallback((input: RegisterInput): User => {
    const account: User = {
      id: `u-${Date.now()}`,
      name: input.name,
      type: input.type,
      companyName: input.type === "kurumsal" ? input.companyName : undefined,
      verified: false,
      rating: 0,
      reviewCount: 0,
      memberSince: new Date().toISOString(),
      phone: input.phone,
      email: input.email,
      city: input.city,
      accent: "#f5b100",
    };
    saveSession(account);
    return account;
  }, []);

  const logout = useCallback(() => {
    clearSession();
  }, []);

  const updateProfile = useCallback((patch: Partial<User>) => {
    const cur = loadSession();
    if (!cur) return;
    saveSession({ ...cur, ...patch });
  }, []);

  return (
    <AuthContext.Provider value={{ user, ready, login, register, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth, AuthProvider içinde kullanılmalıdır");
  return ctx;
}
