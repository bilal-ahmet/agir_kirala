import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // DB sürücüsü ve bcrypt server tarafında native/CJS olarak dışarıda tutulur (bundle edilmez).
  serverExternalPackages: ["postgres", "bcryptjs"],
  // Not: serverActions.bodySizeLimit BİLEREK varsayılanda (1 MB) bırakıldı.
  // Medya dosyaları artık server action gövdesinde taşınmıyor; tarayıcıdan
  // doğrudan Supabase Storage'a gidiyor (src/lib/actions/uploads.ts).
  // Limiti yükseltmek Vercel'de zaten işe yaramıyordu: Serverless Function
  // istek gövdesi 4.5 MB ile platform tarafında sabit sınırlı.
};

export default nextConfig;
