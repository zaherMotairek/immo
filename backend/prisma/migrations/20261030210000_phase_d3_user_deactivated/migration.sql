-- D3 : désactivation utilisateur client (table Prisma "User")
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "deactivated_at" TIMESTAMP(3);
