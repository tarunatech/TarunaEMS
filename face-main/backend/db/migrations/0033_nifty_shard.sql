CREATE TYPE "public"."amc_contract_status" AS ENUM('Draft', 'Pending Approval', 'Active', 'Expired', 'Cancelled', 'Renewed');--> statement-breakpoint
CREATE TYPE "public"."vendor_bill_payment_method" AS ENUM('Cash', 'UPI', 'Bank Transfer', 'Card', 'Cheque', 'Other');--> statement-breakpoint
CREATE TYPE "public"."vendor_bill_status" AS ENUM('draft', 'received', 'partially_paid', 'paid', 'disputed', 'cancelled');--> statement-breakpoint
CREATE TABLE "amc_contracts" (
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
CREATE TABLE "customer_equipment" (
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
CREATE TABLE "vendor_bill_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"billId" uuid NOT NULL,
	"amount" numeric DEFAULT 0 NOT NULL,
	"paymentMethod" "vendor_bill_payment_method" NOT NULL,
	"paymentDate" varchar(32) NOT NULL,
	"referenceNumber" varchar(255),
	"notes" text,
	"recordedBy" uuid,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vendor_bills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"billNumber" varchar(64) NOT NULL,
	"vendorBillRef" varchar(255),
	"vendorName" varchar(255) NOT NULL,
	"vendorEmail" varchar(255),
	"vendorGstin" varchar(64),
	"purchaseOrderId" uuid,
	"projectId" uuid,
	"supplierId" uuid,
	"billDate" varchar(32) NOT NULL,
	"dueDate" varchar(32) NOT NULL,
	"currency" varchar(10) DEFAULT 'INR' NOT NULL,
	"subtotal" numeric DEFAULT 0 NOT NULL,
	"taxAmount" numeric DEFAULT 0 NOT NULL,
	"totalAmount" numeric DEFAULT 0 NOT NULL,
	"paidAmount" numeric DEFAULT 0 NOT NULL,
	"outstandingAmount" numeric DEFAULT 0 NOT NULL,
	"status" "vendor_bill_status" DEFAULT 'received' NOT NULL,
	"category" varchar(255),
	"description" text,
	"notes" text,
	"cancellationReason" text,
	"cancelledAt" timestamp with time zone,
	"cancelledBy" uuid,
	"createdBy" uuid,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "customer_invoices" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "customer_invoices" ALTER COLUMN "status" SET DEFAULT 'draft'::text;--> statement-breakpoint
DROP TYPE "public"."customer_invoice_status";--> statement-breakpoint
CREATE TYPE "public"."customer_invoice_status" AS ENUM('draft', 'issued', 'partially_paid', 'paid', 'cancelled');--> statement-breakpoint
ALTER TABLE "customer_invoices" ALTER COLUMN "status" SET DEFAULT 'draft'::"public"."customer_invoice_status";--> statement-breakpoint
ALTER TABLE "customer_invoices" ALTER COLUMN "status" SET DATA TYPE "public"."customer_invoice_status" USING "status"::"public"."customer_invoice_status";--> statement-breakpoint
DROP INDEX "customer_invoices_invoiceNumber_unique_idx";--> statement-breakpoint
DROP INDEX "customer_invoices_invoiceDate_idx";--> statement-breakpoint
DROP INDEX "invoice_payment_allocations_paymentTransactionId_idx";--> statement-breakpoint
DROP INDEX "invoice_payment_allocations_allocatedAt_idx";--> statement-breakpoint
ALTER TABLE "customer_invoice_items" ALTER COLUMN "taxRate" SET DEFAULT 0;--> statement-breakpoint
ALTER TABLE "customer_invoices" ALTER COLUMN "invoiceNumber" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "customer_invoices" ALTER COLUMN "clientName" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "customer_invoices" ALTER COLUMN "invoiceDate" SET DATA TYPE varchar(32);--> statement-breakpoint
ALTER TABLE "customer_invoices" ALTER COLUMN "dueDate" SET DATA TYPE varchar(32);--> statement-breakpoint
ALTER TABLE "customer_invoices" ALTER COLUMN "createdBy" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "invoice_payment_allocations" ALTER COLUMN "allocatedBy" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "customer_invoice_items" ADD COLUMN "lineTotal" numeric DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "customer_invoice_items" ADD COLUMN "sortOrder" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "customer_invoices" ADD COLUMN "leadId" uuid;--> statement-breakpoint
ALTER TABLE "customer_invoices" ADD COLUMN "cgstRate" numeric DEFAULT 9 NOT NULL;--> statement-breakpoint
ALTER TABLE "customer_invoices" ADD COLUMN "sgstRate" numeric DEFAULT 9 NOT NULL;--> statement-breakpoint
ALTER TABLE "customer_invoices" ADD COLUMN "igstRate" numeric DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "customer_invoices" ADD COLUMN "cancellationReason" text;--> statement-breakpoint
ALTER TABLE "customer_invoices" ADD COLUMN "cancelledAt" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "customer_invoices" ADD COLUMN "cancelledBy" uuid;--> statement-breakpoint
CREATE UNIQUE INDEX "amc_contracts_contractNumber_unique_idx" ON "amc_contracts" USING btree ("contractNumber");--> statement-breakpoint
CREATE INDEX "amc_contracts_clientId_idx" ON "amc_contracts" USING btree ("clientId");--> statement-breakpoint
CREATE INDEX "amc_contracts_projectId_idx" ON "amc_contracts" USING btree ("projectId");--> statement-breakpoint
CREATE INDEX "amc_contracts_status_idx" ON "amc_contracts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "amc_contracts_endDate_idx" ON "amc_contracts" USING btree ("endDate");--> statement-breakpoint
CREATE INDEX "amc_contracts_previousContractId_idx" ON "amc_contracts" USING btree ("previousContractId");--> statement-breakpoint
CREATE INDEX "amc_contracts_createdAt_idx" ON "amc_contracts" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "customer_equipment_clientId_idx" ON "customer_equipment" USING btree ("clientId");--> statement-breakpoint
CREATE INDEX "customer_equipment_projectId_idx" ON "customer_equipment" USING btree ("projectId");--> statement-breakpoint
CREATE INDEX "customer_equipment_serialNumber_idx" ON "customer_equipment" USING btree ("serialNumber");--> statement-breakpoint
CREATE INDEX "vendor_bill_payments_billId_idx" ON "vendor_bill_payments" USING btree ("billId");--> statement-breakpoint
CREATE INDEX "vendor_bill_payments_paymentDate_idx" ON "vendor_bill_payments" USING btree ("paymentDate");--> statement-breakpoint
CREATE UNIQUE INDEX "vendor_bills_billNumber_unique_idx" ON "vendor_bills" USING btree ("billNumber");--> statement-breakpoint
CREATE INDEX "vendor_bills_vendorName_idx" ON "vendor_bills" USING btree ("vendorName");--> statement-breakpoint
CREATE INDEX "vendor_bills_status_idx" ON "vendor_bills" USING btree ("status");--> statement-breakpoint
CREATE INDEX "vendor_bills_dueDate_idx" ON "vendor_bills" USING btree ("dueDate");--> statement-breakpoint
CREATE INDEX "vendor_bills_billDate_idx" ON "vendor_bills" USING btree ("billDate");--> statement-breakpoint
CREATE INDEX "vendor_bills_purchaseOrderId_idx" ON "vendor_bills" USING btree ("purchaseOrderId");--> statement-breakpoint
CREATE INDEX "vendor_bills_projectId_idx" ON "vendor_bills" USING btree ("projectId");--> statement-breakpoint
CREATE INDEX "vendor_bills_createdAt_idx" ON "vendor_bills" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "customer_invoices_invoiceNumber_idx" ON "customer_invoices" USING btree ("invoiceNumber");--> statement-breakpoint
CREATE INDEX "customer_invoices_leadId_idx" ON "customer_invoices" USING btree ("leadId");--> statement-breakpoint
CREATE INDEX "invoice_payment_allocations_paymentId_idx" ON "invoice_payment_allocations" USING btree ("paymentTransactionId");--> statement-breakpoint
ALTER TABLE "customer_invoice_items" DROP COLUMN "totalAmount";