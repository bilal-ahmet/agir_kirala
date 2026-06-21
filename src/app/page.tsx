import { Hero } from "@/components/home/Hero";
import { CategoryGrid } from "@/components/home/CategoryGrid";
import { FeaturedListings } from "@/components/home/FeaturedListings";
import { HowItWorks } from "@/components/home/HowItWorks";
import { ShieldCheckIcon, TruckIcon, ClockIcon, UserIcon } from "@/components/ui/icons";

const TRUST = [
  { icon: <ShieldCheckIcon />, title: "Doğrulanmış Firmalar", text: "Kurumsal satıcılar kimlik doğrulamasından geçer." },
  { icon: <UserIcon />, title: "Operatörlü Seçenek", text: "Dilersen operatörüyle birlikte kirala." },
  { icon: <TruckIcon />, title: "Nakliye Çözümü", text: "Makineyi şantiyene kadar getirten ilanlar." },
  { icon: <ClockIcon />, title: "Esnek Süre", text: "Saatlik, günlük, haftalık ve aylık kiralama." },
];

export default function HomePage() {
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
      <FeaturedListings />
      <HowItWorks />
    </>
  );
}
