-- CreateEnum
CREATE TYPE "CollectionMethod" AS ENUM ('CASH', 'BANK_TRANSFER', 'ORANGE_MONEY', 'MTN_MONEY', 'MOOV', 'WAVE', 'OTHER');

-- CreateEnum
CREATE TYPE "ReminderChannel" AS ENUM ('EMAIL', 'WHATSAPP');

-- AlterTable
ALTER TABLE "payments" ADD COLUMN "collection_method" "CollectionMethod",
ADD COLUMN "collection_reference" VARCHAR(120);

-- CreateTable
CREATE TABLE "payment_reminders" (
    "id" TEXT NOT NULL,
    "payment_id" TEXT NOT NULL,
    "channel" "ReminderChannel" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_reminders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "payment_reminders_payment_id_idx" ON "payment_reminders"("payment_id");

-- AddForeignKey
ALTER TABLE "payment_reminders" ADD CONSTRAINT "payment_reminders_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
