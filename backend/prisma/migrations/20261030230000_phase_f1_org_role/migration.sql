-- Phase F1 : rôles intra-organisation (additive + grandfather OWNER).

CREATE TYPE "OrgMemberRole" AS ENUM ('OWNER', 'ACCOUNTANT', 'COLLECTOR', 'READONLY');

ALTER TABLE "User" ADD COLUMN "org_role" "OrgMemberRole" NOT NULL DEFAULT 'OWNER';
