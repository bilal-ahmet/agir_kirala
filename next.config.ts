import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // DB sürücüsü ve bcrypt server tarafında native/CJS olarak dışarıda tutulur (bundle edilmez).
  serverExternalPackages: ["postgres", "bcryptjs"],
  experimental: {
    serverActions: {
      // Medya tek tek yüklenir: görsel en fazla 5 MB, tanıtım videosu en fazla 25 MB
      // (bkz. MAX_VIDEO_BYTES). Multipart payı için üstüne pay bırakılır.
      bodySizeLimit: "30mb",
    },
    // Emniyet payı: proxy ile eşleşen bir isteğin gövdesi belleğe klonlanır ve
    // varsayılan 10MB'ı aşınca sessizce KIRPILIR ("Unexpected end of form" → 500).
    // Yükleme istekleri src/proxy.ts'te matcher ile zaten muaf tutuluyor; bu ayar
    // ileride proxy kapsamına giren büyük bir POST olursa 500 yerine çalışmasını sağlar.
    proxyClientMaxBodySize: "32mb",
  },
};

export default nextConfig;
