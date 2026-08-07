CREATE TYPE "public"."sales_pipeline_stage" AS ENUM('client_details', 'quotation', 'admin_approval', 'sent_to_client', 'negotiation', 'won_closed');--> statement-breakpoint
CREATE TABLE "salesPipelines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead" uuid NOT NULL,
	"currentStage" "sales_pipeline_stage" DEFAULT 'client_details' NOT NULL,
	"clientDetails" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"quotation" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"approval" jsonb DEFAULT '{"status":"not_submitted","history":[]}'::jsonb NOT NULL,
	"sentToClient" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"negotiation" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"outcome" jsonb DEFAULT '{"status":"open"}'::jsonb NOT NULL,
	"stageHistory" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "salesPipelines_lead_unique_idx" ON "salesPipelines" USING btree ("lead");--> statement-breakpoint
CREATE INDEX "salesPipelines_lead_idx" ON "salesPipelines" USING btree ("lead");--> statement-breakpoint
CREATE INDEX "salesPipelines_currentStage_idx" ON "salesPipelines" USING btree ("currentStage");--> statement-breakpoint
CREATE INDEX "salesPipelines_updatedAt_idx" ON "salesPipelines" USING btree ("updatedAt");