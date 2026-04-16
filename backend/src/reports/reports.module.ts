import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { ExcelImportService } from './excel-import.service';
import { PaymentsModule } from '../payments/payments.module';
import { ChargesModule } from '../charges/charges.module';
import { BuildingsModule } from '../buildings/buildings.module';
import { UnitsModule } from '../units/units.module';
import { LeasesModule } from '../leases/leases.module';
import { TenantsModule } from '../tenants/tenants.module';

@Module({
  imports: [PaymentsModule, ChargesModule, BuildingsModule, UnitsModule, LeasesModule, TenantsModule],
  controllers: [ReportsController],
  providers: [ReportsService, ExcelImportService],
})
export class ReportsModule {}
