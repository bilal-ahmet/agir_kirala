import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getListingById, similarListings } from "@/lib/db/queries/listings";
import { getUser } from "@/lib/db/queries/users";
import { reviewsForUser } from "@/lib/db/queries/reviews";
import { ListingDetail } from "@/components/listing/ListingDetail";

// getListingById React cache()'li: aşağıdaki sayfa aynı ilanı tekrar sorgulamaz.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const listing = await getListingById(id);
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
  const listing = await getListingById(id);
  if (!listing) notFound();

  const [owner, similar, reviews] = await Promise.all([
    getUser(listing.ownerId),
    similarListings(listing, 3),
    reviewsForUser(listing.ownerId),
  ]);
  return <ListingDetail listing={listing} owner={owner} similar={similar} reviews={reviews} />;
}
