import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // DB sürücüsü ve bcrypt server tarafında native/CJS olarak dışarıda tutulur (bundle edilmez).
  serverExternalPackages: ["postgres", "bcryptjs"],
  experimental: {
    serverActions: {
      // Görseller tek tek yüklenir; tek istek en fazla 1 dosya (5 MB) + multipart payı taşır.
      // Varsayılan 1 MB olduğundan foto yükleme "Body exceeded 1 MB limit" ile 500 veriyordu.
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
