import type { PrismaClient } from '@prisma/client';

const TAG = '[signature-receipt-share-bootstrap]';

export async function runSignatureAndReceiptShareBootstrap(prisma: PrismaClient): Promise<void> {
  try {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "receipt_signature_file_key" TEXT`,
    );
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "receipt_signature_mime" TEXT`,
    );
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "receipt_signature_uploaded_at" TIMESTAMP(3)`,
    );
  } catch (e) {
    console.error(TAG, 'alter organizations receipt signature columns', e);
  }

  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "receipt_share_tokens" (
        "id" TEXT NOT NULL,
        "token" TEXT NOT NULL,
        "organization_id" TEXT NOT NULL,
        "payment_id" TEXT NOT NULL,
        "created_by_user_id" TEXT,
        "expires_at" TIMESTAMP(3) NOT NULL,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "receipt_share_tokens_pkey" PRIMARY KEY ("id")
      )
    `);
    await prisma.$executeRawUnsafe(
      `CREATE UNIQUE INDEX IF NOT EXISTS "receipt_share_tokens_token_key" ON "receipt_share_tokens" ("token")`,
    );
    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "receipt_share_tokens_expires_at_idx" ON "receipt_share_tokens" ("expires_at")`,
    );
  } catch (e) {
    console.error(TAG, 'create receipt_share_tokens', e);
  }
}
