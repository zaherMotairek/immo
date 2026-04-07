import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ChargesService } from './charges.service';
import { CreateChargeDto } from './dto/create-charge.dto';
import { UpdateChargeDto } from './dto/update-charge.dto';

@Controller('charges')
@UseGuards(JwtAuthGuard)
export class ChargesController {
  constructor(private readonly charges: ChargesService) {}

  @Get()
  list(@Query('year') year?: string) {
    const y = year ? parseInt(year, 10) : undefined;
    return this.charges.list(Number.isFinite(y) ? y : undefined);
  }

  @Get('summary')
  summary(@Query('year') year?: string) {
    const y = year ? parseInt(year, 10) : new Date().getFullYear();
    return this.charges.summary(y);
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
