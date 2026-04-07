-- Pièce d'identité / passeport (scan ou photo)
ALTER TABLE "tenants" ADD COLUMN "id_doc_original_name" TEXT;
ALTER TABLE "tenants" ADD COLUMN "id_doc_mime" TEXT;
ALTER TABLE "tenants" ADD COLUMN "id_doc_size" INTEGER;
ALTER TABLE "tenants" ADD COLUMN "id_doc_file_key" TEXT;
ALTER TABLE "tenants" ADD COLUMN "id_doc_uploaded_at" TIMESTAMP(3);
