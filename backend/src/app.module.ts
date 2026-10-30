import { join } from 'path';
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { BuildingsModule } from './buildings/buildings.module';
import { UnitsModule } from './units/units.module';
import { TenantsModule } from './tenants/tenants.module';
import { LeasesModule } from './leases/leases.module';
import { PaymentsModule } from './payments/payments.module';
import { ChargesModule } from './charges/charges.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ReportsModule } from './reports/reports.module';
import { SearchModule } from './search/search.module';
import { AdminModule } from './admin/admin.module';
import { AuditModule } from './audit/audit.module';
import { CollectorsModule } from './collectors/collectors.module';
import { StorageModule } from './storage/storage.module';
import { JobsModule } from './jobs/jobs.module';
import { HealthModule } from './health/health.module';
import { AutomationModule } from './automation/automation.module';
import { RemindersModule } from './reminders/reminders.module';
import { FinanceModule } from './finance/finance.module';
import { RequestIdMiddleware } from './common/request-id.middleware';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Toujours charger backend/.env (UTF-8), même si le cwd n’est pas le dossier backend.
      envFilePath: join(__dirname, '..', '.env'),
    }),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60_000,
        limit: 120,
      },
    ]),
    StorageModule,
    PrismaModule,
    AuthModule,
    BuildingsModule,
    UnitsModule,
    TenantsModule,
    LeasesModule,
    PaymentsModule,
    ChargesModule,
    DashboardModule,
    ReportsModule,
    SearchModule,
    AdminModule,
    AuditModule,
    CollectorsModule,
    JobsModule,
    HealthModule,
    AutomationModule,
    RemindersModule,
    FinanceModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
