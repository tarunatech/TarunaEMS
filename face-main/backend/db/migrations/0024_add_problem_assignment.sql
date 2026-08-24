ALTER TABLE "problems" ADD COLUMN IF NOT EXISTS "assignedTo" uuid;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "problems_assignedTo_idx" ON "problems" ("assignedTo");
