import { validateProcessEnv } from './validate-env';

describe('validateProcessEnv', () => {
  it('passe en développement sans JWT fort', () => {
    const r = validateProcessEnv({ NODE_ENV: 'development' });
    expect(r.ok).toBe(true);
  });

  it('refuse la prod sans JWT_SECRET fort', () => {
    const r = validateProcessEnv({
      NODE_ENV: 'production',
      JWT_SECRET: 'short',
      DATABASE_URL: 'postgresql://u:p@localhost/db',
      FRONTEND_ORIGIN: 'https://app.example.com',
      PUBLIC_APP_URL: 'https://app.example.com',
      STORAGE_ALLOW_LOCAL: 'true',
    });
    expect(r.ok).toBe(false);
  });

  it('accepte la prod avec secrets corrects', () => {
    const r = validateProcessEnv({
      NODE_ENV: 'production',
      JWT_SECRET: 'x'.repeat(32),
      DATABASE_URL: 'postgresql://u:p@localhost/db',
      FRONTEND_ORIGIN: 'https://app.example.com',
      PUBLIC_APP_URL: 'https://app.example.com',
      STORAGE_DRIVER: 's3',
      S3_BUCKET: 'b',
    });
    expect(r.ok).toBe(true);
  });
});
