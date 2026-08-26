import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    // Entegrasyon testleri gerçek bir Postgres'e yazar; paralel dosyalar
    // birbirinin verisini görmesin diye tek süreçte sırayla koşar.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
  resolve: {
    alias: {
      // `server-only` Node'da import edilince kasten patlar; testlerde boş
      // modüle yönlendiriyoruz (bkz. tests/stubs/server-only.ts).
      "server-only": path.resolve(__dirname, "./tests/stubs/server-only.ts"),
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
