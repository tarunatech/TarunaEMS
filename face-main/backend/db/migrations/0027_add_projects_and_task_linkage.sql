DO $$ BEGIN
  CREATE TYPE "public"."project_status" AS ENUM ('Planning', 'Active', 'On Hold', 'Completed', 'Cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "projects" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "projectCode" varchar(64) NOT NULL,
  "name" varchar(255) NOT NULL,
  "description" text,
  "leadId" uuid,
  "pipelineId" uuid,
  "status" "project_status" DEFAULT 'Planning' NOT NULL,
  "contractValue" numeric DEFAULT 0 NOT NULL,
  "approvedBudget" numeric DEFAULT 0 NOT NULL,
  "billingSchedule" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "currency" varchar(10) DEFAULT 'INR' NOT NULL,
  "startDate" timestamp with time zone,
  "endDate" timestamp with time zone,
  "projectManager" uuid,
  "clientName" varchar(255),
  "createdBy" uuid,
  "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
  "updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "projects_projectCode_unique_idx" ON "projects" USING btree ("projectCode");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "projects_pipelineId_unique_idx" ON "projects" USING btree ("pipelineId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "projects_leadId_idx" ON "projects" USING btree ("leadId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "projects_status_idx" ON "projects" USING btree ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "projects_projectManager_idx" ON "projects" USING btree ("projectManager");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "projects_createdAt_idx" ON "projects" USING btree ("createdAt");
--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "projectId" uuid;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tasks_projectId_idx" ON "tasks" USING btree ("projectId");
