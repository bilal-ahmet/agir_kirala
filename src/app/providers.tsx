"use client";

import type { User } from "@/lib/types";
import { AuthProvider } from "@/context/auth-context";
import { FavoritesProvider } from "@/context/favorites-context";
import { ThemeProvider } from "@/context/theme-context";

export function Providers({
  initialUser,
  initialFavoriteIds,
  children,
}: {
  initialUser: User | null;
  initialFavoriteIds: string[];
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider>
      <AuthProvider initialUser={initialUser}>
        <FavoritesProvider initialIds={initialFavoriteIds}>{children}</FavoritesProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
