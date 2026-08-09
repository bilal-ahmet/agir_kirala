import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Şifremi Unuttum",
  robots: { index: false, follow: false },
};

export default function SifremiUnuttumPage() {
  return (
    <AuthShell>
      <Suspense fallback={<div className="text-muted">Yükleniyor…</div>}>
        <ForgotPasswordForm />
      </Suspense>
    </AuthShell>
  );
}
