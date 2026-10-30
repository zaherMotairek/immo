/** Miroir TypeScript de scripts/assert-local-db.mjs (pour les tests unitaires). */

const BLOCKED = ['neon.tech', 'render.com', 'amazonaws.com', 'supabase.co', 'railway.app'];

export function assertLocalDatabaseUrl(
  rawUrl: string | undefined,
  label = 'DATABASE_URL',
): { ok: true; host: string; masked: string } | { ok: false; reason: string; host?: string; masked?: string } {
  if (!rawUrl?.trim()) {
    return { ok: false, reason: `${label} est vide ou absent.` };
  }
  let host = '';
  try {
    host = new URL(rawUrl).hostname.toLowerCase();
  } catch {
    const m = rawUrl.match(/@([^/:?]+)(?::\d+)?\//);
    host = (m?.[1] || '').toLowerCase();
  }
  const masked = rawUrl.replace(/:([^:@/]+)@/, ':****@');
  if (!host) return { ok: false, reason: `Impossible d’extraire l’hôte de ${label}.`, masked };
  const local = host === 'localhost' || host === '127.0.0.1' || host === '::1';
  if (!local) {
    return {
      ok: false,
      reason: `${label} pointe vers « ${host} » — seul localhost est autorisé.`,
      host,
      masked,
    };
  }
  for (const part of BLOCKED) {
    if (host.includes(part)) {
      return { ok: false, reason: `${label} contient « ${part} ».`, host, masked };
    }
  }
  return { ok: true, host, masked };
}
