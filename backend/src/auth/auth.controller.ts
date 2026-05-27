import { BadRequestException, Body, Controller, Get, Patch, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Express } from 'express';
import { AuthService } from './auth.service';
import { CurrentUser } from './current-user.decorator';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordTokenDto } from './dto/reset-password-token.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import type { JwtAuthUser } from './jwt-user.types';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.auth.requestPasswordReset(dto.email);
  }

  @Post('reset-password-token')
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
}
