/** Types autorisés pour le contrat de bail (scan PDF ou photo). */
export const LEASE_CONTRACT_ALLOWED_MIMES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

export const LEASE_CONTRACT_MIME_TO_EXT: Record<string, string> = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

export const LEASE_CONTRACT_MAX_BYTES = 15 * 1024 * 1024;
