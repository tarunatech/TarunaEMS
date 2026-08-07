CREATE TYPE "public"."holiday_type" AS ENUM('Public', 'Optional', 'Company');--> statement-breakpoint
CREATE TABLE "holidays" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(255) NOT NULL,
	"date" timestamp with time zone NOT NULL,
	"description" varchar(2048),
	"type" "holiday_type" DEFAULT 'Public' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "holidays_date_idx" ON "holidays" USING btree ("date");--> statement-breakpoint
CREATE UNIQUE INDEX "holidays_date_unique_idx" ON "holidays" USING btree ("date");