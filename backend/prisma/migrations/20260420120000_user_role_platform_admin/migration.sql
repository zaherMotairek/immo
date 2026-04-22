-- Rôle plateforme : seuls les PLATFORM_ADMIN peuvent créer des organisations / comptes clients.

CREATE TYPE "UserRole" AS ENUM ('USER', 'PLATFORM_ADMIN');

ALTER TABLE "User" ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'USER';
