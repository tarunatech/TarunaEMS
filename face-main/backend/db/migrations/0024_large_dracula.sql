ALTER TABLE "problems" ADD COLUMN "assignedTo" uuid;--> statement-breakpoint
CREATE INDEX "problems_assignedTo_idx" ON "problems" USING btree ("assignedTo");