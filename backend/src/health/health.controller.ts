import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { PrismaService } from '../prisma/prisma.service';
import { readFileSync } from 'fs';
import { join } from 'path';

@SkipThrottle()
@Controller()
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('health')
  async health() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', db: 'up' };
    } catch {
      throw new ServiceUnavailableException({ status: 'error', db: 'down' });
    }
  }

  @Get('version')
  version() {
    let version = '0.0.0';
    try {
      const pkgPath = join(__dirname, '..', '..', 'package.json');
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as { version?: string };
      version = pkg.version || version;
    } catch {
      /* ignore */
    }
    return {
      name: 'immopilot-api',
      version,
      commit: process.env.RENDER_GIT_COMMIT || process.env.GIT_COMMIT || null,
      node: process.version,
      env: process.env.NODE_ENV || 'development',
    };
  }
}
