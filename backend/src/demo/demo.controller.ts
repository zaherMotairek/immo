import { Controller, Headers, Post, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { createHash, randomUUID } from 'crypto';
import { DemoService } from './demo.service';

@Controller('demo')
export class DemoController {
  constructor(private readonly demo: DemoService) {}

  /**
   * Démarre une session sandbox (D4).
   * Rate-limit strict + empreinte IP/UA (anti-bot basique).
   */
  @Post('session')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  start(
    @Req() req: Request,
    @Headers('user-agent') ua?: string,
    @Headers('x-forwarded-for') xff?: string,
  ) {
    const ip = (xff?.split(',')[0] || req.ip || 'local').trim();
    const visitorKey = createHash('sha256')
      .update(`${ip}|${ua ?? ''}|${randomUUID()}`)
      .digest('hex');
    return this.demo.startSession(visitorKey);
  }
}
