DO $$ BEGIN
  CREATE TYPE "public"."budget_status" AS ENUM('Draft', 'Pending Approval', 'Approved', 'Rejected', 'Superseded');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "project_budgets" (
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
CREATE TABLE IF NOT EXISTS "project_budget_items" (
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
ALTER TABLE "purchaseOrders" ADD COLUMN IF NOT EXISTS "projectId" uuid;--> statement-breakpoint
ALTER TABLE "expenseTransactions" ADD COLUMN IF NOT EXISTS "projectId" uuid;--> statement-breakpoint
ALTER TABLE "expenseTransactions" ADD COLUMN IF NOT EXISTS "leadId" uuid;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "project_budgets_projectId_idx" ON "project_budgets" USING btree ("projectId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "project_budgets_status_idx" ON "project_budgets" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "project_budgets_budgetNumber_idx" ON "project_budgets" USING btree ("budgetNumber");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "project_budgets_project_version_unique_idx" ON "project_budgets" USING btree ("projectId","version");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "project_budgets_createdAt_idx" ON "project_budgets" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "project_budget_items_budgetId_idx" ON "project_budget_items" USING btree ("budgetId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "project_budget_items_category_idx" ON "project_budget_items" USING btree ("category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "purchaseOrders_projectId_idx" ON "purchaseOrders" USING btree ("projectId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "expenseTransactions_projectId_idx" ON "expenseTransactions" USING btree ("projectId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "expenseTransactions_leadId_idx" ON "expenseTransactions" USING btree ("leadId");--> statement-breakpoint
