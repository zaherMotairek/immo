import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ChargesService, type ChargeListMonth } from './charges.service';
import { CreateChargeDto } from './dto/create-charge.dto';
import { UpdateChargeDto } from './dto/update-charge.dto';

@Controller('charges')
@UseGuards(JwtAuthGuard)
export class ChargesController {
  constructor(private readonly charges: ChargesService) {}

  @Get()
  list(@Query('year') year?: string, @Query('month') month?: string) {
    const y = year ? parseInt(year, 10) : undefined;
    const m = this.parseMonthQuery(month);
    return this.charges.list(Number.isFinite(y) ? y : undefined, m);
  }

  @Get('summary')
  summary(@Query('year') year?: string, @Query('month') month?: string) {
    const yRaw = year ? parseInt(year, 10) : NaN;
    const y = Number.isFinite(yRaw) ? yRaw : new Date().getFullYear();
    const m = this.parseMonthQuery(month);
    return this.charges.summary(y, m);
  }

  /** `all` ou absent = toute l’année ; 1–12 = mois précis. */
  private parseMonthQuery(month?: string): ChargeListMonth {
    if (month == null || month === '' || month === 'all') return 'all';
    const n = parseInt(month, 10);
    if (Number.isFinite(n) && n >= 1 && n <= 12) return n;
    return 'all';
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.charges.get(id);
  }

  @Post()
  create(@Body() dto: CreateChargeDto) {
    return this.charges.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateChargeDto) {
    return this.charges.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.charges.remove(id);
  }
}
