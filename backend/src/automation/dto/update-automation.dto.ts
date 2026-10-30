import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

class ReminderRuleDto {
  @IsInt()
  @Min(-30)
  @Max(90)
  offsetDays!: number;

  @IsOptional()
  @IsIn(['friendly', 'neutral', 'firm'])
  tone?: 'friendly' | 'neutral' | 'firm';
}

class TemplatesDto {
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  reminder?: string;
}

export class UpdateAutomationDto {
  @IsOptional()
  @IsBoolean()
  autoGenerateSchedules?: boolean;

  @IsOptional()
  @IsBoolean()
  autoRemindersEnabled?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReminderRuleDto)
  reminderRules?: ReminderRuleDto[];

  @IsOptional()
  @IsArray()
  @IsIn(['EMAIL', 'WHATSAPP'], { each: true })
  reminderChannels?: Array<'EMAIL' | 'WHATSAPP'>;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(23)
  quietHoursStart?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(23)
  quietHoursEnd?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => TemplatesDto)
  templates?: TemplatesDto;
}
