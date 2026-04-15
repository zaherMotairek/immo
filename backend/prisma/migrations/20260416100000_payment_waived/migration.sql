-- AlterEnum
ALTER TYPE "PaymentStatus" ADD VALUE 'WAIVED';

-- AlterTable
ALTER TABLE "payments" ADD COLUMN "waive_reason" TEXT,
ADD COLUMN "waived_at" DATE;
