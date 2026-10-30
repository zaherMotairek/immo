import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DemoController } from './demo.controller';
import { DemoService } from './demo.service';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const isProd = (config.get<string>('NODE_ENV') || '').toLowerCase() === 'production';
        const secret = config.get<string>('JWT_SECRET') || (isProd ? '' : 'dev-secret-change-me');
        if (!secret) throw new Error('JWT_SECRET manquant en production.');
        return { secret, signOptions: { expiresIn: '24h' } };
      },
    }),
  ],
  controllers: [DemoController],
  providers: [DemoService],
  exports: [DemoService],
})
export class DemoModule {}
