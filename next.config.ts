import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // DB sürücüsü ve bcrypt server tarafında native/CJS olarak dışarıda tutulur (bundle edilmez).
  serverExternalPackages: ["postgres", "bcryptjs"],
};

export default nextConfig;
