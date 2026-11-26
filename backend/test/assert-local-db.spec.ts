import { assertLocalDatabaseUrl } from './helpers/assert-local-url';

describe('assertLocalDatabaseUrl', () => {
  it('accepte localhost', () => {
    const r = assertLocalDatabaseUrl('postgresql://u:p@localhost:5432/immopilot');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.host).toBe('localhost');
  });

  it('accepte 127.0.0.1', () => {
    const r = assertLocalDatabaseUrl('postgresql://u:p@127.0.0.1:5432/immopilot');
    expect(r.ok).toBe(true);
  });

  it('refuse neon.tech', () => {
    const r = assertLocalDatabaseUrl('postgresql://u:p@ep-foo.eu-central-1.aws.neon.tech/neondb');
    expect(r.ok).toBe(false);
  });

  it('refuse un hôte distant quelconque', () => {
    const r = assertLocalDatabaseUrl('postgresql://u:p@db.example.com:5432/immopilot');
    expect(r.ok).toBe(false);
  });

  it('masque le mot de passe', () => {
    const r = assertLocalDatabaseUrl('postgresql://u:secret@localhost:5432/db');
    expect(r.masked).toContain(':****@');
    expect(r.masked).not.toContain('secret');
  });
});
