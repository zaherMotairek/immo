import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticatorTransportFuture,
  type RegistrationResponseJSON,
  type AuthenticationResponseJSON,
} from '@simplewebauthn/server';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { assertOrganizationPlatformAccess } from './organization-platform-access';
import type { AuthUserPayload } from './auth.service';
import type { JwtAuthUser, JwtAuthUserRole } from './jwt-user.types';

const CHALLENGE_TTL_MS = 5 * 60 * 1000;

type CredRow = {
  id: string;
  user_id: string;
  credential_id: string;
  public_key: Buffer;
  counter: bigint | number;
  device_type: string | null;
  backed_up: boolean;
  transports: string | null;
  friendly_name: string | null;
  created_at: Date;
  last_used_at: Date | null;
};

@Injectable()
export class WebAuthnService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
  ) {}

  private rpConfig() {
    const publicApp = (this.config.get<string>('PUBLIC_APP_URL') || 'http://localhost:5173').trim();
    const origin = (this.config.get<string>('WEBAUTHN_ORIGIN') || publicApp).trim().replace(/\/$/, '');
    let rpID = (this.config.get<string>('WEBAUTHN_RP_ID') || '').trim();
    if (!rpID) {
      try {
        rpID = new URL(origin).hostname;
      } catch {
        rpID = 'localhost';
      }
    }
    const rpName = (this.config.get<string>('WEBAUTHN_RP_NAME') || 'ImmoPilot').trim();
    return { rpID, rpName, origin };
  }

  private async storeChallenge(opts: {
    userId?: string | null;
    email?: string | null;
    challenge: string;
    purpose: 'registration' | 'authentication';
  }) {
    const id = randomUUID();
    const expiresAt = new Date(Date.now() + CHALLENGE_TTL_MS);
    await this.prisma.$executeRawUnsafe(
      `INSERT INTO "webauthn_challenges" ("id","user_id","email","challenge","purpose","expires_at","created_at")
       VALUES ($1,$2,$3,$4,$5,$6,CURRENT_TIMESTAMP)`,
      id,
      opts.userId ?? null,
      opts.email?.toLowerCase() ?? null,
      opts.challenge,
      opts.purpose,
      expiresAt,
    );
  }

  private async takeChallenge(opts: {
    userId?: string;
    email?: string;
    purpose: 'registration' | 'authentication';
  }): Promise<string> {
    const now = new Date();
    const rows = (await this.prisma.$queryRawUnsafe(
      `SELECT "id","challenge" FROM "webauthn_challenges"
       WHERE "purpose" = $1 AND "expires_at" > $2
         AND ($3::text IS NULL OR "user_id" = $3)
         AND ($4::text IS NULL OR "email" = $4)
       ORDER BY "created_at" DESC
       LIMIT 1`,
      opts.purpose,
      now,
      opts.userId ?? null,
      opts.email?.toLowerCase() ?? null,
    )) as Array<{ id: string; challenge: string }>;
    const row = rows[0];
    if (!row) throw new BadRequestException('Session Face ID expirée. Réessayez.');
    await this.prisma.$executeRawUnsafe(
      `DELETE FROM "webauthn_challenges"
       WHERE "id" = $1
          OR "expires_at" <= $2
          OR ($3::text IS NOT NULL AND "user_id" = $3 AND "purpose" = $4)
          OR ($5::text IS NOT NULL AND "email" = $5 AND "purpose" = $4)`,
      row.id,
      now,
      opts.userId ?? null,
      opts.purpose,
      opts.email?.toLowerCase() ?? null,
    );
    return row.challenge;
  }

  async listCredentials(userId: string) {
    const rows = (await this.prisma.$queryRawUnsafe(
      `SELECT "id","friendly_name","device_type","backed_up","created_at","last_used_at"
       FROM "webauthn_credentials" WHERE "user_id" = $1
       ORDER BY "created_at" DESC`,
      userId,
    )) as Array<{
      id: string;
      friendly_name: string | null;
      device_type: string | null;
      backed_up: boolean;
      created_at: Date;
      last_used_at: Date | null;
    }>;
    return rows.map((r) => ({
      id: r.id,
      friendlyName: r.friendly_name,
      deviceType: r.device_type,
      backedUp: r.backed_up,
      createdAt: new Date(r.created_at).toISOString(),
      lastUsedAt: r.last_used_at ? new Date(r.last_used_at).toISOString() : null,
    }));
  }

  async deleteCredential(user: JwtAuthUser, credentialRowId: string) {
    const rows = (await this.prisma.$queryRawUnsafe(
      `SELECT "id" FROM "webauthn_credentials" WHERE "id" = $1 AND "user_id" = $2 LIMIT 1`,
      credentialRowId,
      user.id,
    )) as Array<{ id: string }>;
    if (!rows[0]) throw new BadRequestException('Appareil introuvable.');
    await this.prisma.$executeRawUnsafe(`DELETE FROM "webauthn_credentials" WHERE "id" = $1`, rows[0].id);
    return { ok: true as const };
  }

  async registrationOptions(user: JwtAuthUser) {
    const { rpID, rpName } = this.rpConfig();
    const existing = (await this.prisma.$queryRawUnsafe(
      `SELECT "credential_id","transports" FROM "webauthn_credentials" WHERE "user_id" = $1`,
      user.id,
    )) as Array<{ credential_id: string; transports: string | null }>;
    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userName: user.email,
      userDisplayName: user.email,
      userID: new TextEncoder().encode(user.id),
      attestationType: 'none',
      excludeCredentials: existing.map((c) => ({
        id: c.credential_id,
        transports: this.parseTransports(c.transports),
      })),
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        residentKey: 'preferred',
        userVerification: 'required',
      },
    });
    await this.storeChallenge({
      userId: user.id,
      email: user.email,
      challenge: options.challenge,
      purpose: 'registration',
    });
    return options;
  }

  async registrationVerify(
    user: JwtAuthUser,
    body: { response: RegistrationResponseJSON; friendlyName?: string },
  ) {
    if (!body?.response) throw new BadRequestException('Réponse WebAuthn manquante.');
    const { rpID, origin } = this.rpConfig();
    const expectedChallenge = await this.takeChallenge({
      userId: user.id,
      purpose: 'registration',
    });
    let verification;
    try {
      verification = await verifyRegistrationResponse({
        response: body.response,
        expectedChallenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
        requireUserVerification: true,
      });
    } catch {
      throw new BadRequestException('Vérification Face ID impossible.');
    }
    if (!verification.verified || !verification.registrationInfo) {
      throw new BadRequestException('Enregistrement Face ID refusé.');
    }
    const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;
    const transports = body.response.response.transports ?? [];
    await this.prisma.$executeRawUnsafe(
      `INSERT INTO "webauthn_credentials"
        ("id","user_id","credential_id","public_key","counter","device_type","backed_up","transports","friendly_name","created_at")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,CURRENT_TIMESTAMP)`,
      randomUUID(),
      user.id,
      credential.id,
      Buffer.from(credential.publicKey),
      BigInt(credential.counter),
      credentialDeviceType,
      credentialBackedUp,
      transports.length ? JSON.stringify(transports) : null,
      body.friendlyName?.trim() || this.defaultDeviceName(),
    );
    return { ok: true as const };
  }

  async authenticationOptions(emailRaw: string) {
    const email = emailRaw.trim();
    if (!email) throw new BadRequestException('Indiquez votre e-mail.');
    const user = await this.prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
    });
    if (!user) {
      throw new UnauthorizedException(
        'Face ID non disponible pour ce compte. Connectez-vous avec le mot de passe, puis activez Face ID dans Mon compte → Sécurité.',
      );
    }
    const creds = (await this.prisma.$queryRawUnsafe(
      `SELECT "credential_id","transports" FROM "webauthn_credentials" WHERE "user_id" = $1`,
      user.id,
    )) as Array<{ credential_id: string; transports: string | null }>;
    if (creds.length === 0) {
      throw new UnauthorizedException(
        'Aucun Face ID / empreinte enregistré. Connectez-vous avec le mot de passe, puis activez-le dans Mon compte → Sécurité.',
      );
    }
    const { rpID } = this.rpConfig();
    const options = await generateAuthenticationOptions({
      rpID,
      userVerification: 'required',
      allowCredentials: creds.map((c) => ({
        id: c.credential_id,
        transports: this.parseTransports(c.transports),
      })),
    });
    await this.storeChallenge({
      userId: user.id,
      email: user.email,
      challenge: options.challenge,
      purpose: 'authentication',
    });
    return options;
  }

  async authenticationVerify(
    body: { email: string; response: AuthenticationResponseJSON },
    getUserPayload: (userId: string) => Promise<AuthUserPayload>,
  ) {
    if (!body?.response || !body.email?.trim()) {
      throw new BadRequestException('Réponse Face ID incomplète.');
    }
    const email = body.email.trim();
    const user = await this.prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      include: {
        organization: {
          select: { platformAccessSuspended: true, platformAccessPaidUntil: true },
        },
      },
    });
    if (!user) throw new UnauthorizedException('Identifiants invalides');

    const credentialId = body.response.id;
    const credRows = (await this.prisma.$queryRawUnsafe(
      `SELECT * FROM "webauthn_credentials" WHERE "user_id" = $1 AND "credential_id" = $2 LIMIT 1`,
      user.id,
      credentialId,
    )) as CredRow[];
    const cred = credRows[0];
    if (!cred) throw new UnauthorizedException('Appareil non reconnu.');

    const { rpID, origin } = this.rpConfig();
    const expectedChallenge = await this.takeChallenge({
      userId: user.id,
      email: user.email,
      purpose: 'authentication',
    });

    let verification;
    try {
      verification = await verifyAuthenticationResponse({
        response: body.response,
        expectedChallenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
        credential: {
          id: cred.credential_id,
          publicKey: new Uint8Array(cred.public_key),
          counter: Number(cred.counter),
          transports: this.parseTransports(cred.transports),
        },
        requireUserVerification: true,
      });
    } catch {
      throw new UnauthorizedException('Face ID refusé.');
    }
    if (!verification.verified) throw new UnauthorizedException('Face ID refusé.');

    await this.prisma.$executeRawUnsafe(
      `UPDATE "webauthn_credentials"
       SET "counter" = $1, "last_used_at" = CURRENT_TIMESTAMP
       WHERE "id" = $2`,
      BigInt(verification.authenticationInfo.newCounter),
      cred.id,
    );

    const role: JwtAuthUserRole = user.role === 'PLATFORM_ADMIN' ? 'PLATFORM_ADMIN' : 'USER';
    assertOrganizationPlatformAccess(role, user.organization);

    const payload = { sub: user.id, email: user.email, organizationId: user.organizationId };
    return {
      accessToken: await this.jwt.signAsync(payload),
      user: await getUserPayload(user.id),
    };
  }

  private parseTransports(raw: string | null): AuthenticatorTransportFuture[] | undefined {
    if (!raw) return undefined;
    try {
      return JSON.parse(raw) as AuthenticatorTransportFuture[];
    } catch {
      return undefined;
    }
  }

  private defaultDeviceName() {
    return `Appareil ${new Date().toLocaleDateString('fr-FR')}`;
  }
}
