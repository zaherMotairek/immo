import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { AdminService } from '../admin/admin.service';

export const SUBSCRIPTION_NOTICE_LOCK_KEY = 1_901_030_602;

@Injectable()
export class SubscriptionExpiryNoticeJob {
  private readonly logger = new Logger(SubscriptionExpiryNoticeJob.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly admin: AdminService,
  ) {}

  @Cron('30 7 * * *', { timeZone: 'Africa/Abidjan', name: 'subscription-expiry-notices' })
  async runDaily(): Promise<void> {
    await this.runWithAdvisoryLock();
  }

  async runWithAdvisoryLock(): Promise<{ ran: boolean; sent?: number }> {
    const rows = await this.prisma.$queryRaw<Array<{ locked: boolean }>>`
      SELECT pg_try_advisory_lock(${SUBSCRIPTION_NOTICE_LOCK_KEY}) AS locked
    `;
    if (!rows[0]?.locked) return { ran: false };
    try {
      const { sent } = await this.admin.sendSubscriptionExpiryNotices();
      this.logger.log(`subscription notices : ${sent} envoyé(s).`);
      return { ran: true, sent };
    } finally {
      await this.prisma.$queryRaw`SELECT pg_advisory_unlock(${SUBSCRIPTION_NOTICE_LOCK_KEY})`;
    }
  }
}
