import { Suspense } from "react";
import { verifySession } from "@/lib/auth/session";
import { conversationViewsFor } from "@/lib/db/queries/conversations";
import { MesajlarClient } from "@/components/account/MesajlarClient";

export default async function MesajlarPage() {
  const user = await verifySession();
  const conversations = await conversationViewsFor(user.id);

  return (
    <Suspense fallback={null}>
      <MesajlarClient conversations={conversations} currentUserId={user.id} />
    </Suspense>
  );
}
