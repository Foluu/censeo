/** Preset backgrounds for the initials avatar (stored as the key). */
export const AVATAR_COLORS = {
  amber: "from-amber-400 to-amber-600 text-amber-950",
  teal: "from-teal-400 to-teal-600 text-teal-950",
  sky: "from-sky-400 to-sky-600 text-sky-950",
  violet: "from-violet-400 to-violet-600 text-violet-950",
  rose: "from-rose-400 to-rose-600 text-rose-950",
  emerald: "from-emerald-400 to-emerald-600 text-emerald-950",
  slate: "from-slate-500 to-slate-700 text-white",
} as const;

export type AvatarColor = keyof typeof AVATAR_COLORS;

export function isAvatarColor(value: unknown): value is AvatarColor {
  return typeof value === "string" && value in AVATAR_COLORS;
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export type UserProfile = {
  name: string;
  email: string;
  role: "ADMIN" | "STAFF";
  avatarUrl: string | null;
  avatarColor: string | null;
};
