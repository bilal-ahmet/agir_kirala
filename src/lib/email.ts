import "server-only";

import { Resend } from "resend";

let cached: Resend | null = null;

function getResend(): Resend {
  if (cached) return cached;
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    throw new Error("RESEND_API_KEY tanımlı değil (.env.local). E-posta gönderilemiyor.");
  }
  cached = new Resend(key);
  return cached;
}

function fromAddress(): string {
  const from = process.env.EMAIL_FROM;
  if (!from) {
    throw new Error("EMAIL_FROM tanımlı değil (.env.local). Örn: AğırKirala <no-reply@alan.com>");
  }
  return from;
}

/** HTML gövdesine kullanıcı verisi girmiyor ama yine de kaçış uygulanır. */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Şifre sıfırlama bağlantısını e-postayla gönderir. */
export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  const url = escapeHtml(resetUrl);
  const { error } = await getResend().emails.send({
    from: fromAddress(),
    to,
    subject: "Şifre sıfırlama — AĞIRKİRALA",
    text: [
      "Merhaba,",
      "",
      "AĞIRKİRALA hesabınız için şifre sıfırlama talebinde bulunuldu.",
      "Yeni şifrenizi belirlemek için aşağıdaki bağlantıyı açın (1 saat geçerlidir):",
      "",
      resetUrl,
      "",
      "Bu talebi siz yapmadıysanız bu e-postayı yok sayabilirsiniz; şifreniz değişmez.",
    ].join("\n"),
    html: `
      <div style="font-family:system-ui,-apple-system,Segoe UI,Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#18181b">
        <h1 style="font-size:20px;margin:0 0 16px">Şifre sıfırlama</h1>
        <p style="margin:0 0 12px;line-height:1.6">
          AĞIRKİRALA hesabınız için şifre sıfırlama talebinde bulunuldu.
          Yeni şifrenizi belirlemek için aşağıdaki düğmeye tıklayın.
          Bağlantı <strong>1 saat</strong> geçerlidir.
        </p>
        <p style="margin:24px 0">
          <a href="${url}" style="display:inline-block;background:#f5b100;color:#1a1400;font-weight:700;text-decoration:none;padding:12px 20px;border-radius:8px">
            Yeni şifre belirle
          </a>
        </p>
        <p style="margin:0 0 12px;font-size:13px;color:#52525b;line-height:1.6">
          Düğme çalışmazsa bu adresi tarayıcınıza yapıştırın:<br />
          <span style="word-break:break-all">${url}</span>
        </p>
        <p style="margin:16px 0 0;font-size:13px;color:#8a8a93;line-height:1.6">
          Bu talebi siz yapmadıysanız bu e-postayı yok sayabilirsiniz; şifreniz değişmez.
        </p>
      </div>
    `,
  });

  if (error) throw new Error(error.message);
}
