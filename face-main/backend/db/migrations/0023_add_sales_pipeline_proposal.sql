ALTER TYPE "public"."sales_pipeline_stage" ADD VALUE IF NOT EXISTS 'proposal' AFTER 'admin_approval';--> statement-breakpoint
ALTER TABLE "salesPipelines" ADD COLUMN IF NOT EXISTS "proposal" jsonb DEFAULT '{}'::jsonb NOT NULL;
