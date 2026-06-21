import Link from "next/link";
import { Logo } from "./Logo";
import { CATEGORIES } from "@/lib/categories";

export function Footer() {
  const popular = CATEGORIES.slice(0, 8);

  return (
    <footer className="mt-auto border-t border-line bg-surface">
      <div className="stripe-accent h-1.5 w-full opacity-80" />
      <div className="container-page grid gap-10 py-12 md:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-4">
          <Logo />
          <p className="max-w-xs text-sm text-muted">
            Ağır vasıta ve iş makinelerini güvenle kiralayın veya kendi makinenizi kiraya verin.
            Operatörlü ve operatörsüz, binlerce ilan tek platformda.
          </p>
        </div>

        <div>
          <h4 className="mb-3 text-sm font-bold uppercase tracking-wide text-fg">Popüler Kategoriler</h4>
          <ul className="space-y-2 text-sm">
            {popular.map((c) => (
              <li key={c.slug}>
                <Link href={`/ilanlar?kategori=${c.slug}`} className="text-muted hover:text-accent">
                  {c.name} Kiralama
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="mb-3 text-sm font-bold uppercase tracking-wide text-fg">Kurumsal</h4>
          <ul className="space-y-2 text-sm text-muted">
            <li><Link href="/#nasil-calisir" className="hover:text-accent">Nasıl Çalışır?</Link></li>
            <li><Link href="/ilanlar" className="hover:text-accent">Tüm İlanlar</Link></li>
            <li><Link href="/hesap/ilan-ekle" className="hover:text-accent">İlan Ver</Link></li>
            <li><span className="cursor-default">Hakkımızda</span></li>
            <li><span className="cursor-default">İletişim</span></li>
          </ul>
        </div>

        <div>
          <h4 className="mb-3 text-sm font-bold uppercase tracking-wide text-fg">Güven & Destek</h4>
          <ul className="space-y-2 text-sm text-muted">
            <li><span className="cursor-default">Güvenli Kiralama</span></li>
            <li><span className="cursor-default">Doğrulanmış Firmalar</span></li>
            <li><span className="cursor-default">Sıkça Sorulan Sorular</span></li>
            <li><span className="cursor-default">Kullanım Şartları</span></li>
            <li><span className="cursor-default">Gizlilik Politikası</span></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-line">
        <div className="container-page flex flex-col items-center justify-between gap-2 py-5 text-xs text-faint sm:flex-row">
          <p>© {new Date().getFullYear()} AĞIRKİRALA. Tüm hakları saklıdır.</p>
          <p>Demo amaçlı geliştirilmiş frontend uygulamasıdır.</p>
        </div>
      </div>
    </footer>
  );
}
