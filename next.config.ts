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
  },
};

export default nextConfig;
