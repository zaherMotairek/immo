import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { PrismaClientExceptionFilter } from './prisma/prisma-client-exception.filter';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  app.useGlobalFilters(new PrismaClientExceptionFilter());

  /**
   * CORS : si `FRONTEND_ORIGIN` est défini, seules ces origines (séparées par des virgules) sont acceptées.
   * Sinon (développement), tout origine localhost / 127.0.0.1 (tous ports) et IP LAN type 192.168.x.x / 10.x.x.x
   * — évite les erreurs quand Vite prend 5189+ ou accès depuis le téléphone sur le Wi‑Fi.
   */
  const envOrigins = process.env.FRONTEND_ORIGIN?.split(',').map((s) => s.trim()).filter(Boolean);
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
              /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(h);
            callback(null, local);
          } catch {
            callback(null, false);
          }
        };
  app.enableCors({
    origin: corsOrigin,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
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
  process.exit(1);
});
