CREATE TYPE "public"."user_role" AS ENUM('admin', 'employee');--> statement-breakpoint
CREATE TABLE "departments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"code" varchar(64) NOT NULL,
	"description" varchar(2048) DEFAULT '',
	"manager" varchar(255) DEFAULT '',
	"location" varchar(255) DEFAULT '',
	"budget" numeric(14, 2) DEFAULT '0' NOT NULL,
	"status" varchar(32) DEFAULT 'Active' NOT NULL,
	"establishedDate" timestamp DEFAULT now() NOT NULL,
	"goals" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"parentDepartment" uuid,
	"employeeCount" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP INDEX "users_employeeId_unique_idx";--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'employee'::"public"."user_role";--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" SET DATA TYPE "public"."user_role" USING "role"::"public"."user_role";--> statement-breakpoint
CREATE UNIQUE INDEX "departments_name_unique_idx" ON "departments" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "departments_code_unique_idx" ON "departments" USING btree ("code");