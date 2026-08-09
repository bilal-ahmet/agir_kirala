import "server-only";

import { cache } from "react";
import { eq } from "drizzle-orm";
import { db } from "../index";
import { users } from "../schema";
import type { UserRow } from "../schema";
import { toUser } from "./mappers";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Tek kullanıcı. Aynı istekte birden çok yerden çağrıldığı için cache'li. */
export const getUser = cache(async (id: string) => {
  if (!UUID_RE.test(id)) return undefined;
  const row = await db.query.users.findFirst({ where: eq(users.id, id) });
  return row ? toUser(row) : undefined;
});

/** Auth için ham satır (passwordHash dahil). Yalnızca auth katmanı kullanır. */
export async function getUserRowByEmail(email: string): Promise<UserRow | undefined> {
  return db.query.users.findFirst({ where: eq(users.email, email.trim().toLowerCase()) });
}
