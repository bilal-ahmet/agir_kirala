import { defineConfig } from "drizzle-kit";
import { loadEnvConfig } from "@next/env";

// .env.local dosyasını Next runtime dışında (drizzle-kit CLI) yükle.
loadEnvConfig(process.cwd());

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    // Migration/introspection doğrudan bağlantı üzerinden (pooler değil).
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "",
  },
  casing: "snake_case",
});
