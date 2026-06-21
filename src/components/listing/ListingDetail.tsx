import Link from "next/link";
import type { Listing, User } from "@/lib/types";
import { getCategory } from "@/lib/categories";
import { PERIODS } from "@/lib/constants";
import { formatPrice, formatUsage, primaryPrice, timeAgo } from "@/lib/format";
import { Gallery } from "./Gallery";
import { SpecsTable } from "./SpecsTable";
import { PriceTable } from "./PriceTable";
import { AvailabilityCalendar } from "./AvailabilityCalendar";
import { RentRequestForm } from "./RentRequestForm";
import { ContactBox } from "./ContactBox";
import { OwnerCard } from "./OwnerCard";
import { SimilarListings } from "./SimilarListings";
import { Badge } from "@/components/ui/Badge";
import {
  CheckIcon,
  ClockIcon,
  GaugeIcon,
  MapPinIcon,
  ShieldCheckIcon,
  TruckIcon,
} from "@/components/ui/icons";

const SAFETY_TIPS = [
  "Makineyi teslim almadan önce fiziksel durumunu ve çalışma saatini kontrol edin.",
  "Operatörlü/operatörsüz ve nakliye koşullarını yazılı olarak netleştirin.",
  "Ödeme öncesi sözleşme ve fatura talep edin.",
  "Sigorta ve hasar sorumluluğunu kiralama öncesi belirleyin.",
];

export function ListingDetail({ listing, owner }: { listing: Listing; owner?: User }) {
  const category = getCategory(listing.categorySlug);
  const price = primaryPrice(listing.prices);
  const periodShort = price ? PERIODS.find((p) => p.value === price.period)?.short : "";

  return (
    <div className="container-page py-6 lg:py-8">
      {/* Breadcrumb */}
      <nav className="mb-4 flex flex-wrap items-center gap-1.5 text-sm text-faint">
        <Link href="/" className="hover:text-fg">Ana Sayfa</Link>
        <span>/</span>
        <Link href="/ilanlar" className="hover:text-fg">İlanlar</Link>
        {category && (
          <>
            <span>/</span>
            <Link href={`/ilanlar?kategori=${category.slug}`} className="hover:text-fg">{category.name}</Link>
          </>
        )}
      </nav>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Sol kolon */}
        <div className="lg:col-span-2">
          <Gallery
            id={listing.id}
            icon={category?.icon ?? "🛠️"}
            baseSeed={listing.photoSeed ?? 0}
            count={listing.photoCount ?? 1}
            label={`${listing.brand} ${listing.model}`}
          />

          <div className="mt-6">
            <div className="flex flex-wrap items-center gap-2">
              {category && <Badge tone="neutral">{category.name}</Badge>}
              <Badge tone={listing.operator ? "info" : "neutral"}>
                {listing.operator ? "Operatörlü" : "Operatörsüz"}
              </Badge>
              {listing.transport === "dahil" && <Badge tone="success">Nakliye Dahil</Badge>}
              {owner?.verified && (
                <Badge tone="success" icon={<ShieldCheckIcon size={12} />}>Doğrulanmış Satıcı</Badge>
              )}
            </div>

            <h1 className="mt-3 text-2xl font-bold leading-tight sm:text-3xl">{listing.title}</h1>

            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
              <span className="flex items-center gap-1">
                <MapPinIcon size={15} className="text-faint" /> {listing.district}, {listing.city}
              </span>
              <span className="flex items-center gap-1">
                {category?.usageMetric === "saat" ? <ClockIcon size={15} /> : <GaugeIcon size={15} />}
                {formatUsage(listing.usage, category?.usageMetric ?? "saat")}
              </span>
              <span>{listing.year} model</span>
              <span className="text-faint">{timeAgo(listing.createdAt)} eklendi</span>
            </div>
          </div>

          <Section title="Açıklama">
            <p className="whitespace-pre-line text-sm leading-relaxed text-muted">{listing.description}</p>
          </Section>

          <Section title="Teknik Özellikler">
            <SpecsTable listing={listing} />
          </Section>

          <Section title="Fiyatlandırma">
            <PriceTable prices={listing.prices} />
            {listing.minRentalDays && listing.minRentalDays > 1 && (
              <p className="mt-2 text-xs text-faint">
                Minimum kiralama süresi: {listing.minRentalDays} gün
              </p>
            )}
          </Section>

          <Section title="Müsaitlik Takvimi">
            <AvailabilityCalendar listingId={listing.id} />
          </Section>

          <Section title="Güvenli Kiralama">
            <ul className="space-y-2">
              {SAFETY_TIPS.map((tip) => (
                <li key={tip} className="flex gap-2 text-sm text-muted">
                  <CheckIcon size={16} className="mt-0.5 shrink-0 text-success" />
                  {tip}
                </li>
              ))}
            </ul>
          </Section>
        </div>

        {/* Sağ kolon — sticky */}
        <div className="lg:col-span-1">
          <div className="space-y-4 lg:sticky lg:top-20">
            <div className="rounded-lg border border-line bg-surface p-5">
              {price ? (
                <p className="text-3xl font-extrabold text-accent">
                  {formatPrice(price.value)}
                  <span className="text-base font-medium text-faint"> /{periodShort}</span>
                </p>
              ) : (
                <p className="text-lg font-semibold text-muted">Fiyat için iletişime geçin</p>
              )}
              <div className="mt-2 flex items-center gap-1.5 text-sm text-muted">
                {listing.transport === "dahil" ? (
                  <><TruckIcon size={15} className="text-success" /> Nakliye fiyata dahil</>
                ) : listing.transport === "ekstra" ? (
                  <><TruckIcon size={15} /> Nakliye ayrıca ücretlendirilir</>
                ) : (
                  <><TruckIcon size={15} /> Nakliye müşteriye aittir</>
                )}
              </div>

              <div className="mt-4 border-t border-line pt-4">
                <RentRequestForm listing={listing} />
              </div>

              <div className="mt-4 border-t border-line pt-4">
                {owner ? (
                  <ContactBox owner={owner} listingId={listing.id} />
                ) : (
                  <p className="text-sm text-faint">İletişim bilgisi yükleniyor…</p>
                )}
              </div>
            </div>

            {owner && <OwnerCard owner={owner} />}
          </div>
        </div>
      </div>

      <SimilarListings listing={listing} />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8 border-t border-line pt-6">
      <h2 className="mb-4 text-lg font-bold uppercase tracking-tight">{title}</h2>
      {children}
    </section>
  );
}
