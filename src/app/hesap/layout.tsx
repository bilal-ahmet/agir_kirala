"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/context/auth-context";
import { DashboardSidebar } from "@/components/account/DashboardSidebar";

export default function HesapLayout({ children }: { children: React.ReactNode }) {
  const { user, ready } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (ready && !user) {
      router.replace(`/giris?next=${encodeURIComponent(pathname)}`);
    }
  }, [ready, user, pathname, router]);

  if (!ready) {
    return <div className="container-page py-20 text-center text-muted">Yükleniyor…</div>;
  }

  if (!user) {
    return (
      <div className="container-page py-20 text-center text-muted">
        Giriş sayfasına yönlendiriliyorsunuz…
      </div>
    );
  }

  return (
    <div className="container-page py-6 lg:py-8">
      <div className="grid gap-6 lg:grid-cols-[16rem_1fr]">
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <DashboardSidebar />
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
