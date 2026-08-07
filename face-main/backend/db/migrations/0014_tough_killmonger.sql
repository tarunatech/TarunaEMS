CREATE TYPE "public"."interview_mode" AS ENUM('Online', 'Offline', 'Telephonic');--> statement-breakpoint
CREATE TYPE "public"."interview_status" AS ENUM('Scheduled', 'Completed', 'Selected', 'Rejected', 'Cancelled');--> statement-breakpoint
CREATE TABLE "interviewSchedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"candidateName" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone" varchar(64) NOT NULL,
	"resumeUrl" varchar(1024),
	"resumeFile" jsonb NOT NULL,
	"position" varchar(255) NOT NULL,
	"experience" varchar(255) NOT NULL,
	"interviewDate" timestamp with time zone NOT NULL,
	"interviewTime" varchar(64) NOT NULL,
	"interviewMode" "interview_mode" NOT NULL,
	"interviewRound" varchar(255) NOT NULL,
	"skills" varchar(2048) NOT NULL,
	"notes" varchar(4096) NOT NULL,
	"status" "interview_status" DEFAULT 'Scheduled' NOT NULL,
	"createdBy" uuid NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "interviewSchedules_date_time_idx" ON "interviewSchedules" USING btree ("interviewDate","interviewTime");--> statement-breakpoint
CREATE INDEX "interviewSchedules_createdBy_createdAt_idx" ON "interviewSchedules" USING btree ("createdBy","createdAt");