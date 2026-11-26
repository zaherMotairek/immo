import { randomBytes } from 'crypto';
import { randomUUID } from 'crypto';
import { existsSync } from 'fs';
import { mkdir, readFile, unlink, writeFile } from 'fs/promises';
import { join } from 'path';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { assertOrganizationPlatformAccess } from './organization-platform-access';
import { startOfTodayUtc } from '../common/date.util';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { RegisterDto } from './dto/register.dto';
import type { JwtAuthUser, JwtAuthUserRole, JwtOrgMemberRole } from './jwt-user.types';
import { parseOrgMemberRole } from './org-permissions';
import type { Express } from 'express';
import { LoginLockoutService } from './login-lockout.service';

const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;
const EMAIL_VERIFY_TTL_MS = 48 * 60 * 60 * 1000;

export function isSelfSignupEnabled(config: ConfigService): boolean {
  const v = (config.get<string>('SELF_SIGNUP_ENABLED') ?? 'true').toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

export type AuthUserPayload = {
  id: string;
  email: string;
  name: string | null;
  organizationId: string;
  organizationName: string | null;
  role: JwtAuthUserRole;
  orgRole: JwtOrgMemberRole;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
    private readonly lockout: LoginLockoutService,
  ) {}

  async getUserPayload(userId: string): Promise<AuthUserPayload & { isDemo?: boolean }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { organization: { select: { name: true, isDemo: true } } },
    });
    if (!user) throw new UnauthorizedException();
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      organizationId: user.organizationId,
      organizationName: user.organization.name ?? null,
      role: user.role === 'PLATFORM_ADMIN' ? 'PLATFORM_ADMIN' : 'USER',
      orgRole: parseOrgMemberRole(user.orgRole),
      isDemo: user.organization.isDemo || undefined,
    };
  }

  signupStatus() {
    return { enabled: isSelfSignupEnabled(this.config) };
  }

  async register(dto: RegisterDto) {
    if (!isSelfSignupEnabled(this.config)) {
      throw new ForbiddenException('Les inscriptions en ligne sont désactivées.');
    }
    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      select: { id: true },
    });
    if (existing) throw new ConflictException('Un compte existe déjà avec cet e-mail.');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const trialEnds = startOfTodayUtc();
    trialEnds.setUTCDate(trialEnds.getUTCDate() + 14);

    const result = await this.prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          name: dto.organizationName.trim(),
          planCode: 'TRIAL',
          trialEndsAt: trialEnds,
        },
      });
      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          name: dto.ownerName.trim(),
          organizationId: org.id,
          role: 'USER',
          emailVerifiedAt: null,
        },
        select: { id: true, email: true },
      });
      await tx.planChangeLog.create({
        data: {
          organizationId: org.id,
          fromPlanCode: null,
          toPlanCode: 'TRIAL',
          note: 'Inscription self-serve',
        },
      });
      return { org, user };
    });

    const verify = await this.createAndSendEmailVerification(result.user.id, result.user.email);
    return {
      ok: true,
      message: 'Compte créé. Vérifiez votre e-mail pour activer la connexion.',
      organizationId: result.org.id,
      ...(verify.devVerifyUrl ? { devVerifyUrl: verify.devVerifyUrl } : {}),
    };
  }

  async verifyEmail(token: string) {
    const row = await this.prisma.emailVerificationToken.findFirst({
      where: { token, expiresAt: { gt: new Date() } },
    });
    if (!row) {
      throw new BadRequestException('Lien de vérification invalide ou expiré.');
    }
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: row.userId },
        data: { emailVerifiedAt: new Date() },
      }),
      this.prisma.emailVerificationToken.deleteMany({ where: { userId: row.userId } }),
    ]);
    return { ok: true, message: 'E-mail vérifié. Vous pouvez vous connecter.' };
  }

  private async createAndSendEmailVerification(userId: string, email: string) {
    await this.prisma.emailVerificationToken.deleteMany({ where: { userId } });
    const token = randomBytes(32).toString('hex');
    await this.prisma.emailVerificationToken.create({
      data: {
        userId,
        token,
        expiresAt: new Date(Date.now() + EMAIL_VERIFY_TTL_MS),
      },
    });
    const base = (this.config.get<string>('PUBLIC_APP_URL') ?? 'http://localhost:5173').replace(/\/$/, '');
    const verifyUrl = `${base}/verifier-email?token=${encodeURIComponent(token)}`;
    const mailResult = await this.mail.sendTextEmail(
      email,
      'ImmoPilot — confirmez votre e-mail',
      `Bonjour,\n\nConfirmez votre adresse e-mail en ouvrant ce lien (valide 48 h) :\n\n${verifyUrl}\n\n— ImmoPilot`,
    );
    if (process.env.NODE_ENV !== 'production' && mailResult.simulated) {
      return { devVerifyUrl: verifyUrl };
    }
    return {};
  }

  async login(dto: LoginDto) {
    const email = dto.email.trim();
    const lockedMs = this.lockout.getLockRemainingMs(email);
    if (lockedMs > 0) {
      throw new HttpException(
        `Trop de tentatives. Réessayez dans ${Math.ceil(lockedMs / 1000)} s.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
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
    if (!user) {
      this.lockout.recordFailure(email);
      throw new UnauthorizedException('Identifiants invalides');
    }
    if (user.deactivatedAt) {
      throw new UnauthorizedException('Ce compte a été désactivé. Contactez le support.');
    }
    if (!user.emailVerifiedAt && user.role !== 'PLATFORM_ADMIN') {
      throw new UnauthorizedException(
        'E-mail non vérifié. Ouvrez le lien reçu par e-mail, ou demandez un nouvel envoi.',
      );
    }
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) {
      const { lockedMs: wait } = this.lockout.recordFailure(email);
      if (wait > 0) {
        throw new HttpException(
          `Trop de tentatives. Réessayez dans ${Math.ceil(wait / 1000)} s.`,
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      throw new UnauthorizedException('Identifiants invalides');
    }

    const role: JwtAuthUserRole = user.role === 'PLATFORM_ADMIN' ? 'PLATFORM_ADMIN' : 'USER';
    assertOrganizationPlatformAccess(role, user.organization);
    this.lockout.recordSuccess(email);

    await this.prisma.organization.update({
      where: { id: user.organizationId },
      data: { lastLoginAt: new Date() },
    });

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

  private receiptSignatureDir(): string {
    const root = process.env.LEASE_CONTRACT_UPLOAD_SUBDIR || 'uploads';
    return join(process.cwd(), root, 'receipt-signatures');
  }

  private async removeReceiptSignatureFile(key: string | null | undefined) {
    if (!key) return;
    const full = join(this.receiptSignatureDir(), key);
    try {
      await unlink(full);
    } catch {
      /* ignore */
    }
  }

  async getReceiptSignature(user: JwtAuthUser) {
    const row = (await this.prisma.$queryRawUnsafe(
      `
      SELECT
        "receipt_signature_file_key" AS "fileKey",
        "receipt_signature_mime" AS "mimeType",
        "receipt_signature_uploaded_at" AS "uploadedAt"
      FROM "organizations"
      WHERE "id" = $1
      LIMIT 1
      `,
      user.organizationId,
    )) as Array<{ fileKey: string | null; mimeType: string | null; uploadedAt: Date | null }>;
    const first = row[0];
    return {
      hasSignature: !!first?.fileKey,
      fileKey: first?.fileKey ?? null,
      mimeType: first?.mimeType ?? null,
      uploadedAt: first?.uploadedAt ? first.uploadedAt.toISOString() : null,
    };
  }

  async uploadReceiptSignature(user: JwtAuthUser, file: Express.Multer.File) {
    const allowed = new Set(['image/png', 'image/jpeg', 'image/webp']);
    if (!allowed.has(file.mimetype)) {
      throw new BadRequestException('Format non accepté (PNG, JPEG, WebP).');
    }
    if (file.size > 2 * 1024 * 1024) {
      throw new BadRequestException('Signature trop lourde (max 2 Mo).');
    }
    const ext = file.mimetype === 'image/png' ? '.png' : file.mimetype === 'image/webp' ? '.webp' : '.jpg';
    await mkdir(this.receiptSignatureDir(), { recursive: true });
    const key = `${randomUUID()}${ext}`;
    await writeFile(join(this.receiptSignatureDir(), key), file.buffer);

    const prev = await this.getReceiptSignature(user);
    if (prev.fileKey) await this.removeReceiptSignatureFile(prev.fileKey);

    await this.prisma.$executeRawUnsafe(
      `
      UPDATE "organizations"
      SET
        "receipt_signature_file_key" = $2,
        "receipt_signature_mime" = $3,
        "receipt_signature_uploaded_at" = NOW()
      WHERE "id" = $1
      `,
      user.organizationId,
      key,
      file.mimetype,
    );
    return this.getReceiptSignature(user);
  }

  async saveDrawnReceiptSignature(user: JwtAuthUser, dataUrl: string) {
    const m = dataUrl.match(/^data:(image\/png|image\/jpeg|image\/webp);base64,(.+)$/);
    if (!m) throw new BadRequestException('Format de signature dessinée invalide.');
    const mime = m[1]!;
    const base64 = m[2]!;
    const buf = Buffer.from(base64, 'base64');
    if (buf.length > 2 * 1024 * 1024) throw new BadRequestException('Signature trop lourde (max 2 Mo).');
    await this.uploadReceiptSignature(
      user,
      {
        fieldname: 'file',
        originalname: 'signature',
        encoding: '7bit',
        mimetype: mime,
        size: buf.length,
        buffer: buf,
        stream: undefined as never,
        destination: '',
        filename: '',
        path: '',
      } as Express.Multer.File,
    );
    return this.getReceiptSignature(user);
  }

  async getReceiptSignatureBufferForOrganization(organizationId: string): Promise<{
    buffer: Buffer;
    mimeType: string;
  } | null> {
    const rows = (await this.prisma.$queryRawUnsafe(
      `
      SELECT
        "receipt_signature_file_key" AS "fileKey",
        "receipt_signature_mime" AS "mimeType"
      FROM "organizations"
      WHERE "id" = $1
      LIMIT 1
      `,
      organizationId,
    )) as Array<{ fileKey: string | null; mimeType: string | null }>;
    const r = rows[0];
    if (!r?.fileKey || !r?.mimeType) return null;
    const full = join(this.receiptSignatureDir(), r.fileKey);
    if (!existsSync(full)) return null;
    try {
      const buffer = await readFile(full);
      return { buffer, mimeType: r.mimeType };
    } catch {
      return null;
    }
  }
}

function genericResetMessage() {
  return 'Si un compte existe pour cet e-mail, vous recevrez sous peu un message avec un lien pour choisir un nouveau mot de passe (vérifiez les courriers indésirables).';
}
