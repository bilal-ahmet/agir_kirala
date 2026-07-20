"use client";

import { createContext, useContext, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@/lib/types";
import { logoutAction } from "@/lib/auth/actions";

interface AuthContextValue {
  user: User | null;
  /** Oturum server'dan geldiği için her zaman hazır. */
  ready: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Oturum kullanıcısı server'da (RootLayout) getCurrentUser ile çözülüp buraya prop olarak geçilir.
 * Client bileşenler useAuth().user ile okur. Giriş/kayıt/çıkış server action'ları ile yapılır.
 */
export function AuthProvider({
  initialUser,
  children,
}: {
  initialUser: User | null;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const logout = () => {
    startTransition(async () => {
      await logoutAction();
      router.refresh();
    });
  };

  return (
    <AuthContext.Provider value={{ user: initialUser, ready: true, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth, AuthProvider içinde kullanılmalıdır");
  return ctx;
}
