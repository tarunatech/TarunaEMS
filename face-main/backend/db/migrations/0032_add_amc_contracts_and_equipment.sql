DO $$ BEGIN
  CREATE TYPE "public"."amc_contract_status" AS ENUM('Draft', 'Pending Approval', 'Active', 'Expired', 'Cancelled', 'Renewed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE SEQUENCE IF NOT EXISTS "amc_contract_number_seq" START WITH 1001 INCREMENT BY 1;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "customer_equipment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clientId" uuid NOT NULL,
	"clientName" varchar(255),
	"projectId" uuid,
	"equipmentName" varchar(255) NOT NULL,
	"modelNumber" varchar(255),
	"serialNumber" varchar(255),
	"category" varchar(128),
	"location" varchar(255),
	"installationDate" varchar(32),
	"warrantyStartDate" varchar(32),
	"warrantyEndDate" varchar(32),
	"status" varchar(64) DEFAULT 'Operational' NOT NULL,
	"notes" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "amc_contracts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contractNumber" varchar(64) NOT NULL,
	"title" varchar(255) NOT NULL,
	"clientId" uuid NOT NULL,
	"clientName" varchar(255) NOT NULL,
	"projectId" uuid,
	"projectCode" varchar(64),
	"projectName" varchar(255),
	"contractType" varchar(32) DEFAULT 'New' NOT NULL,
	"previousContractId" uuid,
	"status" "amc_contract_status" DEFAULT 'Draft' NOT NULL,
	"startDate" varchar(32) NOT NULL,
	"endDate" varchar(32) NOT NULL,
	"durationMonths" integer DEFAULT 12 NOT NULL,
	"signingDate" varchar(32),
	"coverageType" varchar(64) DEFAULT 'Comprehensive' NOT NULL,
	"coveredEquipment" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"coveredServices" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"excludedServices" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"preventiveVisitCount" integer DEFAULT 4 NOT NULL,
	"coverageNotes" text,
	"contractValue" numeric DEFAULT 0 NOT NULL,
	"currency" varchar(10) DEFAULT 'INR' NOT NULL,
	"billingFrequency" varchar(32) DEFAULT 'Annual' NOT NULL,
	"billingStartDate" varchar(32),
	"paymentTerms" varchar(255),
	"renewalTerms" text,
	"commercialNotes" text,
	"plannedInstallments" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"documentPath" varchar(1024),
	"documentOriginalName" varchar(255),
	"documentSize" integer,
	"documentMimeType" varchar(128),
	"internalNotes" text,
	"approvedBy" uuid,
	"approvedAt" timestamp with time zone,
	"createdBy" uuid,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "customer_equipment_clientId_idx" ON "customer_equipment" USING btree ("clientId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "customer_equipment_projectId_idx" ON "customer_equipment" USING btree ("projectId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "customer_equipment_serialNumber_idx" ON "customer_equipment" USING btree ("serialNumber");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "amc_contracts_contractNumber_unique_idx" ON "amc_contracts" USING btree ("contractNumber");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "amc_contracts_clientId_idx" ON "amc_contracts" USING btree ("clientId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "amc_contracts_projectId_idx" ON "amc_contracts" USING btree ("projectId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "amc_contracts_status_idx" ON "amc_contracts" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "amc_contracts_endDate_idx" ON "amc_contracts" USING btree ("endDate");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "amc_contracts_previousContractId_idx" ON "amc_contracts" USING btree ("previousContractId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "amc_contracts_createdAt_idx" ON "amc_contracts" USING btree ("createdAt");
