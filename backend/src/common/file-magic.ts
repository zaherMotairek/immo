/**
 * Vérification légère du contenu (magic bytes), indépendante de l’extension / MIME déclaré.
 * Pas de dépendance externe (Phase B3).
 */

const PDF = Buffer.from('%PDF');
const JPEG = Buffer.from([0xff, 0xd8, 0xff]);
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

export type DetectedUploadKind = 'application/pdf' | 'image/jpeg' | 'image/png' | 'image/webp' | null;

export function detectUploadMime(buf: Buffer): DetectedUploadKind {
  if (!buf || buf.length < 4) return null;
  if (buf.subarray(0, 4).equals(PDF)) return 'application/pdf';
  if (buf.length >= 3 && buf.subarray(0, 3).equals(JPEG)) return 'image/jpeg';
  if (buf.subarray(0, 4).equals(PNG)) return 'image/png';
  // RIFF....WEBP
  if (
    buf.length >= 12 &&
    buf.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buf.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'image/webp';
  }
  return null;
}

/** True si le buffer correspond à un des MIME autorisés (et cohérent avec declaredMime si fourni). */
export function assertAllowedUploadMagic(
  buf: Buffer,
  allowed: Set<string>,
  declaredMime?: string,
): { ok: true; mime: string } | { ok: false; reason: string } {
  const detected = detectUploadMime(buf);
  if (!detected || !allowed.has(detected)) {
    return { ok: false, reason: 'Contenu fichier non reconnu (PDF, JPEG, PNG ou WebP requis).' };
  }
  if (declaredMime && declaredMime !== detected) {
    // image/jpg parfois envoyé
    if (!(declaredMime === 'image/jpg' && detected === 'image/jpeg')) {
      return {
        ok: false,
        reason: `Le type déclaré (${declaredMime}) ne correspond pas au contenu réel (${detected}).`,
      };
    }
  }
  return { ok: true, mime: detected };
}
