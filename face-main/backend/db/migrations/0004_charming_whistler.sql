CREATE TYPE "public"."half_day_session" AS ENUM('Morning', 'Evening');--> statement-breakpoint
CREATE TYPE "public"."leave_priority" AS ENUM('Low', 'Medium', 'High', 'Emergency');--> statement-breakpoint
CREATE TYPE "public"."leave_status" AS ENUM('Pending', 'Approved', 'Rejected', 'Cancelled');--> statement-breakpoint
CREATE TYPE "public"."leave_type" AS ENUM('casual', 'sick', 'earned', 'maternity', 'paternity', 'emergency', 'personal');--> statement-breakpoint
CREATE TABLE "leaves" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee" uuid NOT NULL,
	"user" uuid NOT NULL,
	"leaveType" "leave_type" NOT NULL,
	"startDate" timestamp with time zone NOT NULL,
	"endDate" timestamp with time zone NOT NULL,
	"totalDays" numeric NOT NULL,
	"reason" varchar(500) NOT NULL,
	"status" "leave_status" DEFAULT 'Pending' NOT NULL,
	"appliedDate" timestamp with time zone DEFAULT now() NOT NULL,
	"actionDate" timestamp with time zone,
	"actionBy" uuid,
	"approverComments" varchar(300),
	"attachment" jsonb,
	"isHalfDay" boolean DEFAULT false NOT NULL,
	"halfDaySession" "half_day_session",
	"contactDuringLeave" jsonb,
	"workHandover" jsonb,
	"priority" "leave_priority" DEFAULT 'Medium' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "leaves_employee_idx" ON "leaves" USING btree ("employee");--> statement-breakpoint
CREATE INDEX "leaves_user_idx" ON "leaves" USING btree ("user");--> statement-breakpoint
CREATE INDEX "leaves_status_idx" ON "leaves" USING btree ("status");--> statement-breakpoint
CREATE INDEX "leaves_leaveType_idx" ON "leaves" USING btree ("leaveType");--> statement-breakpoint
CREATE INDEX "leaves_startDate_endDate_idx" ON "leaves" USING btree ("startDate","endDate");--> statement-breakpoint
CREATE INDEX "leaves_appliedDate_idx" ON "leaves" USING btree ("appliedDate");