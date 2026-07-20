import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const LISTING_PHOTOS_BUCKET = "listing-photos";

let cached: SupabaseClient | null = null;

/** Service-role Supabase istemcisi — yalnızca server (Storage yüklemeleri için). */
export function getSupabaseAdmin(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY tanımlı değil (.env.local).");
  }
  cached = createClient(url, key, { auth: { persistSession: false } });
  return cached;
}
