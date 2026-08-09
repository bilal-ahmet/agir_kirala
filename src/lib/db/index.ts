import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL tanımlı değil (.env.local).");
}

// Next dev hot-reload'da bağlantı havuzunun çoğalmasını önlemek için global cache.
const globalForDb = globalThis as unknown as {
  __pgClient?: ReturnType<typeof postgres>;
};

// Supabase transaction pooler ile prepared statement kullanılamaz → prepare: false.
const client =
  globalForDb.__pgClient ??
  postgres(connectionString, { prepare: false });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__pgClient = client;
}

export const db = drizzle(client, {
  schema,
  casing: "snake_case",
  logger: process.env.DB_LOG === "1",
});

export { schema };
