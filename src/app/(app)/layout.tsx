import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getMajorProducts, getUserProfile } from "@/lib/queries";
import { AppShell } from "@/components/app-shell";

// All pages under this layout render live data per request.
export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const [stored, majorProducts] = await Promise.all([
    getUserProfile(session.userId),
    // Products (and its major-products dropdown) is admin-only.
    session.role === "ADMIN" ? getMajorProducts() : Promise.resolve([]),
  ]);
  // Fall back to the token's details rather than redirecting: the proxy would
  // bounce a cookie-holding request from /login straight back here (a loop).
  const profile = stored ?? { ...session, avatarUrl: null, avatarColor: null };

  return (
    <AppShell session={session} profile={profile} majorProducts={majorProducts}>
      {children}
    </AppShell>
  );
}
