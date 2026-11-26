import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { LeasesService } from '../leases/leases.service';
import { AutomationService } from '../automation/automation.service';
import { RemindersService } from '../reminders/reminders.service';

/** Advisory lock distinct du late-status. */
export const SCHEDULE_EXTEND_LOCK_KEY = 1_901_030_601;
export const REMINDERS_JOB_LOCK_KEY = 1_901_030_602;

@Injectable()
export class ScheduleExtendJob {
  private readonly logger = new Logger(ScheduleExtendJob.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly leases: LeasesService,
    private readonly automation: AutomationService,
  ) {}

  /** 1er janvier 05:30 Africa/Abidjan — prolonge les horizons open-ended / 12 mois. */
  @Cron('30 5 1 1 *', { timeZone: 'Africa/Abidjan', name: 'extend-schedules' })
  async runYearly(): Promise<void> {
    await this.runWithLock();
  }

  async runWithLock(): Promise<{ ran: boolean; orgs?: number; created?: number }> {
    const rows = await this.prisma.$queryRaw<Array<{ locked: boolean }>>`
      SELECT pg_try_advisory_lock(${SCHEDULE_EXTEND_LOCK_KEY}) AS locked
    `;
    if (!rows[0]?.locked) return { ran: false };
    try {
      const orgs = await this.prisma.organization.findMany({ select: { id: true } });
      let created = 0;
      let enabledOrgs = 0;
      for (const org of orgs) {
        const s = await this.automation.getSettings(org.id);
        if (!s.autoGenerateSchedules) continue;
        enabledOrgs += 1;
        const res = await this.leases.extendSchedulesForOrganization(org.id, 12);
        created += res.created;
      }
      this.logger.log(`extend-schedules : ${enabledOrgs} org(s), ${created} échéance(s).`);
      return { ran: true, orgs: enabledOrgs, created };
    } finally {
      await this.prisma.$queryRaw`SELECT pg_advisory_unlock(${SCHEDULE_EXTEND_LOCK_KEY})`;
    }
  }
}

@Injectable()
export class RemindersJob {
  private readonly logger = new Logger(RemindersJob.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly automation: AutomationService,
    private readonly reminders: RemindersService,
  ) {}

  /** Toutes les heures : enqueue + process (respecte quiet hours). */
  @Cron('15 * * * *', { timeZone: 'Africa/Abidjan', name: 'reminders-tick' })
  async runHourly(): Promise<void> {
    await this.runWithLock();
  }

  async runWithLock(): Promise<{ ran: boolean }> {
    const rows = await this.prisma.$queryRaw<Array<{ locked: boolean }>>`
      SELECT pg_try_advisory_lock(${REMINDERS_JOB_LOCK_KEY}) AS locked
    `;
    if (!rows[0]?.locked) return { ran: false };
    try {
      const orgs = await this.prisma.organization.findMany({ select: { id: true } });
      let enqueued = 0;
      for (const org of orgs) {
        const s = await this.automation.getSettings(org.id);
        if (!s.autoRemindersEnabled) continue;
        const q = await this.reminders.enqueueDueForOrganization(org.id);
        enqueued += q.created;
      }
      const proc = await this.reminders.processQueued();
      this.logger.log(
        `reminders-tick : +${enqueued} en file ; sent=${proc.sent} skipped=${proc.skipped} failed=${proc.failed}`,
      );
      return { ran: true };
    } finally {
      await this.prisma.$queryRaw`SELECT pg_advisory_unlock(${REMINDERS_JOB_LOCK_KEY})`;
    }
  }
}
