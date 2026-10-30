import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PlatformAdminGuard } from '../auth/platform-admin.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { JwtAuthUser } from '../auth/jwt-user.types';
import { AdminService } from './admin.service';
import { CreateClientDto } from './dto/create-client.dto';
import { InviteOrganizationUserDto } from './dto/invite-organization-user.dto';
import { ResetOrganizationUserPasswordDto } from './dto/reset-organization-user-password.dto';
import { UpdateOrganizationBillingDto } from './dto/update-organization-billing.dto';
import { UpdateOrganizationSubscriptionDto } from './dto/update-organization-subscription.dto';
import { RecordSubscriptionPaymentDto } from './dto/record-subscription-payment.dto';
import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';

class CreateClientAdminDto extends CreateClientDto {
  @IsOptional()
  @IsIn(['FREE', 'TRIAL', 'PRO'])
  planCode?: string;

  @IsOptional()
  @IsString()
  trialEndsAt?: string;

  @IsOptional()
  @IsString()
  subscriptionEndsAt?: string;
}

class DeactivateUserDto {
  @IsBoolean()
  deactivated!: boolean;
}

@Controller('admin')
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('dashboard')
  dashboard() {
    return this.admin.dashboard();
  }

  @Get('organizations')
  listOrganizations(
    @Query('q') q?: string,
    @Query('status') status?: string,
    @Query('planCode') planCode?: string,
  ) {
    return this.admin.listOrganizations({ q, status, planCode });
  }

  @Get('organizations/:id')
  getOrganization(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.admin.getOrganization(id);
  }

  @Patch('organizations/:id')
  updateOrganizationBilling(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateOrganizationBillingDto,
    @CurrentUser() user: JwtAuthUser,
  ) {
    return this.admin.updateSubscription(id, dto, user);
  }

  @Patch('organizations/:id/subscription')
  updateSubscription(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateOrganizationSubscriptionDto,
    @CurrentUser() user: JwtAuthUser,
  ) {
    return this.admin.updateSubscription(id, dto, user);
  }

  @Post('organizations/:id/subscription-payments')
  recordPayment(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: RecordSubscriptionPaymentDto,
    @CurrentUser() user: JwtAuthUser,
  ) {
    return this.admin.recordSubscriptionPayment(id, dto, user);
  }

  @Post('clients')
  createClient(@Body() dto: CreateClientAdminDto) {
    return this.admin.createClientOrganization(dto);
  }

  @Post('organizations/:id/users/invite')
  inviteUserToOrganization(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: InviteOrganizationUserDto,
  ) {
    return this.admin.inviteOrganizationUser(id, dto);
  }

  @Post('organizations/:id/users/:userId/reset-password-link')
  forceResetLink(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Param('userId', new ParseUUIDPipe({ version: '4' })) userId: string,
  ) {
    return this.admin.forcePasswordResetLink(id, userId);
  }

  @Post('organizations/:id/users/:userId/reset-password')
  resetOrganizationUserPassword(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Param('userId', new ParseUUIDPipe({ version: '4' })) userId: string,
    @Body() dto: ResetOrganizationUserPasswordDto,
  ) {
    return this.admin.resetOrganizationUserPassword(id, userId, dto);
  }

  @Patch('organizations/:id/users/:userId/deactivated')
  setDeactivated(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Param('userId', new ParseUUIDPipe({ version: '4' })) userId: string,
    @Body() dto: DeactivateUserDto,
  ) {
    return this.admin.setUserDeactivated(id, userId, dto.deactivated);
  }

  @Post('organizations/:id/impersonate')
  impersonate(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentUser() user: JwtAuthUser,
  ) {
    return this.admin.startImpersonation(id, user);
  }
}
