import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CurrentUser } from './current-user.decorator';
import { LoginDto } from './dto/login.dto';
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
}
