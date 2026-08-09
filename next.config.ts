import type { NextConfig } from "next";

/**
 * İlan görselleri Supabase Storage'da duruyor ve next/image ile optimize ediliyor.
 * Uzak görsele izin vermek için host'un remotePatterns'te olması şart; host
 * ortamdan türetiliyor ki farklı Supabase projelerinde de çalışsın.
 */
const supabaseHost = (() => {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  if (!raw) return undefined;
  try {
    return new URL(raw).hostname;
  } catch {
    return undefined;
  }
})();

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
  images: {
    remotePatterns: supabaseHost
      ? [
          {
            protocol: "https",
            hostname: supabaseHost,
            pathname: "/storage/v1/object/public/**",
          },
        ]
      : [],
  },
};

export default nextConfig;
