import { assertAllowedUploadMagic, detectUploadMime } from './file-magic';

const allowed = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);

describe('file-magic', () => {
  it('détecte PDF', () => {
    expect(detectUploadMime(Buffer.from('%PDF-1.4\n'))).toBe('application/pdf');
  });

  it('détecte JPEG', () => {
    expect(detectUploadMime(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]))).toBe(
      'image/jpeg',
    );
  });

  it('refuse un buffer quelconque', () => {
    const r = assertAllowedUploadMagic(Buffer.from('hello world!!!!'), allowed);
    expect(r.ok).toBe(false);
  });

  it('refuse MIME déclaré incohérent', () => {
    const pdf = Buffer.from('%PDF-1.7\n.........!');
    const r = assertAllowedUploadMagic(pdf, allowed, 'image/png');
    expect(r.ok).toBe(false);
  });
});
