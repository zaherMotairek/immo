import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PlatformAdminGuard } from '../auth/platform-admin.guard';
import { AdminService } from './admin.service';
import { CreateClientDto } from './dto/create-client.dto';
import { InviteOrganizationUserDto } from './dto/invite-organization-user.dto';
import { ResetOrganizationUserPasswordDto } from './dto/reset-organization-user-password.dto';
import { UpdateOrganizationBillingDto } from './dto/update-organization-billing.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('organizations')
  listOrganizations() {
    return this.admin.listOrganizations();
  }

  @Patch('organizations/:id')
  updateOrganizationBilling(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateOrganizationBillingDto,
  ) {
    return this.admin.updateOrganizationBilling(id, dto);
  }

  /** Crée une organisation dédiée + le premier compte utilisateur du client. */
  @Post('clients')
  createClient(@Body() dto: CreateClientDto) {
    return this.admin.createClientOrganization(dto);
  }

  @Post('organizations/:id/users/invite')
  inviteUserToOrganization(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: InviteOrganizationUserDto,
  ) {
    return this.admin.inviteOrganizationUser(id, dto);
  }

  /** Mot de passe provisoire pour un user client — communiqué hors app par l’admin. */
  @Post('organizations/:id/users/:userId/reset-password')
  resetOrganizationUserPassword(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Param('userId', new ParseUUIDPipe({ version: '4' })) userId: string,
    @Body() dto: ResetOrganizationUserPasswordDto,
  ) {
    return this.admin.resetOrganizationUserPassword(id, userId, dto);
  }
}
