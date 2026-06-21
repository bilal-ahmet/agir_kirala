import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Giriş Yap",
};

export default function GirisPage() {
  return (
    <AuthShell>
      <Suspense fallback={<div className="text-muted">Yükleniyor…</div>}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
