"use client";

import type { ReadonlyURLSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { useFilters } from "./use-filters";

/**
 * Filtre kontrollerinin (FilterControls/FilterPanel) bağlı olduğu soyut arayüz.
 * İki uygulaması var: URL tabanlı (useFilters → /ilanlar) ve yerel (useLocalFilters → ana sayfa).
 */
export interface FiltersController {
  sp: ReadonlyURLSearchParams | URLSearchParams;
  setParam: (key: string, value?: string | null) => void;
  toggleInList: (key: string, value: string) => void;
  update: (mutator: (p: URLSearchParams) => void) => void;
  clearAll: () => void;
}

const FilterControllerContext = createContext<FiltersController | null>(null);

export const FilterControllerProvider = FilterControllerContext.Provider;

/**
 * Aktif controller'ı context'ten döndürür. FilterControls/FilterPanel daima
 * bir provider içinde render edilir: /ilanlar → UrlFilterProvider, ana sayfa →
 * yerel controller. (Provider yoksa useSearchParams ağaca girmez; ana sayfa statik kalır.)
 */
export function useFilterController(): FiltersController {
  const ctx = useContext(FilterControllerContext);
  if (!ctx) {
    throw new Error("useFilterController bir FilterControllerProvider içinde kullanılmalı.");
  }
  return ctx;
}

/** URL tabanlı controller'ı sağlar (useFilters). /ilanlar tarafında kullanılır. */
export function UrlFilterProvider({ children }: { children: ReactNode }) {
  const controller = useFilters();
  return <FilterControllerProvider value={controller}>{children}</FilterControllerProvider>;
}

/**
 * Ana sayfa için yerel (in-memory) filtre durumu. Navigasyon yapmaz;
 * seçimleri query string olarak tutar ve submit() ile /ilanlar'a taşır.
 */
export function useLocalFilters() {
  const router = useRouter();
  const [qs, setQs] = useState("");

  const sp = useMemo(() => new URLSearchParams(qs), [qs]);

  const setParam = useCallback(
    (key: string, value?: string | null) => {
      const next = new URLSearchParams(qs);
      if (value == null || value === "") next.delete(key);
      else next.set(key, value);
      setQs(next.toString());
    },
    [qs],
  );

  const toggleInList = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(qs);
      const cur = (next.get(key) || "").split(",").filter(Boolean);
      const idx = cur.indexOf(value);
      if (idx >= 0) cur.splice(idx, 1);
      else cur.push(value);
      if (cur.length) next.set(key, cur.join(","));
      else next.delete(key);
      setQs(next.toString());
    },
    [qs],
  );

  const update = useCallback(
    (mutator: (p: URLSearchParams) => void) => {
      const next = new URLSearchParams(qs);
      mutator(next);
      setQs(next.toString());
    },
    [qs],
  );

  const clearAll = useCallback(() => setQs(""), []);

  const submit = useCallback(() => {
    router.push(qs ? `/ilanlar?${qs}` : "/ilanlar");
  }, [router, qs]);

  const controller: FiltersController = useMemo(
    () => ({ sp, setParam, toggleInList, update, clearAll }),
    [sp, setParam, toggleInList, update, clearAll],
  );

  return { controller, sp, qs, submit };
}
