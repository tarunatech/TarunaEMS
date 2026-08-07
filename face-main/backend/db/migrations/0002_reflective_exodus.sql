CREATE TABLE "employees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user" uuid NOT NULL,
	"employeeId" varchar(32),
	"personalInfo" jsonb NOT NULL,
	"contactInfo" jsonb NOT NULL,
	"workInfo" jsonb NOT NULL,
	"salaryInfo" jsonb NOT NULL,
	"bankInfo" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" varchar(32) DEFAULT 'Active' NOT NULL,
	"leaveBalance" jsonb DEFAULT '{"total":30,"used":0,"remaining":30}'::jsonb NOT NULL,
	"faceDescriptor" jsonb,
	"faceEmbeddings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"faceQualityScores" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"faceImage" varchar(2048),
	"faceImages" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"hasFaceRegistered" boolean DEFAULT false NOT NULL,
	"faceRegistrationDate" timestamp,
	"faceRegistrationMethod" varchar(32),
	"documents" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"notes" varchar(4096),
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "employees_user_unique_idx" ON "employees" USING btree ("user");--> statement-breakpoint
CREATE INDEX "employees_workInfo_department_idx" ON "employees" USING gin ("workInfo");--> statement-breakpoint
CREATE INDEX "employees_status_idx" ON "employees" USING btree ("status");