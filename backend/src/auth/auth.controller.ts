import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Express } from 'express';
import type {
  AuthenticationResponseJSON,
  RegistrationResponseJSON,
} from '@simplewebauthn/server';
import { AuthService } from './auth.service';
import { CurrentUser } from './current-user.decorator';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordTokenDto } from './dto/reset-password-token.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { WebAuthnLoginOptionsDto, WebAuthnLoginVerifyDto } from './dto/webauthn-login.dto';
import { WebAuthnRegisterVerifyDto } from './dto/webauthn-register.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import type { JwtAuthUser } from './jwt-user.types';
import { WebAuthnService } from './webauthn.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly webauthn: WebAuthnService,
  ) {}

  @Post('login')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Post('forgot-password')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.auth.requestPasswordReset(dto.email);
  }

  @Post('reset-password-token')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  resetPasswordToken(@Body() dto: ResetPasswordTokenDto) {
    return this.auth.resetPasswordWithToken(dto.token, dto.newPassword);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  profileGet(@CurrentUser() user: JwtAuthUser) {
    return this.auth.getProfile(user.id);
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  profilePatch(@CurrentUser() user: JwtAuthUser, @Body() dto: UpdateProfileDto) {
    return this.auth.updateProfile(user, dto);
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  changePassword(@CurrentUser() user: JwtAuthUser, @Body() dto: ChangePasswordDto) {
    return this.auth.changePassword(user, dto);
  }

  @Get('receipt-signature')
  @UseGuards(JwtAuthGuard)
  receiptSignature(@CurrentUser() user: JwtAuthUser) {
    return this.auth.getReceiptSignature(user);
  }

  @Post('receipt-signature/upload')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  uploadReceiptSignature(@CurrentUser() user: JwtAuthUser, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Fichier manquant.');
    return this.auth.uploadReceiptSignature(user, file);
  }

  @Post('receipt-signature/draw')
  @UseGuards(JwtAuthGuard)
  drawReceiptSignature(@CurrentUser() user: JwtAuthUser, @Body() body: { dataUrl?: string }) {
    if (!body?.dataUrl?.trim()) throw new BadRequestException('Signature dessinée manquante.');
    return this.auth.saveDrawnReceiptSignature(user, body.dataUrl);
  }

  /** Face ID / empreinte / passkey — liste des appareils enregistrés. */
  @Get('webauthn/credentials')
  @UseGuards(JwtAuthGuard)
  webauthnList(@CurrentUser() user: JwtAuthUser) {
    return this.webauthn.listCredentials(user.id);
  }

  @Delete('webauthn/credentials/:id')
  @UseGuards(JwtAuthGuard)
  webauthnDelete(@CurrentUser() user: JwtAuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.webauthn.deleteCredential(user, id);
  }

  @Post('webauthn/register/options')
  @UseGuards(JwtAuthGuard)
  webauthnRegisterOptions(@CurrentUser() user: JwtAuthUser) {
    return this.webauthn.registrationOptions(user);
  }

  @Post('webauthn/register/verify')
  @UseGuards(JwtAuthGuard)
  webauthnRegisterVerify(@CurrentUser() user: JwtAuthUser, @Body() dto: WebAuthnRegisterVerifyDto) {
    return this.webauthn.registrationVerify(user, {
      response: dto.response as unknown as RegistrationResponseJSON,
      friendlyName: dto.friendlyName,
    });
  }

  @Post('webauthn/login/options')
  webauthnLoginOptions(@Body() dto: WebAuthnLoginOptionsDto) {
    return this.webauthn.authenticationOptions(dto.email);
  }

  @Post('webauthn/login/verify')
  webauthnLoginVerify(@Body() dto: WebAuthnLoginVerifyDto) {
    return this.webauthn.authenticationVerify(
      {
        email: dto.email,
        response: dto.response as unknown as AuthenticationResponseJSON,
      },
      (userId) => this.auth.getUserPayload(userId),
    );
  }
}
