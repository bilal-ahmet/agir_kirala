"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

/** Filtre URL'ini yönetir: parametre okuma + güncelleme (sayfa sıfırlanır). */
export function useFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const commit = useCallback(
    (next: URLSearchParams) => {
      next.delete("sayfa");
      const qs = next.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router],
  );

  /** Tek parametreyi ayarla/sil */
  const setParam = useCallback(
    (key: string, value?: string | null) => {
      const next = new URLSearchParams(sp.toString());
      if (value == null || value === "") next.delete(key);
      else next.set(key, value);
      commit(next);
    },
    [sp, commit],
  );

  /** Virgülle ayrılan listede değer aç/kapat (ör. marka) */
  const toggleInList = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(sp.toString());
      const cur = (next.get(key) || "").split(",").filter(Boolean);
      const idx = cur.indexOf(value);
      if (idx >= 0) cur.splice(idx, 1);
      else cur.push(value);
      if (cur.length) next.set(key, cur.join(","));
      else next.delete(key);
      commit(next);
    },
    [sp, commit],
  );

  /** Çoklu değişiklik için ham güncelleme */
  const update = useCallback(
    (mutator: (p: URLSearchParams) => void) => {
      const next = new URLSearchParams(sp.toString());
      mutator(next);
      commit(next);
    },
    [sp, commit],
  );

  /** Tüm filtreleri temizle (q ve kategori korunur) */
  const clearAll = useCallback(() => {
    const next = new URLSearchParams();
    const q = sp.get("q");
    const kategori = sp.get("kategori");
    const sirala = sp.get("sirala");
    if (q) next.set("q", q);
    if (kategori) next.set("kategori", kategori);
    if (sirala) next.set("sirala", sirala);
    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [sp, pathname, router]);

  return { sp, setParam, toggleInList, update, clearAll };
}
