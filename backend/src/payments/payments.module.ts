import { Module } from '@nestjs/common';
import { MailModule } from '../mail/mail.module';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { PaymentsPublicController } from './payments.public.controller';

@Module({
  imports: [MailModule, AuditModule, AuthModule],
  controllers: [PaymentsController, PaymentsPublicController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
