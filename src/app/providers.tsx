"use client";

import { AuthProvider } from "@/context/auth-context";
import { FavoritesProvider } from "@/context/favorites-context";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <FavoritesProvider>{children}</FavoritesProvider>
    </AuthProvider>
  );
}
