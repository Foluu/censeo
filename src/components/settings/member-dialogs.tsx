"use client";

import { useState, useTransition } from "react";
import { Eye, EyeOff, Wand2 } from "lucide-react";
import { toast } from "sonner";
import {
  createMember,
  resetMemberPassword,
  updateMember,
} from "@/lib/actions/team";
import type { TeamMember } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Role = "ADMIN" | "STAFF";

/** Readable temporary password, e.g. "Mango-4827-Tide". */
function generatePassword() {
  const words = ["Mango", "River", "Cedar", "Tide", "Amber", "Falcon", "Lagos", "Kola", "Ember", "Orbit", "Palm", "Delta"];
  const pick = () => words[crypto.getRandomValues(new Uint32Array(1))[0] % words.length];
  const digits = String(crypto.getRandomValues(new Uint32Array(1))[0] % 10000).padStart(4, "0");
  return `${pick()}-${digits}-${pick()}`;
}

function PasswordField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Input
            id={id}
            type={visible ? "text" : "password"}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            autoComplete="new-password"
            className="h-10 pr-10 font-mono md:h-9"
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? "Hide password" : "Show password"}
            className="absolute right-1 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
          >
            {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
        <Button
          type="button"
          variant="outline"
          className="h-10 shrink-0 md:h-9"
          onClick={() => {
            onChange(generatePassword());
            setVisible(true);
          }}
        >
          <Wand2 className="size-4" /> <span className="max-sm:sr-only">Generate</span>
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        At least 8 characters. Share it with them privately; they sign in with their email.
      </p>
    </div>
  );
}

function RolePicker({ value, onChange }: { value: Role; onChange: (role: Role) => void }) {
  const options: { value: Role; title: string; detail: string }[] = [
    { value: "STAFF", title: "Salesman", detail: "Sales, stock, customers" },
    { value: "ADMIN", title: "Admin", detail: "Everything, incl. team" },
  ];
  return (
    <div className="space-y-2">
      <Label>Role</Label>
      <div className="grid grid-cols-2 gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
            className={cn(
              "rounded-xl border p-3 text-left transition-colors",
              value === option.value
                ? "border-primary bg-primary/10"
                : "border-border hover:border-primary/50"
            )}
          >
            <span className="block text-sm font-medium">{option.title}</span>
            <span className="block text-xs text-muted-foreground">{option.detail}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function MemberDialog({
  member,
  open,
  onOpenChange,
}: {
  /** Omit to create a new account. */
  member?: TeamMember;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const editing = !!member;
  const [name, setName] = useState(member?.name ?? "");
  const [email, setEmail] = useState(member?.email ?? "");
  const [role, setRole] = useState<Role>(member?.role ?? "STAFF");
  const [password, setPassword] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    if (name.trim().length < 2) return toast.error("Enter the person's name");
    if (!editing && !email.includes("@")) return toast.error("Enter a valid email address");
    if (!editing && password.length < 8) return toast.error("Password must be at least 8 characters");
    startTransition(async () => {
      const result = editing
        ? await updateMember(member.id, { name, role })
        : await createMember({ name, email, role, password });
      if (result.ok) {
        toast.success(editing ? "Account updated" : `${name.trim()} can now sign in`);
        if (!editing) {
          setName("");
          setEmail("");
          setRole("STAFF");
          setPassword("");
        }
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
          <DialogTitle>{editing ? `Edit ${member.name}` : "Add a team member"}</DialogTitle>
          <DialogDescription>
            {editing
              ? "Change their name or what they can access."
              : "Create a sign-in for a salesman or another admin."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="m-name">Full name</Label>
            <Input
              id="m-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Chidi Okafor"
              autoComplete="off"
              className="h-10 md:h-9"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="m-email">Email (used to sign in)</Label>
            <Input
              id="m-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="chidi@yourshop.ng"
              autoComplete="off"
              disabled={editing}
              className="h-10 md:h-9"
            />
          </div>
          <RolePicker value={role} onChange={setRole} />
          {!editing && (
            <PasswordField id="m-password" label="Temporary password" value={password} onChange={setPassword} />
          )}
          <Button onClick={submit} disabled={pending} className="h-11 w-full font-semibold sm:h-9">
            {pending ? "Saving…" : editing ? "Save changes" : "Create account"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ResetPasswordDialog({
  member,
  open,
  onOpenChange,
}: {
  member: TeamMember;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [password, setPassword] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    if (password.length < 8) return toast.error("Password must be at least 8 characters");
    startTransition(async () => {
      const result = await resetMemberPassword(member.id, password);
      if (result.ok) {
        toast.success(`Password changed for ${member.name}`);
        setPassword("");
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
          <DialogTitle>Reset password</DialogTitle>
          <DialogDescription>
            Set a new password for {member.name} ({member.email}).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <PasswordField id="r-password" label="New password" value={password} onChange={setPassword} />
          <Button onClick={submit} disabled={pending} className="h-11 w-full font-semibold sm:h-9">
            {pending ? "Saving…" : "Set new password"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
