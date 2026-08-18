ALTER TYPE "public"."sales_pipeline_stage" ADD VALUE 'proposal' BEFORE 'sent_to_client';--> statement-breakpoint
ALTER TABLE "salesPipelines" ADD COLUMN "proposal" jsonb DEFAULT '{}'::jsonb NOT NULL;