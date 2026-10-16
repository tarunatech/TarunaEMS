CREATE TYPE "public"."budget_status" AS ENUM('Draft', 'Pending Approval', 'Approved', 'Rejected', 'Superseded');--> statement-breakpoint
CREATE TYPE "public"."customer_invoice_status" AS ENUM('Draft', 'Issued', 'Partially Paid', 'Paid', 'Cancelled');--> statement-breakpoint
CREATE TYPE "public"."customer_invoice_tax_type" AS ENUM('CGST_SGST', 'IGST', 'None');--> statement-breakpoint
CREATE TABLE "project_budget_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"budgetId" uuid NOT NULL,
	"category" varchar(255) NOT NULL,
	"description" text,
	"plannedAmount" numeric DEFAULT 0 NOT NULL,
	"approvedAmount" numeric DEFAULT 0 NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_budgets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"projectId" uuid NOT NULL,
	"budgetNumber" varchar(64) NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"status" "budget_status" DEFAULT 'Draft' NOT NULL,
	"totalPlannedAmount" numeric DEFAULT 0 NOT NULL,
	"totalApprovedAmount" numeric DEFAULT 0 NOT NULL,
	"currency" varchar(10) DEFAULT 'INR' NOT NULL,
	"notes" text,
	"createdBy" uuid NOT NULL,
	"approvedBy" uuid,
	"approvedAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_invoice_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoiceId" uuid NOT NULL,
	"description" text NOT NULL,
	"quantity" numeric DEFAULT 1 NOT NULL,
	"unitPrice" numeric DEFAULT 0 NOT NULL,
	"taxableAmount" numeric DEFAULT 0 NOT NULL,
	"taxRate" numeric DEFAULT 18 NOT NULL,
	"taxAmount" numeric DEFAULT 0 NOT NULL,
	"totalAmount" numeric DEFAULT 0 NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoiceNumber" varchar(64) NOT NULL,
	"clientId" uuid,
	"clientName" varchar(255) NOT NULL,
	"projectId" uuid,
	"milestoneIndex" integer,
	"milestoneName" varchar(255),
	"invoiceDate" timestamp with time zone NOT NULL,
	"dueDate" timestamp with time zone NOT NULL,
	"status" "customer_invoice_status" DEFAULT 'Draft' NOT NULL,
	"currency" varchar(10) DEFAULT 'INR' NOT NULL,
	"subtotal" numeric DEFAULT 0 NOT NULL,
	"discountAmount" numeric DEFAULT 0 NOT NULL,
	"taxableAmount" numeric DEFAULT 0 NOT NULL,
	"taxType" "customer_invoice_tax_type" DEFAULT 'CGST_SGST' NOT NULL,
	"taxRate" numeric DEFAULT 18 NOT NULL,
	"cgstAmount" numeric DEFAULT 0 NOT NULL,
	"sgstAmount" numeric DEFAULT 0 NOT NULL,
	"igstAmount" numeric DEFAULT 0 NOT NULL,
	"taxAmount" numeric DEFAULT 0 NOT NULL,
	"totalAmount" numeric DEFAULT 0 NOT NULL,
	"paidAmount" numeric DEFAULT 0 NOT NULL,
	"outstandingAmount" numeric DEFAULT 0 NOT NULL,
	"notes" text,
	"terms" text,
	"cancelReason" text,
	"createdBy" uuid NOT NULL,
	"issuedBy" uuid,
	"issuedAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoice_payment_allocations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"paymentTransactionId" uuid NOT NULL,
	"invoiceId" uuid NOT NULL,
	"allocatedAmount" numeric DEFAULT 0 NOT NULL,
	"allocatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	"allocatedBy" uuid NOT NULL,
	"notes" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "expenseTransactions" ADD COLUMN "projectId" uuid;--> statement-breakpoint
ALTER TABLE "expenseTransactions" ADD COLUMN "leadId" uuid;--> statement-breakpoint
ALTER TABLE "purchaseOrders" ADD COLUMN "projectId" uuid;--> statement-breakpoint
CREATE INDEX "project_budget_items_budgetId_idx" ON "project_budget_items" USING btree ("budgetId");--> statement-breakpoint
CREATE INDEX "project_budget_items_category_idx" ON "project_budget_items" USING btree ("category");--> statement-breakpoint
CREATE INDEX "project_budgets_projectId_idx" ON "project_budgets" USING btree ("projectId");--> statement-breakpoint
CREATE INDEX "project_budgets_status_idx" ON "project_budgets" USING btree ("status");--> statement-breakpoint
CREATE INDEX "project_budgets_budgetNumber_idx" ON "project_budgets" USING btree ("budgetNumber");--> statement-breakpoint
CREATE UNIQUE INDEX "project_budgets_project_version_unique_idx" ON "project_budgets" USING btree ("projectId","version");--> statement-breakpoint
CREATE INDEX "project_budgets_createdAt_idx" ON "project_budgets" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "customer_invoice_items_invoiceId_idx" ON "customer_invoice_items" USING btree ("invoiceId");--> statement-breakpoint
CREATE UNIQUE INDEX "customer_invoices_invoiceNumber_unique_idx" ON "customer_invoices" USING btree ("invoiceNumber");--> statement-breakpoint
CREATE INDEX "customer_invoices_projectId_idx" ON "customer_invoices" USING btree ("projectId");--> statement-breakpoint
CREATE INDEX "customer_invoices_clientId_idx" ON "customer_invoices" USING btree ("clientId");--> statement-breakpoint
CREATE INDEX "customer_invoices_status_idx" ON "customer_invoices" USING btree ("status");--> statement-breakpoint
CREATE INDEX "customer_invoices_invoiceDate_idx" ON "customer_invoices" USING btree ("invoiceDate");--> statement-breakpoint
CREATE INDEX "customer_invoices_dueDate_idx" ON "customer_invoices" USING btree ("dueDate");--> statement-breakpoint
CREATE INDEX "customer_invoices_createdAt_idx" ON "customer_invoices" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "invoice_payment_allocations_paymentTransactionId_idx" ON "invoice_payment_allocations" USING btree ("paymentTransactionId");--> statement-breakpoint
CREATE INDEX "invoice_payment_allocations_invoiceId_idx" ON "invoice_payment_allocations" USING btree ("invoiceId");--> statement-breakpoint
CREATE INDEX "invoice_payment_allocations_allocatedAt_idx" ON "invoice_payment_allocations" USING btree ("allocatedAt");--> statement-breakpoint
CREATE INDEX "expenseTransactions_projectId_idx" ON "expenseTransactions" USING btree ("projectId");--> statement-breakpoint
CREATE INDEX "expenseTransactions_leadId_idx" ON "expenseTransactions" USING btree ("leadId");--> statement-breakpoint
CREATE INDEX "purchaseOrders_projectId_idx" ON "purchaseOrders" USING btree ("projectId");