import { randomBytes } from 'crypto';
import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { assertOrganizationPlatformAccess } from './organization-platform-access';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import type { JwtAuthUser, JwtAuthUserRole } from './jwt-user.types';

const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

export type AuthUserPayload = {
  id: string;
  email: string;
  name: string | null;
  organizationId: string;
  organizationName: string | null;
  role: JwtAuthUserRole;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
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
      role: user.role === 'PLATFORM_ADMIN' ? 'PLATFORM_ADMIN' : 'USER',
    };
  }

  async login(dto: LoginDto) {
    const email = dto.email.trim();
    const user = await this.prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      include: {
        organization: {
          select: {
            platformAccessSuspended: true,
            platformAccessPaidUntil: true,
          },
        },
      },
    });
    if (!user) throw new UnauthorizedException('Identifiants invalides');
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Identifiants invalides');

    const role: JwtAuthUserRole = user.role === 'PLATFORM_ADMIN' ? 'PLATFORM_ADMIN' : 'USER';
    assertOrganizationPlatformAccess(role, user.organization);

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

  async changePassword(user: JwtAuthUser, dto: ChangePasswordDto) {
    if (dto.newPassword === dto.currentPassword) {
      throw new BadRequestException('Le nouveau mot de passe doit être différent de l’actuel.');
    }
    const row = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { passwordHash: true },
    });
    if (!row) throw new UnauthorizedException();
    const ok = await bcrypt.compare(dto.currentPassword, row.passwordHash);
    if (!ok) throw new BadRequestException('Mot de passe actuel incorrect.');
    const passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });
    return { ok: true as const };
  }

  /**
   * Demande de réinitialisation : ne révèle pas si l’e-mail existe.
   * Envoie un lien si le compte existe (SMTP ou log en dev).
   */
  async requestPasswordReset(emailRaw: string) {
    const email = emailRaw.trim();
    const user = await this.prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
    });
    if (!user) {
      return { ok: true as const, message: genericResetMessage() };
    }
    await this.prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);
    await this.prisma.passwordResetToken.create({
      data: { userId: user.id, token, expiresAt },
    });
    const base = (this.config.get<string>('PUBLIC_APP_URL') ?? 'http://localhost:5173').replace(/\/$/, '');
    const resetUrl = `${base}/reinitialiser-mot-de-passe?token=${encodeURIComponent(token)}`;
    const mailResult = await this.mail.sendPasswordResetEmail(user.email, resetUrl);
    const isDev = process.env.NODE_ENV !== 'production';
    /** En dev : si SMTP ne part pas, on renvoie le lien pour tester sans boîte mail (jamais en prod). */
    if (isDev && mailResult.simulated) {
      return {
        ok: true as const,
        message: genericResetMessage(),
        mailSimulated: true as const,
        devResetUrl: resetUrl,
      };
    }
    return { ok: true as const, message: genericResetMessage() };
  }

  async resetPasswordWithToken(token: string, newPassword: string) {
    const row = await this.prisma.passwordResetToken.findFirst({
      where: { token, expiresAt: { gt: new Date() } },
    });
    if (!row) {
      throw new BadRequestException('Le lien est invalide ou a expiré. Demandez un nouvel e-mail depuis la connexion.');
    }
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: row.userId },
        data: { passwordHash },
      }),
      this.prisma.passwordResetToken.delete({ where: { id: row.id } }),
    ]);
    return { ok: true as const };
  }
}

function genericResetMessage() {
  return 'Si un compte existe pour cet e-mail, vous recevrez sous peu un message avec un lien pour choisir un nouveau mot de passe (vérifiez les courriers indésirables).';
}
