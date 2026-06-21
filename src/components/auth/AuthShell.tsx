import Link from "next/link";
import { ShieldCheckIcon, CheckIcon } from "@/components/ui/icons";

const POINTS = [
  "Binlerce iş makinesi ve ağır vasıta ilanı",
  "Operatörlü / operatörsüz, esnek kiralama süreleri",
  "Doğrulanmış kurumsal satıcılar",
  "Tek hesapla hem kirala hem kiraya ver",
];

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-[calc(100vh-4rem)] lg:grid-cols-2">
      {/* Marka paneli */}
      <div className="relative hidden flex-col justify-between overflow-hidden border-r border-line bg-surface p-12 lg:flex">
        <div className="bg-grid absolute inset-0 opacity-60" />
        <div className="absolute left-0 top-0 h-1.5 w-full stripe-accent opacity-70" />
        <div className="relative">
          <Link href="/" className="text-2xl font-extrabold uppercase tracking-tight">
            <span className="text-fg">AĞIR</span><span className="text-accent">KİRALA</span>
          </Link>
        </div>
        <div className="relative">
          <h2 className="text-3xl font-bold uppercase leading-tight">
            Sahaya güç katan <span className="text-accent">platform</span>
          </h2>
          <ul className="mt-6 space-y-3">
            {POINTS.map((p) => (
              <li key={p} className="flex items-center gap-3 text-muted">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
                  <CheckIcon size={14} />
                </span>
                {p}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative flex items-center gap-2 text-sm text-faint">
          <ShieldCheckIcon size={16} className="text-success" /> Güvenli ve hızlı kiralama deneyimi
        </p>
      </div>

      {/* Form */}
      <div className="flex items-center justify-center p-6 py-12 lg:p-12">{children}</div>
    </div>
  );
}
