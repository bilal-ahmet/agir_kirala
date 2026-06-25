"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

interface RentalSelection {
  start: string;
  end: string;
  startTime: string;
  endTime: string;
  setStart: (v: string) => void;
  setEnd: (v: string) => void;
  setStartTime: (v: string) => void;
  setEndTime: (v: string) => void;
  /** Takvimden gün seçimi: 1. tıklama başlangıç, 2. tıklama bitiş. */
  pickDate: (iso: string) => void;
}

const Ctx = createContext<RentalSelection | null>(null);

export function RentalSelectionProvider({ children }: { children: React.ReactNode }) {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  const pickDate = useCallback(
    (iso: string) => {
      if (!start || (start && end)) {
        // Yeni aralık başlat
        setStart(iso);
        setEnd("");
      } else if (iso < start) {
        // Başlangıçtan önceye tıklandı → başlangıcı güncelle
        setStart(iso);
      } else {
        // Bitişi belirle
        setEnd(iso);
      }
    },
    [start, end],
  );

  const value = useMemo<RentalSelection>(
    () => ({
      start,
      end,
      startTime,
      endTime,
      setStart,
      setEnd,
      setStartTime,
      setEndTime,
      pickDate,
    }),
    [start, end, startTime, endTime, pickDate],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useRentalSelection(): RentalSelection {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useRentalSelection, RentalSelectionProvider içinde kullanılmalıdır");
  return ctx;
}
