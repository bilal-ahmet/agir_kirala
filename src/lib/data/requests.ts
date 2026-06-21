import type { RentalRequest } from "../types";

// Demo (u1) hesabı için tohumlanmış kiralama talepleri.
// - ownerId === "u1": GELEN talepler (u1 ilan sahibi)
// - renterId === "u1": GİDEN talepler (u1 kiralayan)

export const REQUESTS: RentalRequest[] = [
  // Gelen talepler
  {
    id: "r1",
    listingId: "l1",
    renterId: "u4",
    ownerId: "u1",
    startDate: "2026-06-25",
    endDate: "2026-06-29",
    period: "gunluk",
    message: "Merhaba, kanal kazısı için 5 gün operatörlü kiralamak istiyorum. Müsait misiniz?",
    status: "beklemede",
    createdAt: "2026-06-19T10:30:00Z",
    totalPrice: 57500,
  },
  {
    id: "r2",
    listingId: "l5",
    renterId: "u7",
    ownerId: "u1",
    startDate: "2026-06-23",
    endDate: "2026-06-24",
    period: "gunluk",
    message: "İki günlük altyapı işi için beko loder lazım. Nakliye dahil mi?",
    status: "onaylandi",
    createdAt: "2026-06-17T14:00:00Z",
    totalPrice: 14000,
  },
  {
    id: "r3",
    listingId: "l24",
    renterId: "u6",
    ownerId: "u1",
    startDate: "2026-07-01",
    endDate: "2026-07-10",
    period: "gunluk",
    message: "Hafriyat taşıma için damperli kamyon, 10 gün. Toplam fiyat görüşülür mü?",
    status: "beklemede",
    createdAt: "2026-06-20T08:15:00Z",
    totalPrice: 85000,
  },

  // Giden talepler
  {
    id: "r4",
    listingId: "l13",
    renterId: "u1",
    ownerId: "u5",
    startDate: "2026-06-28",
    endDate: "2026-06-28",
    period: "gunluk",
    message: "Çelik konstrüksiyon montajı için 1 gün 50 ton vinç. Operatör dahil değil mi?",
    status: "beklemede",
    createdAt: "2026-06-18T11:45:00Z",
    totalPrice: 26000,
  },
  {
    id: "r5",
    listingId: "l21",
    renterId: "u1",
    ownerId: "u2",
    startDate: "2026-06-22",
    endDate: "2026-06-22",
    period: "saatlik",
    message: "Bina dökümü için yarım gün beton pompası ihtiyacımız var.",
    status: "reddedildi",
    createdAt: "2026-06-16T09:20:00Z",
    totalPrice: 16000,
  },
];
