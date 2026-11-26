import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { DemoService } from '../demo/demo.service';

export const DEMO_PURGE_LOCK_KEY = 1_901_030_603;

@Injectable()
export class DemoPurgeJob {
  private readonly logger = new Logger(DemoPurgeJob.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly demo: DemoService,
  ) {}

  @Cron('0 4 * * *', { timeZone: 'Africa/Abidjan', name: 'purge-demo-orgs' })
  async runDaily(): Promise<void> {
    await this.runWithAdvisoryLock();
  }

  async runWithAdvisoryLock(): Promise<{ ran: boolean; purged?: number }> {
    const rows = await this.prisma.$queryRaw<Array<{ locked: boolean }>>`
      SELECT pg_try_advisory_lock(${DEMO_PURGE_LOCK_KEY}) AS locked
    `;
    if (!rows[0]?.locked) return { ran: false };
    try {
      const purged = await this.demo.purgeExpired();
      this.logger.log(`purge demo : ${purged} org(s).`);
      return { ran: true, purged };
    } finally {
      await this.prisma.$queryRaw`SELECT pg_advisory_unlock(${DEMO_PURGE_LOCK_KEY})`;
    }
  }
}
