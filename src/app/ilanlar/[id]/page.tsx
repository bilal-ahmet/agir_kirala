import type { Metadata } from "next";
import { getListing } from "@/lib/data/listings";
import { getUser } from "@/lib/data/users";
import { ListingDetail } from "@/components/listing/ListingDetail";
import { LocalListingDetailLoader } from "@/components/listing/LocalListingDetailLoader";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const listing = getListing(id);
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
  const listing = getListing(id);

  // Tohum veride yoksa kullanıcının yerel oluşturduğu ilan olabilir → client yükleyici
  if (!listing) return <LocalListingDetailLoader id={id} />;

  const owner = getUser(listing.ownerId);
  return <ListingDetail listing={listing} owner={owner} />;
}
