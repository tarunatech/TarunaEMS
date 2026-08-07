CREATE TYPE "public"."attendance_status" AS ENUM('Present', 'Late', 'Half Day', 'Absent', 'Work from Home');--> statement-breakpoint
CREATE TYPE "public"."employee_status" AS ENUM('Active', 'Inactive', 'On Leave', 'Terminated');--> statement-breakpoint
CREATE TYPE "public"."face_registration_method" AS ENUM('single', 'multi-angle', 'video');--> statement-breakpoint
CREATE TABLE "attendance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee" uuid NOT NULL,
	"user" uuid NOT NULL,
	"date" timestamp with time zone DEFAULT now() NOT NULL,
	"checkInTime" timestamp with time zone NOT NULL,
	"checkOutTime" timestamp with time zone,
	"checkInLocation" jsonb NOT NULL,
	"checkOutLocation" jsonb,
	"workingHours" integer DEFAULT 0 NOT NULL,
	"status" "attendance_status" DEFAULT 'Present' NOT NULL,
	"isLate" boolean DEFAULT false NOT NULL,
	"lateMinutes" integer DEFAULT 0 NOT NULL,
	"notes" varchar(4096) DEFAULT '',
	"approvedBy" uuid,
	"ipAddress" varchar(128) DEFAULT '',
	"deviceInfo" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"isManualEntry" boolean DEFAULT false NOT NULL,
	"manualEntryReason" varchar(2048) DEFAULT '',
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP INDEX "employees_workInfo_department_idx";--> statement-breakpoint
ALTER TABLE "employees" ALTER COLUMN "status" SET DEFAULT 'Active'::"public"."employee_status";--> statement-breakpoint
ALTER TABLE "employees" ALTER COLUMN "status" SET DATA TYPE "public"."employee_status" USING "status"::"public"."employee_status";--> statement-breakpoint
ALTER TABLE "employees" ALTER COLUMN "faceRegistrationDate" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "employees" ALTER COLUMN "faceRegistrationMethod" SET DATA TYPE "public"."face_registration_method" USING "faceRegistrationMethod"::"public"."face_registration_method";--> statement-breakpoint
ALTER TABLE "employees" ALTER COLUMN "createdAt" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "employees" ALTER COLUMN "createdAt" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "employees" ALTER COLUMN "updatedAt" SET DATA TYPE timestamp with time zone;--> statement-breakpoint
ALTER TABLE "employees" ALTER COLUMN "updatedAt" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "workInfoDepartment" uuid;--> statement-breakpoint
CREATE INDEX "attendance_user_date_idx" ON "attendance" USING btree ("user","date");--> statement-breakpoint
CREATE INDEX "attendance_date_idx" ON "attendance" USING btree ("date");--> statement-breakpoint
CREATE INDEX "attendance_status_idx" ON "attendance" USING btree ("status");--> statement-breakpoint
CREATE INDEX "attendance_checkInTime_idx" ON "attendance" USING btree ("checkInTime");--> statement-breakpoint
CREATE UNIQUE INDEX "attendance_employee_date_unique_idx" ON "attendance" USING btree ("employee","date");--> statement-breakpoint
CREATE INDEX "employees_workInfoDepartment_idx" ON "employees" USING btree ("workInfoDepartment");