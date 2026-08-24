ALTER TABLE "interviewSchedules" ADD COLUMN "education" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "interviewSchedules" ADD COLUMN "experienceHistory" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "interviewSchedules" ADD COLUMN "certifications" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "interviewSchedules" ADD COLUMN "documents" jsonb DEFAULT '[]'::jsonb NOT NULL;