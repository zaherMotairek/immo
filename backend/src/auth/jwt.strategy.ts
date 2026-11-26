import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';
import { assertOrganizationPlatformAccess } from './organization-platform-access';
import { parseOrgMemberRole } from './org-permissions';
import type { JwtAuthUser } from './jwt-user.types';

export type JwtPayload = {
  sub: string;
  email: string;
  organizationId?: string;
  impersonatorId?: string;
  readOnly?: boolean;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const isProd = (config.get<string>('NODE_ENV') || '').toLowerCase() === 'production';
    const secret = config.get<string>('JWT_SECRET') || (isProd ? '' : 'dev-secret-change-me');
    if (!secret) {
      throw new Error('JWT_SECRET manquant en production.');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: JwtPayload): Promise<JwtAuthUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        organization: {
          select: {
            platformAccessSuspended: true,
            platformAccessPaidUntil: true,
          },
        },
      },
    });
    if (!user) throw new UnauthorizedException();
    if (user.deactivatedAt) throw new UnauthorizedException('Compte désactivé.');
    if (payload.organizationId != null && user.organizationId !== payload.organizationId) {
      throw new UnauthorizedException();
    }
    const role = user.role === 'PLATFORM_ADMIN' ? 'PLATFORM_ADMIN' : 'USER';
    const orgRole = parseOrgMemberRole(user.orgRole);
    const isImpersonation = Boolean(payload.impersonatorId && payload.readOnly);
    if (!isImpersonation) {
      assertOrganizationPlatformAccess(role, user.organization);
    }
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      organizationId: user.organizationId,
      role,
      orgRole,
      ...(isImpersonation
        ? { readOnly: true, impersonatorId: payload.impersonatorId }
        : {}),
    };
  }
}
