import type { Metadata } from "next";
import { format } from "date-fns";
import { ShieldCheck, User } from "lucide-react";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { FadeIn } from "@/components/fade-in";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const session = await getSession();
  const isAdmin = session?.role === "ADMIN";
  const users = isAdmin
    ? await db.user.findMany({
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
        },
      })
    : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Your profile and workspace configuration."
      />

      <FadeIn>
        <Card className="glass max-w-2xl">
          <CardHeader className="flex flex-row items-center gap-2">
            <User className="size-4 text-primary" />
            <CardTitle className="text-base">Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Name</span>
              <span className="text-sm font-medium">{session?.name}</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Email</span>
              <span className="text-sm font-medium">{session?.email}</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Role</span>
              <Badge
                className={
                  isAdmin
                    ? "border-transparent bg-primary/15 text-primary"
                    : undefined
                }
                variant={isAdmin ? "outline" : "secondary"}
              >
                {session?.role}
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

      {isAdmin && (
        <FadeIn delay={0.08}>
          <Card className="glass">
            <CardHeader className="flex flex-row items-center gap-2">
              <ShieldCheck className="size-4 text-primary" />
              <CardTitle className="text-base">Team members</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {user.email}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={user.role === "ADMIN" ? "outline" : "secondary"}
                            className={
                              user.role === "ADMIN"
                                ? "border-transparent bg-primary/15 text-primary"
                                : undefined
                            }
                          >
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>{format(user.createdAt, "d MMM yyyy")}</TableCell>
                        <TableCell>
                          {user.isActive ? (
                            <Badge className="border-transparent bg-success/15 text-success">
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="outline">Disabled</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </FadeIn>
      )}
    </div>
  );
}
