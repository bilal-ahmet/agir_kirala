"use client";

import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

/** Sunucuda false, hydration sonrası client'ta true döner (mismatch güvenli). */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}
