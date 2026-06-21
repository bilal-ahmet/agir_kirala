"use client";

import { useEffect, useState } from "react";

/**
 * localStorage tabanlı veriyi okur ve "avk:storage" / "storage" olaylarında yeniler.
 * İlk değer lazy initializer ile alınır (yalnızca client'ta çağrılır), böylece
 * effect içinde senkron setState yapılmaz.
 */
export function useStored<T>(loader: () => T): T {
  const [value, setValue] = useState<T>(loader);

  useEffect(() => {
    const reload = () => setValue(loader());
    window.addEventListener("avk:storage", reload);
    window.addEventListener("storage", reload);
    return () => {
      window.removeEventListener("avk:storage", reload);
      window.removeEventListener("storage", reload);
    };
    // loader sayfa ömrü boyunca sabittir (mevcut kullanıcıya kapanır)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return value;
}
