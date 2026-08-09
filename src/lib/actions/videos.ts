"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { listings } from "../db/schema";
import { verifySession } from "../auth/session";
import { getSupabaseAdmin, LISTING_VIDEOS_BUCKET } from "../supabase";

// Video YÜKLEME artık burada değil: dosya tarayıcıdan doğrudan Supabase'e gider
// (src/lib/actions/uploads.ts + src/lib/upload-client.ts). Sebebi Vercel
// Serverless Function'lardaki 4.5 MB'lık sabit istek gövdesi sınırı — 15 MB'lık
// bir video server action üzerinden hiçbir zaman geçemiyordu.

/** İlan videosunu siler (Storage + DB). Yalnızca ilan sahibi. */
export async function deleteListingVideoAction(listingId: string): Promise<{ error?: string }> {
  const user = await verifySession();

  const listing = await db.query.listings.findFirst({
    where: and(eq(listings.id, listingId), eq(listings.ownerId, user.id)),
    columns: { id: true, videoPath: true },
  });
  if (!listing) return { error: "İlan bulunamadı veya yetkiniz yok." };

  if (listing.videoPath) {
    await getSupabaseAdmin().storage.from(LISTING_VIDEOS_BUCKET).remove([listing.videoPath]);
  }
  await db
    .update(listings)
    .set({ videoUrl: null, videoPath: null, updatedAt: new Date() })
    .where(eq(listings.id, listingId));

  revalidatePath(`/ilanlar/${listingId}`);
  revalidatePath("/hesap/ilanlarim");
  return {};
}
