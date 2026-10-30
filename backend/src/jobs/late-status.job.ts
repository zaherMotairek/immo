import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsService } from '../payments/payments.service';

/** Clé advisory Postgres fixe (évite collision avec d’autres apps sur la même DB). */
export const LATE_STATUS_LOCK_KEY = 1_901_030_600;

@Injectable()
export class LateStatusJob {
  private readonly logger = new Logger(LateStatusJob.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly payments: PaymentsService,
  ) {}

  /**
   * Sync PENDING → LATE global, une fois par jour (06:00 Africa/Abidjan).
   * `pg_try_advisory_lock` : une seule instance Render exécute le travail.
   */
  @Cron('0 6 * * *', { timeZone: 'Africa/Abidjan', name: 'sync-late-statuses' })
  async runDaily(): Promise<void> {
    await this.runWithAdvisoryLock();
  }

  /** Exposé pour tests / déclenchement manuel. */
  async runWithAdvisoryLock(): Promise<{ ran: boolean; updated?: number }> {
    const rows = await this.prisma.$queryRaw<Array<{ locked: boolean }>>`
      SELECT pg_try_advisory_lock(${LATE_STATUS_LOCK_KEY}) AS locked
    `;
    const locked = Boolean(rows[0]?.locked);
    if (!locked) {
      this.logger.debug('syncLateStatuses : lock non acquis (autre instance).');
      return { ran: false };
    }
    try {
      const res = await this.payments.syncLateStatuses();
      this.logger.log(`syncLateStatuses (job) : ${res.updated} mise(s) à jour.`);
      return { ran: true, updated: res.updated };
    } finally {
      await this.prisma.$queryRaw`SELECT pg_advisory_unlock(${LATE_STATUS_LOCK_KEY})`;
    }
  }
}
