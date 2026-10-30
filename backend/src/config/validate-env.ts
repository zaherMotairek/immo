/**
 * Validation des variables d’environnement au démarrage.
 * En production : refuse de démarrer sans secrets / URLs critiques.
 */

export type EnvValidationResult = { ok: true } | { ok: false; errors: string[] };

export function validateProcessEnv(env: NodeJS.ProcessEnv = process.env): EnvValidationResult {
  const isProd = (env.NODE_ENV || '').toLowerCase() === 'production';
  const errors: string[] = [];

  if (isProd) {
    const jwt = env.JWT_SECRET?.trim() || '';
    if (!jwt || jwt === 'dev-secret-change-me' || jwt.length < 32) {
      errors.push('JWT_SECRET obligatoire en production (≥ 32 caractères, pas le secret de démo).');
    }
    if (!env.DATABASE_URL?.trim()) {
      errors.push('DATABASE_URL obligatoire en production.');
    }
    if (!env.FRONTEND_ORIGIN?.trim()) {
      errors.push('FRONTEND_ORIGIN obligatoire en production (origine(s) CORS, séparées par des virgules).');
    }
    if (!env.PUBLIC_APP_URL?.trim()) {
      errors.push('PUBLIC_APP_URL obligatoire en production (URL du front).');
    }
    const driver = (env.STORAGE_DRIVER || 'local').toLowerCase();
    if (driver === 'local' && env.STORAGE_ALLOW_LOCAL !== 'true') {
      errors.push(
        'STORAGE_DRIVER=local interdit en production sans STORAGE_ALLOW_LOCAL=true (disque persistant).',
      );
    }
  }

  if (errors.length) return { ok: false, errors };
  return { ok: true };
}

export function assertEnvOrExit(env: NodeJS.ProcessEnv = process.env): void {
  const r = validateProcessEnv(env);
  if (!r.ok) {
    for (const e of r.errors) console.error('[env]', e);
    process.exit(1);
  }
}
