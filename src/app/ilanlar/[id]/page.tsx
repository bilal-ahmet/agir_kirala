import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { similarListings } from "@/lib/db/queries/listings";
import { getUser } from "@/lib/db/queries/users";
import { reviewsForUser } from "@/lib/db/queries/reviews";
import { getListingForViewer } from "@/lib/core/listings";
import { getCurrentUser } from "@/lib/auth/session";
import { ListingDetail } from "@/components/listing/ListingDetail";

/**
 * Görünürlük kuralı core'da: aktif olmayan ilan yalnız sahibine açılır.
 * Eskiden statüye hiç bakılmıyordu — UUID'yi bilen herkes başkasının taslak
 * ilanını fiyatı ve açıklamasıyla okuyabiliyordu. /api/v1 ile aynı kural.
 * (getListingById + getCurrentUser React cache()'li: tekrar sorgu yapılmaz.)
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const user = await getCurrentUser();
  const listing = await getListingForViewer(id, user?.id);
  if (!listing) return { title: "İlan" };
  return {
    title: listing.title,
    description: listing.description.slice(0, 155),
  };
}

export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  const listing = await getListingForViewer(id, user?.id);
  if (!listing) notFound();

  const [owner, similar, reviews] = await Promise.all([
    getUser(listing.ownerId),
    similarListings(listing, 3),
    reviewsForUser(listing.ownerId),
  ]);
  return <ListingDetail listing={listing} owner={owner} similar={similar} reviews={reviews} />;
}
