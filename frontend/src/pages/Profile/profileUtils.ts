/** Initiales affichées sur le bandeau profil (prénom + nom, sinon 2 premiers caractères). */
export function initialsFromDisplay(displayName: string, email: string): string {
  const n = displayName.trim() || email.trim() || '?';
  const parts = n.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
  return n.slice(0, 2).toUpperCase();
}
