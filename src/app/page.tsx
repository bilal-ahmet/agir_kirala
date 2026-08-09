import { Hero } from "@/components/home/Hero";
import { CategoryGrid } from "@/components/home/CategoryGrid";
import { ExploreSection } from "@/components/home/ExploreSection";
import { HowItWorks } from "@/components/home/HowItWorks";
import { ListingGrid } from "@/components/listing/ListingGrid";
import { activeListings, countActiveListings } from "@/lib/db/queries/listings";
import { ShieldCheckIcon, TruckIcon, ClockIcon, UserIcon } from "@/components/ui/icons";

const HOME_GRID_SIZE = 9;

const TRUST = [
  { icon: <ShieldCheckIcon />, title: "Bireysel & Kurumsal", text: "Firma da bireysel sahip de aynı platformda." },
  { icon: <UserIcon />, title: "Operatörlü Seçenek", text: "Dilersen operatörüyle birlikte kirala." },
  { icon: <TruckIcon />, title: "Nakliye Çözümü", text: "Makineyi şantiyene kadar getirten ilanlar." },
  { icon: <ClockIcon />, title: "Esnek Süre", text: "Saatlik, günlük, haftalık ve aylık kiralama." },
];

export default async function HomePage() {
  // activeListings zaten "featured desc, createdAt desc" sıralı döner; grid kadarını
  // çekmek yeterli (eskiden 60 ilan + foto + sahip çekilip 51'i atılıyordu).
  const [gridItems, total] = await Promise.all([
    activeListings(HOME_GRID_SIZE),
    countActiveListings(),
  ]);

  return (
    <>
      <Hero />

      {/* Güven şeridi */}
      <section className="border-b border-line bg-surface/40">
        <div className="container-page grid grid-cols-2 lg:grid-cols-4">
          {TRUST.map((t) => (
            <div key={t.title} className="flex items-start gap-3 py-5 pr-4">
              <span className="mt-0.5 text-accent">{t.icon}</span>
              <div>
                <p className="font-semibold leading-tight">{t.title}</p>
                <p className="mt-0.5 text-xs text-muted">{t.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <CategoryGrid />
      <ExploreSection
        initialTotal={total}
        resultsSlot={<ListingGrid listings={gridItems} />}
      />
      <HowItWorks />
    </>
  );
}
