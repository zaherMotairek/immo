import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { EntitlementsService } from '../entitlements/entitlements.service';

export const TRIAL_EXPIRY_LOCK_KEY = 1_901_030_601;

@Injectable()
export class TrialExpiryJob {
  private readonly logger = new Logger(TrialExpiryJob.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly entitlements: EntitlementsService,
  ) {}

  @Cron('15 6 * * *', { timeZone: 'Africa/Abidjan', name: 'expire-trials' })
  async runDaily(): Promise<void> {
    await this.runWithAdvisoryLock();
  }

  async runWithAdvisoryLock(): Promise<{ ran: boolean; downgraded?: number }> {
    const rows = await this.prisma.$queryRaw<Array<{ locked: boolean }>>`
      SELECT pg_try_advisory_lock(${TRIAL_EXPIRY_LOCK_KEY}) AS locked
    `;
    const locked = Boolean(rows[0]?.locked);
    if (!locked) {
      this.logger.debug('expireTrials : lock non acquis.');
      return { ran: false };
    }
    try {
      const downgraded = await this.entitlements.expireTrialsToFree();
      this.logger.log(`expireTrials : ${downgraded} org(s) → FREE.`);
      return { ran: true, downgraded };
    } finally {
      await this.prisma.$queryRaw`SELECT pg_advisory_unlock(${TRIAL_EXPIRY_LOCK_KEY})`;
    }
  }
}
