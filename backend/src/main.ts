import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { json, urlencoded } from 'express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { PrismaClientExceptionFilter } from './prisma/prisma-client-exception.filter';
import { assertEnvOrExit } from './config/validate-env';
import { initSentryIfConfigured, captureException } from './common/sentry';
import { REQUEST_ID_HEADER } from './common/request-id.middleware';

async function bootstrap() {
  assertEnvOrExit();
  await initSentryIfConfigured();

  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  app.useGlobalFilters(new PrismaClientExceptionFilter());

  app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(json({ limit: '1mb' }));
  app.use(urlencoded({ extended: true, limit: '1mb' }));

  const isProd = (process.env.NODE_ENV || '').toLowerCase() === 'production';
  const envOrigins = process.env.FRONTEND_ORIGIN?.split(',').map((s) => s.trim()).filter(Boolean);

  if (isProd && (!envOrigins || envOrigins.length === 0)) {
    throw new Error('FRONTEND_ORIGIN requis en production.');
  }

  /**
   * CORS : en prod uniquement FRONTEND_ORIGIN.
   * En dev : localhost / LAN si FRONTEND_ORIGIN absent.
   */
  const corsOrigin =
    envOrigins?.length
      ? envOrigins
      : (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
          if (!origin) {
            callback(null, true);
            return;
          }
          try {
            const u = new URL(origin);
            const h = u.hostname;
            const local =
              h === 'localhost' ||
              h === '127.0.0.1' ||
              /^192\.168\.\d{1,3}\.\d{1,3}$/.test(h) ||
              /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(h) ||
              /^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/.test(h);
            callback(null, local);
          } catch {
            callback(null, false);
          }
        };

  app.enableCors({
    origin: corsOrigin,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', REQUEST_ID_HEADER],
    exposedHeaders: [REQUEST_ID_HEADER],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const port = process.env.PORT ? Number(process.env.PORT) : 4000;
  const host = process.env.LISTEN_HOST ?? '0.0.0.0';
  await app.listen(port, host);
  logger.log(`ImmoPilot API : http://localhost:${port} (écoute ${host} — accès téléphone / LAN si besoin)`);
}

bootstrap().catch((err) => {
  console.error(err);
  void captureException(err);
  process.exit(1);
});
