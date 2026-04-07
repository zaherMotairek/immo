-- Contrat de bail : fichier PDF ou image (optionnel)
ALTER TABLE "leases" ADD COLUMN "contract_file_original_name" TEXT;
ALTER TABLE "leases" ADD COLUMN "contract_file_mime" TEXT;
ALTER TABLE "leases" ADD COLUMN "contract_file_size" INTEGER;
ALTER TABLE "leases" ADD COLUMN "contract_file_key" TEXT;
ALTER TABLE "leases" ADD COLUMN "contract_uploaded_at" TIMESTAMP(3);
