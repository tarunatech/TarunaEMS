CREATE TYPE "public"."day_book_status" AS ENUM('Pending', 'Draft', 'Submitted', 'Approved', 'Rejected');--> statement-breakpoint
CREATE TABLE "dayBooks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee" uuid NOT NULL,
	"date" timestamp with time zone DEFAULT now() NOT NULL,
	"slots" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" "day_book_status" DEFAULT 'Draft' NOT NULL,
	"adminComment" varchar(2048),
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "dayBooks_employee_idx" ON "dayBooks" USING btree ("employee");--> statement-breakpoint
CREATE INDEX "dayBooks_date_idx" ON "dayBooks" USING btree ("date");--> statement-breakpoint
CREATE UNIQUE INDEX "dayBooks_employee_date_unique_idx" ON "dayBooks" USING btree ("employee","date");