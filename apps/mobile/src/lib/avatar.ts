/** Client-side fallback avatar: initials from the display name. */

const HUES = [12, 28, 160, 188, 220, 262, 328];

export function displayInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase();
  }
  const compact = (parts[0] ?? name).replace(/\s+/g, "");
  return compact.slice(0, 2).toUpperCase() || "?";
}

export function avatarColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  const hue = HUES[Math.abs(hash) % HUES.length];
  return `hsl(${hue}, 42%, 42%)`;
}
