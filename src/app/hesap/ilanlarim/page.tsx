import { Suspense } from "react";
import { verifySession } from "@/lib/auth/session";
import { myListings } from "@/lib/db/queries/listings";
import { IlanlarimClient } from "@/components/account/IlanlarimClient";

export default async function IlanlarimPage() {
  const user = await verifySession();
  const listings = await myListings(user.id);

  // useSearchParams içeren client bileşen Suspense sınırı ister.
  return (
    <Suspense fallback={null}>
      <IlanlarimClient allListings={listings} />
    </Suspense>
  );
}
