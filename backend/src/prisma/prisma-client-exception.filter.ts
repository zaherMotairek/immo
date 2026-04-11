import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Response } from 'express';

const MIGRATE_HINT =
  'Dans le dossier backend : arrêtez l’API, puis « npx prisma migrate deploy » puis « npx prisma generate », puis relancez « npm run start:dev ».';

const SCHEMA_OUTDATED_MSG = `La base PostgreSQL n’est pas à jour (types de bien, colonnes terrain…). ${MIGRATE_HINT}`;

/**
 * Transforme les erreurs Prisma en message exploitable côté front (ex.: base pas migrée).
 */
@Catch(
  Prisma.PrismaClientKnownRequestError,
  Prisma.PrismaClientInitializationError,
  Prisma.PrismaClientValidationError,
  Prisma.PrismaClientUnknownRequestError,
)
export class PrismaClientExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaClientExceptionFilter.name);

  catch(
    exception:
      | Prisma.PrismaClientKnownRequestError
      | Prisma.PrismaClientInitializationError
      | Prisma.PrismaClientValidationError
      | Prisma.PrismaClientUnknownRequestError,
    host: ArgumentsHost,
  ) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const code =
      'code' in exception && exception.code != null
        ? String(exception.code)
        : exception instanceof Prisma.PrismaClientInitializationError
          ? 'INIT'
          : 'ERR';
    this.logger.error(`[Prisma ${code}] ${exception.message}`);

    if (exception instanceof Prisma.PrismaClientValidationError) {
      response.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        message: exception.message,
        code: 'VALIDATION',
      });
      return;
    }

    if (exception instanceof Prisma.PrismaClientUnknownRequestError) {
      if (this.looksLikeSchemaDrift(exception.message)) {
        response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: SCHEMA_OUTDATED_MSG,
          code: 'UNKNOWN_QUERY',
        });
        return;
      }
      response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: `Erreur base de données (requête). ${MIGRATE_HINT}`,
        code: 'UNKNOWN_QUERY',
      });
      return;
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2022') {
        response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message:
            'La base PostgreSQL n’a pas les colonnes attendues (migrations non appliquées ou mauvaise base dans .env). ' +
            MIGRATE_HINT,
          code: exception.code,
        });
        return;
      }
      if (exception.code === 'P1001' || exception.code === 'P1017') {
        response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message:
            'PostgreSQL est injoignable (serveur arrêté, mauvais host/port dans DATABASE_URL, ou firewall). Vérifiez que la base tourne et que backend/.env pointe sur la bonne instance.',
          code: exception.code,
        });
        return;
      }
      if (this.looksLikeSchemaDrift(exception.message)) {
        response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: SCHEMA_OUTDATED_MSG,
          code: exception.code,
        });
        return;
      }
    }

    if (exception instanceof Prisma.PrismaClientInitializationError) {
      response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message:
          'Connexion à la base impossible. Vérifiez DATABASE_URL dans backend/.env et que PostgreSQL tourne.',
        code: 'INIT',
      });
      return;
    }

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: `Erreur base de données (${code}). Voir les logs de l’API.`,
      code,
    });
  }

  private looksLikeSchemaDrift(message: string): boolean {
    return /invalid input value for enum|structure_kind|terrain_lot_count|BuildingStructureKind|TERRAIN_LOTS/i.test(
      message,
    );
  }
}
