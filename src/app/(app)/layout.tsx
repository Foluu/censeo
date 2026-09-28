import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getMajorProducts } from "@/lib/queries";
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

  // Products (and its major-products dropdown) is admin-only.
  const majorProducts = session.role === "ADMIN" ? await getMajorProducts() : [];

  return (
    <AppShell session={session} majorProducts={majorProducts}>
      {children}
    </AppShell>
  );
}
