import Link from "next/link";
import { buttonClasses } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="container-page flex min-h-[60vh] flex-col items-center justify-center text-center">
      <p className="text-7xl font-extrabold text-accent">404</p>
      <h1 className="mt-4 text-2xl font-bold uppercase tracking-tight">Sayfa Bulunamadı</h1>
      <p className="mt-2 max-w-md text-muted">
        Aradığınız sayfa taşınmış veya hiç var olmamış olabilir. Aşağıdan devam edebilirsiniz.
      </p>
      <div className="mt-6 flex gap-3">
        <Link href="/" className={buttonClasses("accent", "md")}>Ana Sayfa</Link>
        <Link href="/ilanlar" className={buttonClasses("outline", "md")}>İlanlara Göz At</Link>
      </div>
    </div>
  );
}
