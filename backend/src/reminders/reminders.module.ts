import { Module } from '@nestjs/common';
import { MailModule } from '../mail/mail.module';
import { AuditModule } from '../audit/audit.module';
import { AutomationModule } from '../automation/automation.module';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { RemindersService } from './reminders.service';
import { RemindersController } from './reminders.controller';

@Module({
  imports: [MailModule, AuditModule, AutomationModule, WhatsAppModule],
  controllers: [RemindersController],
  providers: [RemindersService],
  exports: [RemindersService],
})
export class RemindersModule {}
