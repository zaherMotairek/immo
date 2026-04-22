import { ReminderChannel } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class LogReminderDto {
  @IsEnum(ReminderChannel)
  channel!: ReminderChannel;
}
