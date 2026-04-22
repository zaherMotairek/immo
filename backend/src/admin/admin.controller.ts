import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PlatformAdminGuard } from '../auth/platform-admin.guard';
import { AdminService } from './admin.service';
import { CreateClientDto } from './dto/create-client.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  /** Crée une organisation dédiée + le premier compte utilisateur du client. */
  @Post('clients')
  createClient(@Body() dto: CreateClientDto) {
    return this.admin.createClientOrganization(dto);
  }
}
