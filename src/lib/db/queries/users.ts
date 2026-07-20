import "server-only";

import { eq } from "drizzle-orm";
import { db } from "../index";
import { users } from "../schema";
import type { UserRow } from "../schema";
import { toUser } from "./mappers";

export async function getUser(id: string) {
  const row = await db.query.users.findFirst({ where: eq(users.id, id) });
  return row ? toUser(row) : undefined;
}

/** Auth için ham satır (passwordHash dahil). Yalnızca auth katmanı kullanır. */
export async function getUserRowByEmail(email: string): Promise<UserRow | undefined> {
  return db.query.users.findFirst({ where: eq(users.email, email.trim().toLowerCase()) });
}
