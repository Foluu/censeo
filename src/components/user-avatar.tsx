import { AVATAR_COLORS, initials, isAvatarColor } from "@/lib/avatar";
import { cn } from "@/lib/utils";

export function UserAvatar({
  name,
  avatarUrl,
  avatarColor,
  className,
}: {
  name: string;
  avatarUrl?: string | null;
  avatarColor?: string | null;
  /** Size via Tailwind, e.g. "size-9 text-xs". */
  className?: string;
}) {
  if (avatarUrl) {
    return (
      // Small inline data: URL — next/image adds nothing here.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={name}
        className={cn("size-9 shrink-0 rounded-full object-cover", className)}
      />
    );
  }
  const palette = AVATAR_COLORS[isAvatarColor(avatarColor) ? avatarColor : "amber"];
  return (
    <span
      aria-label={name}
      className={cn(
        "flex size-9 shrink-0 select-none items-center justify-center rounded-full bg-gradient-to-br text-xs font-bold",
        palette,
        className
      )}
    >
      {initials(name)}
    </span>
  );
}
