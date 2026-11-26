/**
 * Sentry front : actif uniquement si `VITE_SENTRY_DSN` est défini au build.
 */
export async function initSentryIfConfigured(): Promise<void> {
  const dsn = (import.meta.env.VITE_SENTRY_DSN as string | undefined)?.trim();
  if (!dsn) return;
  try {
    const Sentry = await import('@sentry/react');
    Sentry.init({
      dsn,
      environment: import.meta.env.MODE,
      tracesSampleRate: Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE || '0.1'),
    });
  } catch (err) {
    console.warn('[Sentry] non initialisé', err);
  }
}
