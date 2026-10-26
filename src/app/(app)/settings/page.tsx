import type { Metadata } from "next";
import Link from "next/link";
import { Pencil, User } from "lucide-react";
import { getSession } from "@/lib/session";
import {
  getBusinessProfile,
  getTeam,
  getUserProfile,
  getWarehouseSummaries,
} from "@/lib/queries";
import { UserAvatar } from "@/components/user-avatar";
import { InstallAppCard } from "@/components/pwa/install-app-card";
import { BusinessProfileForm } from "@/components/settings/business-profile-form";
import { TeamCard } from "@/components/settings/team-card";
import { WarehousesCard } from "@/components/settings/warehouses-card";
import { FadeIn } from "@/components/fade-in";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const session = await getSession();
  const isAdmin = session?.role === "ADMIN";
  const [business, profile, team, warehouses] = await Promise.all([
    getBusinessProfile(),
    session ? getUserProfile(session.userId) : null,
    isAdmin ? getTeam() : [],
    isAdmin ? getWarehouseSummaries() : [],
  ]);
  const name = profile?.name ?? session?.name ?? "";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description={
          isAdmin
            ? "Your profile, business details, team and warehouses."
            : "Your profile and workspace configuration."
        }
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="min-w-0 space-y-6">
          <FadeIn>
            <Card className="glass">
              <CardHeader className="flex flex-row items-center gap-2">
                <User className="size-4 text-primary" />
                <CardTitle className="flex-1 text-base">Profile</CardTitle>
                <Button asChild variant="outline" size="sm">
                  <Link href="/profile">
                    <Pencil className="size-3.5" /> Edit
                  </Link>
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <UserAvatar
                    name={name}
                    avatarUrl={profile?.avatarUrl}
                    avatarColor={profile?.avatarColor}
                    className="size-12 text-sm"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{name}</p>
                    <p className="truncate text-sm text-muted-foreground">{session?.email}</p>
                  </div>
                  <Badge
                    className={isAdmin ? "border-transparent bg-primary/15 text-primary" : undefined}
                    variant={isAdmin ? "outline" : "secondary"}
                  >
                    {isAdmin ? "Admin" : "Salesman"}
                  </Badge>
                </div>
                <Separator />
                <p className="text-xs text-muted-foreground">
                  Use the sun/moon toggle in the top bar to switch between dark and
                  light themes. Your preference is remembered on this device.
                </p>
              </CardContent>
            </Card>
          </FadeIn>

          {isAdmin && session && (
            <FadeIn delay={0.04}>
              <TeamCard members={team} currentUserId={session.userId} />
            </FadeIn>
          )}

          {isAdmin && (
            <FadeIn delay={0.06}>
              <WarehousesCard warehouses={warehouses} />
            </FadeIn>
          )}
        </div>

        <div className="min-w-0 space-y-6">
          <FadeIn delay={0.08}>
            <BusinessProfileForm profile={business} canEdit={isAdmin} />
          </FadeIn>
          <FadeIn delay={0.1}>
            <InstallAppCard />
          </FadeIn>
        </div>
      </div>
    </div>
  );
}
