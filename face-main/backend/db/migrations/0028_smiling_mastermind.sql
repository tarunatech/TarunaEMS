DO $$ BEGIN
  CREATE TYPE "public"."project_status" AS ENUM('Planning', 'Active', 'On Hold', 'Completed', 'Cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "offer_letters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employeeName" varchar(255) NOT NULL,
	"role" varchar(255) NOT NULL,
	"joiningDate" varchar(128) NOT NULL,
	"companyName" varchar(255) DEFAULT 'Taruna Technology' NOT NULL,
	"location" varchar(255) DEFAULT 'Vadodara' NOT NULL,
	"duration" varchar(128) DEFAULT 'three (3) months' NOT NULL,
	"workingHours" varchar(255) DEFAULT '10:00 AM to 7:00 PM, Monday to Saturday' NOT NULL,
	"signatoryName" varchar(255) DEFAULT 'MIHIR MAKWANA' NOT NULL,
	"signatoryRole" varchar(255) DEFAULT 'Operational Manager' NOT NULL,
	"employeeId" varchar(128),
	"candidateId" varchar(128),
	"pdfPath" varchar(1024),
	"status" varchar(64) DEFAULT 'Generated' NOT NULL,
	"createdBy" uuid NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
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
ALTER TABLE "dayBooks" ADD COLUMN IF NOT EXISTS "isHalfDay" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "dayBooks" ADD COLUMN IF NOT EXISTS "halfDayType" varchar(32) DEFAULT 'full';--> statement-breakpoint
ALTER TABLE "dayBooks" ADD COLUMN IF NOT EXISTS "includeBreak" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "projectId" uuid;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "achievedSoFar" text DEFAULT '' NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "offer_letters_created_by_idx" ON "offer_letters" USING btree ("createdBy");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "offer_letters_employee_name_idx" ON "offer_letters" USING btree ("employeeName");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "offer_letters_created_at_idx" ON "offer_letters" USING btree ("createdAt");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "projects_projectCode_unique_idx" ON "projects" USING btree ("projectCode");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "projects_pipelineId_unique_idx" ON "projects" USING btree ("pipelineId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "projects_leadId_idx" ON "projects" USING btree ("leadId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "projects_status_idx" ON "projects" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "projects_projectManager_idx" ON "projects" USING btree ("projectManager");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "projects_createdAt_idx" ON "projects" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tasks_projectId_idx" ON "tasks" USING btree ("projectId");