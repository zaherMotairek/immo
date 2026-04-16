import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import type { JwtAuthUser } from './jwt-user.types';

export type AuthUserPayload = {
  id: string;
  email: string;
  name: string | null;
  organizationId: string;
  organizationName: string | null;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async getUserPayload(userId: string): Promise<AuthUserPayload> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { organization: { select: { name: true } } },
    });
    if (!user) throw new UnauthorizedException();
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      organizationId: user.organizationId,
      organizationName: user.organization.name ?? null,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException('Identifiants invalides');
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Identifiants invalides');

    const payload: { sub: string; email: string; organizationId: string } = {
      sub: user.id,
      email: user.email,
      organizationId: user.organizationId,
    };
    return {
      accessToken: await this.jwt.signAsync(payload),
      user: await this.getUserPayload(user.id),
    };
  }

  getProfile(userId: string) {
    return this.getUserPayload(userId);
  }

  async updateProfile(user: JwtAuthUser, dto: UpdateProfileDto) {
    const trimmedUser = dto.userName !== undefined ? dto.userName.trim() || null : undefined;
    const trimmedOrg =
      dto.organizationName !== undefined ? dto.organizationName.trim() || null : undefined;

    if (trimmedUser !== undefined || trimmedOrg !== undefined) {
      await this.prisma.$transaction(async (tx) => {
        if (trimmedUser !== undefined) {
          await tx.user.update({
            where: { id: user.id },
            data: { name: trimmedUser },
          });
        }
        if (trimmedOrg !== undefined) {
          await tx.organization.update({
            where: { id: user.organizationId },
            data: { name: trimmedOrg },
          });
        }
      });
    }

    return this.getUserPayload(user.id);
  }
}
