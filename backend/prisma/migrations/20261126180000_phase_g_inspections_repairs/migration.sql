-- Phase G : états des lieux numériques & suivi réparations (tables additives)

CREATE TYPE "InspectionKind" AS ENUM ('MOVE_IN', 'MOVE_OUT');
CREATE TYPE "InspectionItemCondition" AS ENUM ('GOOD', 'WORN', 'DAMAGED', 'UNCHECKED');
CREATE TYPE "InspectionStatus" AS ENUM ('DRAFT', 'SIGNED');
CREATE TYPE "DepositRefundDecision" AS ENUM ('PENDING', 'FULL', 'PARTIAL', 'WITHHOLD');
CREATE TYPE "RepairUrgency" AS ENUM ('LOW', 'NORMAL', 'HIGH');
CREATE TYPE "RepairStatus" AS ENUM ('TODO', 'QUOTE_RECEIVED', 'IN_PROGRESS', 'DONE');

CREATE TABLE "inspection_checklist_templates" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit_kind" "UnitKind",
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "inspection_checklist_templates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "inspection_checklist_template_items" (
    "id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "room" VARCHAR(120) NOT NULL,
    "element" VARCHAR(200) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "inspection_checklist_template_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "lease_inspections" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "lease_id" TEXT NOT NULL,
    "kind" "InspectionKind" NOT NULL,
    "status" "InspectionStatus" NOT NULL DEFAULT 'DRAFT',
    "tenant_signature_name" VARCHAR(200),
    "signed_at" TIMESTAMP(3),
    "deposit_refund_decision" "DepositRefundDecision",
    "deposit_refund_note" VARCHAR(500),
    "compared_move_in_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "lease_inspections_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "lease_inspection_items" (
    "id" TEXT NOT NULL,
    "inspection_id" TEXT NOT NULL,
    "room" VARCHAR(120) NOT NULL,
    "element" VARCHAR(200) NOT NULL,
    "condition" "InspectionItemCondition" NOT NULL DEFAULT 'UNCHECKED',
    "note" VARCHAR(500),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "lease_inspection_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "lease_inspection_photos" (
    "id" TEXT NOT NULL,
    "inspection_id" TEXT NOT NULL,
    "item_id" TEXT,
    "file_key" TEXT NOT NULL,
    "original_name" TEXT,
    "mime" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "caption" VARCHAR(300),
    "taken_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "lease_inspection_photos_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "repair_requests" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "building_id" TEXT NOT NULL,
    "unit_id" TEXT,
    "title" VARCHAR(200) NOT NULL,
    "urgency" "RepairUrgency" NOT NULL DEFAULT 'NORMAL',
    "status" "RepairStatus" NOT NULL DEFAULT 'TODO',
    "note" TEXT,
    "contractor_name" VARCHAR(200),
    "contractor_phone" VARCHAR(40),
    "estimated_cost" DECIMAL(12,2),
    "final_cost" DECIMAL(12,2),
    "deadline" DATE,
    "completed_at" TIMESTAMP(3),
    "charge_id" TEXT,
    "late_reminder_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "repair_requests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "repair_photos" (
    "id" TEXT NOT NULL,
    "repair_id" TEXT NOT NULL,
    "file_key" TEXT NOT NULL,
    "original_name" TEXT,
    "mime" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "caption" VARCHAR(300),
    "taken_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "repair_photos_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "inspection_checklist_templates_organization_id_idx" ON "inspection_checklist_templates"("organization_id");
CREATE INDEX "inspection_checklist_template_items_template_id_idx" ON "inspection_checklist_template_items"("template_id");
CREATE INDEX "lease_inspections_organization_id_idx" ON "lease_inspections"("organization_id");
CREATE INDEX "lease_inspections_lease_id_idx" ON "lease_inspections"("lease_id");
CREATE INDEX "lease_inspection_items_inspection_id_idx" ON "lease_inspection_items"("inspection_id");
CREATE INDEX "lease_inspection_photos_inspection_id_idx" ON "lease_inspection_photos"("inspection_id");
CREATE INDEX "lease_inspection_photos_item_id_idx" ON "lease_inspection_photos"("item_id");
CREATE INDEX "repair_requests_organization_id_idx" ON "repair_requests"("organization_id");
CREATE INDEX "repair_requests_building_id_idx" ON "repair_requests"("building_id");
CREATE INDEX "repair_requests_status_idx" ON "repair_requests"("status");
CREATE INDEX "repair_photos_repair_id_idx" ON "repair_photos"("repair_id");

CREATE UNIQUE INDEX "repair_requests_charge_id_key" ON "repair_requests"("charge_id");

ALTER TABLE "inspection_checklist_templates" ADD CONSTRAINT "inspection_checklist_templates_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "inspection_checklist_template_items" ADD CONSTRAINT "inspection_checklist_template_items_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "inspection_checklist_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lease_inspections" ADD CONSTRAINT "lease_inspections_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lease_inspections" ADD CONSTRAINT "lease_inspections_lease_id_fkey" FOREIGN KEY ("lease_id") REFERENCES "leases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lease_inspection_items" ADD CONSTRAINT "lease_inspection_items_inspection_id_fkey" FOREIGN KEY ("inspection_id") REFERENCES "lease_inspections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lease_inspection_photos" ADD CONSTRAINT "lease_inspection_photos_inspection_id_fkey" FOREIGN KEY ("inspection_id") REFERENCES "lease_inspections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lease_inspection_photos" ADD CONSTRAINT "lease_inspection_photos_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "lease_inspection_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "repair_requests" ADD CONSTRAINT "repair_requests_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "repair_requests" ADD CONSTRAINT "repair_requests_building_id_fkey" FOREIGN KEY ("building_id") REFERENCES "buildings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "repair_requests" ADD CONSTRAINT "repair_requests_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "repair_requests" ADD CONSTRAINT "repair_requests_charge_id_fkey" FOREIGN KEY ("charge_id") REFERENCES "charges"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "repair_photos" ADD CONSTRAINT "repair_photos_repair_id_fkey" FOREIGN KEY ("repair_id") REFERENCES "repair_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;