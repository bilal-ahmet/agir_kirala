import type { PriceMap } from "@/lib/types";
import { PERIODS } from "@/lib/constants";
import { formatPrice } from "@/lib/format";

export function PriceTable({ prices }: { prices: PriceMap }) {
  const available = PERIODS.filter((p) => prices[p.value] != null);
  if (available.length === 0) {
    return <p className="text-sm text-muted">Fiyat bilgisi için ilan sahibiyle iletişime geçin.</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {available.map((p) => (
        <div key={p.value} className="rounded-lg border border-line bg-surface-2 p-3 text-center">
          <p className="text-xs uppercase tracking-wide text-faint">{p.label}</p>
          <p className="mt-1 font-extrabold text-accent">{formatPrice(prices[p.value]!)}</p>
        </div>
      ))}
    </div>
  );
}
