import Link from "next/link";
import { buttonClasses } from "@/components/ui/Button";
import { SearchIcon, MessageIcon, CheckIcon, PlusIcon, InboxIcon, ShieldCheckIcon } from "@/components/ui/icons";

const RENT_STEPS = [
  { icon: <SearchIcon />, title: "Ara & Filtrele", text: "Kategori, konum, fiyat ve teknik özelliklere göre uygun makineyi bul." },
  { icon: <MessageIcon />, title: "Talep Gönder", text: "Tarih aralığını seç, ilan sahibine kiralama talebi ya da mesaj gönder." },
  { icon: <CheckIcon />, title: "Anlaş & Kirala", text: "Operatörlü/operatörsüz ve nakliye detaylarını netleştir, işe başla." },
];

const LIST_STEPS = [
  { icon: <PlusIcon />, title: "İlanını Oluştur", text: "Kategoriye özel formla makinenin özelliklerini ve fiyatını gir." },
  { icon: <InboxIcon />, title: "Talepleri Yönet", text: "Gelen kiralama taleplerini panelinden onayla veya reddet." },
  { icon: <ShieldCheckIcon />, title: "Kazanca Dönüştür", text: "Boştaki makineni kiraya vererek düzenli gelir elde et." },
];

export function HowItWorks() {
  return (
    <section id="nasil-calisir" className="container-page scroll-mt-20 py-16">
      <div className="mx-auto mb-12 max-w-2xl text-center">
        <h2 className="text-2xl font-bold uppercase tracking-tight sm:text-3xl">Nasıl Çalışır?</h2>
        <p className="mt-2 text-muted">
          Tek hesapla hem kiralayabilir hem kiraya verebilirsin. Ayrı satıcı/alıcı hesabına gerek yok.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Column badge="Kiralamak İçin" badgeTone="accent" steps={RENT_STEPS} />
        <Column badge="Kiraya Vermek İçin" badgeTone="info" steps={LIST_STEPS} />
      </div>

      <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Link href="/ilanlar" className={buttonClasses("accent", "lg")}>
          Makine Kirala
        </Link>
        <Link href="/hesap/ilan-ekle" className={buttonClasses("outline", "lg")}>
          Ücretsiz İlan Ver
        </Link>
      </div>
    </section>
  );
}

function Column({
  badge,
  badgeTone,
  steps,
}: {
  badge: string;
  badgeTone: "accent" | "info";
  steps: { icon: React.ReactNode; title: string; text: string }[];
}) {
  return (
    <div className="rounded-xl border border-line bg-surface p-6">
      <span
        className={
          badgeTone === "accent"
            ? "inline-block rounded bg-accent-soft px-3 py-1 text-sm font-bold uppercase tracking-wide text-accent"
            : "inline-block rounded bg-info-soft px-3 py-1 text-sm font-bold uppercase tracking-wide text-info"
        }
      >
        {badge}
      </span>
      <ol className="mt-5 space-y-5">
        {steps.map((s, i) => (
          <li key={i} className="flex gap-4">
            <div className="relative">
              <div className="grid h-11 w-11 place-items-center rounded-lg border border-line bg-surface-2 text-accent">
                {s.icon}
              </div>
              <span className="absolute -left-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-accent text-[11px] font-bold text-accent-fg">
                {i + 1}
              </span>
            </div>
            <div>
              <h4 className="font-semibold">{s.title}</h4>
              <p className="mt-0.5 text-sm text-muted">{s.text}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
