import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LogOut, UserRound } from "lucide-react";
import { getSession } from "@/lib/session";
import { getUserProfile } from "@/lib/queries";
import { logout } from "@/lib/actions/auth";
import { FadeIn } from "@/components/fade-in";
import { PageHeader } from "@/components/page-header";
import { ProfileForm } from "@/components/profile/profile-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const profile =
    (await getUserProfile(session.userId)) ?? { ...session, avatarUrl: null, avatarColor: null };

  return (
    <div className="space-y-6">
      <PageHeader title="Your profile" description="How you appear across CountBook and on receipts." />

      <FadeIn>
        <Card className="glass max-w-2xl">
          <CardHeader className="flex flex-row items-center gap-2">
            <UserRound className="size-4 text-primary" />
            <CardTitle className="text-base">Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <ProfileForm profile={profile} />
          </CardContent>
        </Card>
      </FadeIn>

      <FadeIn delay={0.06}>
        <form action={logout} className="max-w-2xl">
          <Button
            type="submit"
            variant="outline"
            className="h-11 w-full border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive sm:h-9 sm:w-auto"
          >
            <LogOut className="size-4" /> Log out
          </Button>
        </form>
      </FadeIn>
    </div>
  );
}
