import { verifySession } from "@/lib/auth/session";
import { pendingIncomingCount } from "@/lib/db/queries/requests";
import { conversationCount } from "@/lib/db/queries/conversations";
import { DashboardSidebar } from "@/components/account/DashboardSidebar";

export default async function HesapLayout({ children }: { children: React.ReactNode }) {
  // proxy.ts optimistik koruma sağlar; burada gerçek oturum doğrulanır.
  const user = await verifySession();
  const [pending, convos] = await Promise.all([
    pendingIncomingCount(user.id),
    conversationCount(user.id),
  ]);

  return (
    <div className="container-page py-6 lg:py-8">
      <div className="grid gap-6 lg:grid-cols-[16rem_1fr]">
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <DashboardSidebar pendingIncoming={pending} conversationCount={convos} />
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
