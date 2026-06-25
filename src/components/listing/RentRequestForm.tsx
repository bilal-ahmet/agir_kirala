"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { Listing, RentalPeriod } from "@/lib/types";
import { useAuth } from "@/context/auth-context";
import { addLocalRequest } from "@/lib/storage";
import { PERIODS } from "@/lib/constants";
import { daysBetween, formatPrice, primaryPrice } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { Field, Input, Label, Select, Textarea } from "@/components/ui/Field";
import { CheckIcon } from "@/components/ui/icons";
import { useRentalSelection } from "./rental-selection";

const HOURS = Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, "0")}:00`);

/** Periyot başına süre adedini hesaplar */
function quantityFor(period: RentalPeriod, days: number): number {
  switch (period) {
    case "saatlik": return Math.max(1, days * 8);
    case "gunluk": return Math.max(1, days);
    case "haftalik": return Math.max(1, Math.ceil(days / 7));
    case "aylik": return Math.max(1, Math.ceil(days / 30));
    case "yillik": return Math.max(1, Math.ceil(days / 365));
  }
}

export function RentRequestForm({ listing }: { listing: Listing }) {
  const { user } = useAuth();
  const router = useRouter();
  const todayStr = new Date().toISOString().slice(0, 10);

  const availablePeriods = PERIODS.filter((p) => listing.prices[p.value] != null);
  const defaultPeriod = primaryPrice(listing.prices)?.period ?? availablePeriods[0]?.value ?? "gunluk";

  const { start, end, startTime, endTime, setStart, setEnd, setStartTime, setEndTime } =
    useRentalSelection();
  const [period, setPeriod] = useState<RentalPeriod>(defaultPeriod);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const isOwn = user?.id === listing.ownerId;

  const calc = useMemo(() => {
    if (!start || !end) return null;
    const days = daysBetween(start, end);
    if (days <= 0) return null;
    const unit = listing.prices[period];
    if (unit == null) return null;
    const qty = quantityFor(period, days);
    const unitLabel = PERIODS.find((p) => p.value === period)?.short ?? "";
    return { days, qty, total: unit * qty, unitLabel };
  }, [start, end, period, listing.prices]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!user) {
      router.push(`/giris?next=/ilanlar/${listing.id}`);
      return;
    }
    if (!start || !end) return setError("Lütfen başlangıç ve bitiş tarihi seçin.");
    const days = daysBetween(start, end);
    if (days <= 0) return setError("Bitiş tarihi başlangıçtan sonra olmalıdır.");
    if (listing.minRentalDays && days < listing.minRentalDays) {
      return setError(`Bu ilan için minimum kiralama süresi ${listing.minRentalDays} gündür.`);
    }
    if (!calc) return setError("Tutar hesaplanamadı.");

    const timeNote =
      startTime || endTime
        ? `Saat: ${startTime || "—"}${endTime ? `–${endTime}` : ""}`
        : "";
    const fullMessage = [message.trim(), timeNote].filter(Boolean).join("\n");

    addLocalRequest({
      id: `r-${Date.now()}`,
      listingId: listing.id,
      renterId: user.id,
      ownerId: listing.ownerId,
      startDate: start,
      endDate: end,
      period,
      message: fullMessage,
      status: "beklemede",
      createdAt: new Date().toISOString(),
      totalPrice: calc.total,
    });
    setDone(true);
  };

  if (done) {
    return (
      <div className="rounded-lg border border-success/30 bg-success-soft p-5 text-center">
        <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-success/20 text-success">
          <CheckIcon size={26} />
        </div>
        <h3 className="font-bold text-fg">Talebiniz gönderildi!</h3>
        <p className="mt-1 text-sm text-muted">
          İlan sahibi talebinizi inceleyip dönüş yapacak. Taleplerinizi panelinizden takip edebilirsiniz.
        </p>
        <Link href="/hesap/taleplerim" className="mt-4 inline-block text-sm font-semibold text-accent hover:underline">
          Taleplerime Git →
        </Link>
      </div>
    );
  }

  if (isOwn) {
    return (
      <div className="rounded-lg border border-line bg-surface-2 p-4 text-sm text-muted">
        Bu sizin ilanınız. Gelen kiralama taleplerini{" "}
        <Link href="/hesap/gelen-talepler" className="font-semibold text-accent hover:underline">
          panelinizden
        </Link>{" "}
        yönetebilirsiniz.
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Başlangıç Tarihi">
          <Input type="date" min={todayStr} value={start} onChange={(e) => setStart(e.target.value)} />
        </Field>
        <Field label="Bitiş Tarihi">
          <Input type="date" min={start || todayStr} value={end} onChange={(e) => setEnd(e.target.value)} />
        </Field>
        <Field label="Başlangıç Saati">
          <Select value={startTime} onChange={(e) => setStartTime(e.target.value)}>
            <option value="">Saat seçin</option>
            {HOURS.map((h) => (
              <option key={h} value={h}>{h}</option>
            ))}
          </Select>
        </Field>
        <Field label="Bitiş Saati">
          <Select value={endTime} onChange={(e) => setEndTime(e.target.value)}>
            <option value="">Saat seçin</option>
            {HOURS.map((h) => (
              <option key={h} value={h}>{h}</option>
            ))}
          </Select>
        </Field>
      </div>

      {availablePeriods.length > 1 && (
        <Field label="Fiyatlandırma">
          <Select value={period} onChange={(e) => setPeriod(e.target.value as RentalPeriod)}>
            {availablePeriods.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label} — {formatPrice(listing.prices[p.value]!)}
              </option>
            ))}
          </Select>
        </Field>
      )}

      <div>
        <Label>Mesaj (opsiyonel)</Label>
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="İş detayları, lokasyon, özel talepleriniz..."
          rows={3}
        />
      </div>

      {calc && (
        <div className="rounded-lg border border-line bg-surface-2 p-3 text-sm">
          <div className="flex justify-between text-muted">
            <span>{calc.days} gün · {calc.qty} {calc.unitLabel}</span>
            <span>{formatPrice(listing.prices[period]!)} × {calc.qty}</span>
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-line pt-2">
            <span className="font-semibold">Tahmini Toplam</span>
            <span className="text-lg font-extrabold text-accent">{formatPrice(calc.total)}</span>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-danger">{error}</p>}

      <Button type="submit" className="w-full" size="lg">
        {user ? "Kiralama Talebi Gönder" : "Giriş Yap ve Talep Gönder"}
      </Button>
      <p className="text-center text-xs text-faint">
        Talep göndermek ücretsizdir ve bağlayıcı değildir.
      </p>
    </form>
  );
}
