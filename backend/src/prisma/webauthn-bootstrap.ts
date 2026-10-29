import type { PrismaClient } from '@prisma/client';

const TAG = '[webauthn-bootstrap]';

/** Tables Face ID / passkeys si migrate pas encore appliqué (Render). */
export async function runWebAuthnBootstrap(prisma: PrismaClient): Promise<void> {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "webauthn_credentials" (
        "id" TEXT NOT NULL,
        "user_id" TEXT NOT NULL,
        "credential_id" TEXT NOT NULL,
        "public_key" BYTEA NOT NULL,
        "counter" BIGINT NOT NULL DEFAULT 0,
        "device_type" TEXT,
        "backed_up" BOOLEAN NOT NULL DEFAULT false,
        "transports" TEXT,
        "friendly_name" TEXT,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "last_used_at" TIMESTAMP(3),
        CONSTRAINT "webauthn_credentials_pkey" PRIMARY KEY ("id")
      )
    `);
    await prisma.$executeRawUnsafe(
      `CREATE UNIQUE INDEX IF NOT EXISTS "webauthn_credentials_credential_id_key" ON "webauthn_credentials"("credential_id")`,
    );
    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "webauthn_credentials_user_id_idx" ON "webauthn_credentials"("user_id")`,
    );

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "webauthn_challenges" (
        "id" TEXT NOT NULL,
        "user_id" TEXT,
        "email" TEXT,
        "challenge" TEXT NOT NULL,
        "purpose" TEXT NOT NULL,
        "expires_at" TIMESTAMP(3) NOT NULL,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "webauthn_challenges_pkey" PRIMARY KEY ("id")
      )
    `);
    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "webauthn_challenges_user_id_idx" ON "webauthn_challenges"("user_id")`,
    );
    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "webauthn_challenges_email_idx" ON "webauthn_challenges"("email")`,
    );
    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "webauthn_challenges_expires_at_idx" ON "webauthn_challenges"("expires_at")`,
    );
  } catch (e) {
    console.error(TAG, 'bootstrap webauthn tables', e);
  }
}
