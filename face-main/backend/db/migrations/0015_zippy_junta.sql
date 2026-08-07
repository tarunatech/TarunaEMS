CREATE TYPE "public"."problem_status" AS ENUM('Pending', 'Solved');--> statement-breakpoint
CREATE TABLE "problems" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"description" varchar(4096) NOT NULL,
	"reportedBy" uuid NOT NULL,
	"solvedBy" uuid,
	"status" "problem_status" DEFAULT 'Pending' NOT NULL,
	"solvedAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "problems_status_idx" ON "problems" USING btree ("status");--> statement-breakpoint
CREATE INDEX "problems_reportedBy_idx" ON "problems" USING btree ("reportedBy");--> statement-breakpoint
CREATE INDEX "problems_createdAt_idx" ON "problems" USING btree ("createdAt");