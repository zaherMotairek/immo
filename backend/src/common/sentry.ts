import { Logger } from '@nestjs/common';

const logger = new Logger('Sentry');

/**
 * Initialise Sentry uniquement si `SENTRY_DSN` est défini.
 * Échec soft si le package est absent ou mal configuré.
 */
export async function initSentryIfConfigured(): Promise<void> {
  const dsn = process.env.SENTRY_DSN?.trim();
  if (!dsn) return;
  try {
    const Sentry = await import('@sentry/node');
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),
    });
    logger.log('Sentry initialisé.');
  } catch (err) {
    logger.warn(`Sentry non initialisé : ${err instanceof Error ? err.message : String(err)}`);
  }
}

export async function captureException(err: unknown): Promise<void> {
  if (!process.env.SENTRY_DSN?.trim()) return;
  try {
    const Sentry = await import('@sentry/node');
    Sentry.captureException(err);
  } catch {
    /* ignore */
  }
}
