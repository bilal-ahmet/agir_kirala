import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { RegisterForm } from "@/components/auth/RegisterForm";

export const metadata: Metadata = {
  title: "Kayıt Ol",
};

export default function KayitPage() {
  return (
    <AuthShell>
      <Suspense fallback={<div className="text-muted">Yükleniyor…</div>}>
        <RegisterForm />
      </Suspense>
    </AuthShell>
  );
}
