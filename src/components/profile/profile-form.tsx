"use client";

import { useRef, useState, useTransition } from "react";
import { Camera, Check, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { updateProfile } from "@/lib/actions/profile";
import { AVATAR_COLORS, isAvatarColor, type AvatarColor, type UserProfile } from "@/lib/avatar";
import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/user-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const AVATAR_SIZE = 256;

/** Centre-crops and downsizes a photo to a small JPEG data URL. */
async function resizeImage(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = AVATAR_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.drawImage(
    bitmap,
    (bitmap.width - side) / 2,
    (bitmap.height - side) / 2,
    side,
    side,
    0,
    0,
    AVATAR_SIZE,
    AVATAR_SIZE
  );
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.85);
}

export function ProfileForm({ profile }: { profile: UserProfile }) {
  const [name, setName] = useState(profile.name);
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl);
  const [avatarColor, setAvatarColor] = useState<AvatarColor>(
    isAvatarColor(profile.avatarColor) ? profile.avatarColor : "amber"
  );
  const [pending, startTransition] = useTransition();
  const fileInput = useRef<HTMLInputElement>(null);

  const dirty =
    name.trim() !== profile.name ||
    avatarUrl !== profile.avatarUrl ||
    avatarColor !== (profile.avatarColor ?? "amber");

  async function onFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Choose an image file");
    if (file.size > 15 * 1024 * 1024) return toast.error("That image is over 15 MB");
    try {
      setAvatarUrl(await resizeImage(file));
    } catch {
      toast.error("Couldn't read that image — try a JPEG or PNG");
    }
  }

  function save() {
    if (name.trim().length < 2) return toast.error("Enter your name");
    startTransition(async () => {
      const result = await updateProfile({ name: name.trim(), avatarUrl, avatarColor });
      if (result.ok) toast.success("Profile updated");
      else toast.error(result.error);
    });
  }

  return (
    <div className="space-y-6">
      {/* Avatar */}
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
        <div className="relative">
          <UserAvatar
            name={name || profile.name}
            avatarUrl={avatarUrl}
            avatarColor={avatarColor}
            className="size-24 text-2xl ring-4 ring-background"
          />
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            aria-label="Upload photo"
            className="absolute -bottom-1 -right-1 flex size-9 items-center justify-center rounded-full border-2 border-background bg-primary text-primary-foreground shadow-md transition-transform active:scale-95"
          >
            <Camera className="size-4" />
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onFile}
          />
        </div>
        <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
          <Button type="button" variant="outline" size="sm" onClick={() => fileInput.current?.click()}>
            <Camera className="size-4" /> {avatarUrl ? "Change photo" : "Upload photo"}
          </Button>
          {avatarUrl && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setAvatarUrl(null)}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="size-4" /> Remove photo
            </Button>
          )}
        </div>
      </div>

      {!avatarUrl && (
        <div className="space-y-2">
          <Label>Initials colour</Label>
          <div className="flex flex-wrap gap-2.5">
            {(Object.keys(AVATAR_COLORS) as AvatarColor[]).map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setAvatarColor(color)}
                aria-label={color}
                aria-pressed={avatarColor === color}
                className={cn(
                  "flex size-9 items-center justify-center rounded-full bg-gradient-to-br ring-offset-2 ring-offset-background transition-shadow",
                  AVATAR_COLORS[color],
                  avatarColor === color && "ring-2 ring-primary"
                )}
              >
                {avatarColor === color && <Check className="size-4" />}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="profile-name">Display name</Label>
          <Input
            id="profile-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            className="h-10 md:h-9"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="profile-email">Email</Label>
          <Input id="profile-email" value={profile.email} disabled className="h-10 md:h-9" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="profile-role">Role</Label>
          <Input
            id="profile-role"
            value={profile.role === "ADMIN" ? "Administrator" : "Staff"}
            disabled
            className="h-10 md:h-9"
          />
        </div>
        <p className="text-xs text-muted-foreground sm:col-span-2">
          Email and role are managed by an administrator.
        </p>
      </div>

      <Button
        onClick={save}
        disabled={pending || !dirty}
        className="h-11 w-full font-semibold sm:h-9 sm:w-auto"
      >
        {pending ? "Saving…" : "Save profile"}
      </Button>
    </div>
  );
}
