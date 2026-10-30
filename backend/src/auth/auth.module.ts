import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { MailModule } from '../mail/mail.module';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { WebAuthnService } from './webauthn.service';
import { LoginLockoutService } from './login-lockout.service';

@Module({
  imports: [
    MailModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const isProd = (config.get<string>('NODE_ENV') || '').toLowerCase() === 'production';
        const secret = config.get<string>('JWT_SECRET') || (isProd ? '' : 'dev-secret-change-me');
        if (!secret) {
          throw new Error('JWT_SECRET manquant en production.');
        }
        return {
          secret,
          signOptions: { expiresIn: '7d' },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, WebAuthnService, JwtStrategy, LoginLockoutService],
  exports: [AuthService],
})
export class AuthModule {}
