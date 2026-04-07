/** CNI, passeport, titre de séjour : PDF ou photo (aligné sur les contrats de bail). */
export const TENANT_ID_DOC_ALLOWED_MIMES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

export const TENANT_ID_DOC_MIME_TO_EXT: Record<string, string> = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

export const TENANT_ID_DOC_MAX_BYTES = 15 * 1024 * 1024;
