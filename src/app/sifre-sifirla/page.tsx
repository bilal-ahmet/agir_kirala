import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export const metadata: Metadata = {
  title: "Yeni Şifre Belirle",
  robots: { index: false, follow: false },
};

export default function SifreSifirlaPage() {
  return (
    <AuthShell>
      <Suspense fallback={<div className="text-muted">Yükleniyor…</div>}>
        <ResetPasswordForm />
      </Suspense>
    </AuthShell>
  );
}
