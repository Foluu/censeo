"use client";

import { useState, useTransition } from "react";
import {
  KeyRound,
  MoreVertical,
  Pencil,
  RotateCcw,
  ShieldCheck,
  Trash2,
  UserMinus,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import { deleteMember, setMemberActive } from "@/lib/actions/team";
import { formatNairaCompact } from "@/lib/format";
import type { TeamMember } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MemberDialog, ResetPasswordDialog } from "./member-dialogs";

function DeleteMemberDialog({
  member,
  open,
  onOpenChange,
}: {
  member: TeamMember;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [pending, startTransition] = useTransition();

  function confirm() {
    startTransition(async () => {
      const result = await deleteMember(member.id);
      if (result.ok) {
        toast.success(
          result.outcome === "deactivated"
            ? `${member.name} deactivated — their past sales are kept`
            : `${member.name}'s account was deleted`
        );
        onOpenChange(false);
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete {member.name}?</DialogTitle>
          <DialogDescription>
            {member.hasHistory
              ? `They have ${member.salesCount} sales and other records, so the account will be deactivated instead: they can't sign in, but their name stays on past sales. You can restore them later.`
              : "They have no sales or stock history, so the account will be removed permanently."}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" className="h-11 sm:h-9" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            className="h-11 font-semibold sm:h-9"
            disabled={pending}
            onClick={confirm}
          >
            {pending ? "Working…" : member.hasHistory ? "Deactivate account" : "Delete account"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MemberRow({ member, isYou }: { member: TeamMember; isYou: boolean }) {
  const [dialog, setDialog] = useState<"edit" | "password" | "delete" | null>(null);
  const [pending, startTransition] = useTransition();

  function setActive(active: boolean) {
    startTransition(async () => {
      const result = await setMemberActive(member.id, active);
      if (result.ok) toast.success(active ? `${member.name} restored` : `${member.name} deactivated`);
      else toast.error(result.error);
    });
  }

  return (
    <li className={cn("flex items-center gap-3 py-3", (!member.isActive || pending) && "opacity-60")}>
      <UserAvatar
        name={member.name}
        avatarUrl={member.avatarUrl}
        avatarColor={member.avatarColor}
        className="size-10 text-xs"
      />
      <div className="min-w-0 flex-1">
        <p className="flex min-w-0 items-center gap-1.5">
          <span className="truncate font-medium">{member.name}</span>
          {isYou && <span className="shrink-0 text-xs text-muted-foreground">(you)</span>}
        </p>
        <p className="truncate text-xs text-muted-foreground">{member.email}</p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <Badge
            variant={member.role === "ADMIN" ? "outline" : "secondary"}
            className={member.role === "ADMIN" ? "border-transparent bg-primary/15 text-primary" : undefined}
          >
            {member.role === "ADMIN" ? "Admin" : "Salesman"}
          </Badge>
          {!member.isActive && <Badge variant="outline">Deactivated</Badge>}
          {member.isActive && member.salesCount > 0 && (
            <span className="text-xs text-muted-foreground">
              {member.salesCount} sales · {formatNairaCompact(member.revenueThisMonth)} this month
            </span>
          )}
        </div>
      </div>

      {!isYou && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-9 shrink-0" aria-label={`Manage ${member.name}`}>
              <MoreVertical className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {member.isActive ? (
              <>
                <DropdownMenuItem onSelect={() => setDialog("edit")}>
                  <Pencil className="size-4" /> Edit name & role
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setDialog("password")}>
                  <KeyRound className="size-4" /> Reset password
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setActive(false)}>
                  <UserMinus className="size-4" /> Deactivate
                </DropdownMenuItem>
              </>
            ) : (
              <DropdownMenuItem onSelect={() => setActive(true)}>
                <RotateCcw className="size-4" /> Restore access
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={() => setDialog("delete")}>
              <Trash2 className="size-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {dialog === "edit" && (
        <MemberDialog member={member} open onOpenChange={(o) => !o && setDialog(null)} />
      )}
      {dialog === "password" && (
        <ResetPasswordDialog member={member} open onOpenChange={(o) => !o && setDialog(null)} />
      )}
      {dialog === "delete" && (
        <DeleteMemberDialog member={member} open onOpenChange={(o) => !o && setDialog(null)} />
      )}
    </li>
  );
}

export function TeamCard({ members, currentUserId }: { members: TeamMember[]; currentUserId: string }) {
  const [adding, setAdding] = useState(false);
  const active = members.filter((m) => m.isActive);
  const inactive = members.filter((m) => !m.isActive);

  return (
    <Card className="glass">
      <CardHeader className="flex flex-row flex-wrap items-center gap-2">
        <ShieldCheck className="size-4 text-primary" />
        <CardTitle className="flex-1 text-base">Team</CardTitle>
        <Button size="sm" onClick={() => setAdding(true)} className="font-semibold">
          <UserPlus className="size-4" /> Add member
        </Button>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          {active.filter((m) => m.role === "STAFF").length} salesmen ·{" "}
          {active.filter((m) => m.role === "ADMIN").length} admins
        </p>
        <ul className="divide-y divide-border/60">
          {active.map((member) => (
            <MemberRow key={member.id} member={member} isYou={member.id === currentUserId} />
          ))}
        </ul>
        {inactive.length > 0 && (
          <>
            <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Deactivated
            </p>
            <ul className="divide-y divide-border/60">
              {inactive.map((member) => (
                <MemberRow key={member.id} member={member} isYou={false} />
              ))}
            </ul>
          </>
        )}
      </CardContent>
      <MemberDialog open={adding} onOpenChange={setAdding} />
    </Card>
  );
}
