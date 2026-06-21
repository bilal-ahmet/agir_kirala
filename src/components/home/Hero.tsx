import Link from "next/link";
import { SearchBar } from "./SearchBar";
import { CATEGORIES } from "@/lib/categories";
import { activeListings } from "@/lib/data/listings";

const QUICK = ["ekskavator", "vinc", "forklift", "kamyon", "manlift"];

export function Hero() {
  const quickCats = QUICK.map((s) => CATEGORIES.find((c) => c.slug === s)!).filter(Boolean);
  const total = activeListings().length;

  return (
    <section className="relative overflow-hidden border-b border-line bg-base">
      <div className="bg-grid absolute inset-0 opacity-100" />
      <div className="absolute -right-40 -top-40 h-96 w-96 rounded-full bg-accent/10 blur-3xl" />
      <div className="absolute left-0 top-0 h-1.5 w-full stripe-accent opacity-70" />

      <div className="container-page relative py-16 lg:py-24">
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-xs font-semibold text-muted">
            <span className="h-2 w-2 rounded-full bg-success" />
            {total}+ aktif ilan · Operatörlü & operatörsüz
          </span>
          <h1 className="mt-5 text-4xl font-bold uppercase leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
            İş Makinesi ve <span className="text-accent">Ağır Vasıta</span> Kiralama
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-muted">
            Ekskavatörden vince, forklifttten kamyona; ihtiyacın olan makineyi bul, güvenle kirala.
            Elindeki makineyi kiraya vererek kazanca dönüştür.
          </p>
        </div>

        <SearchBar className="mt-8 max-w-4xl" />

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <span className="text-sm text-faint">Popüler:</span>
          {quickCats.map((c) => (
            <Link
              key={c.slug}
              href={`/ilanlar?kategori=${c.slug}`}
              className="rounded-full border border-line bg-surface px-3 py-1 text-sm text-muted transition-colors hover:border-accent/40 hover:text-accent"
            >
              {c.icon} {c.name}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
