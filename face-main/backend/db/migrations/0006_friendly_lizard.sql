CREATE TYPE "public"."task_recurring_pattern" AS ENUM('Daily', 'Weekly', 'Bi-weekly', 'Monthly', 'Quarterly');--> statement-breakpoint
CREATE TYPE "public"."task_category" AS ENUM('Development', 'Design', 'Testing', 'Documentation', 'Research', 'Bug Fix', 'Feature', 'Maintenance', 'Other');--> statement-breakpoint
CREATE TYPE "public"."task_priority" AS ENUM('Low', 'Medium', 'High', 'Critical');--> statement-breakpoint
CREATE TYPE "public"."task_status" AS ENUM('Not Started', 'In Progress', 'Review', 'Completed', 'On Hold', 'Cancelled');--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(100) DEFAULT 'Task' NOT NULL,
	"description" varchar(1000) NOT NULL,
	"assignedTo" uuid NOT NULL,
	"assignedBy" uuid NOT NULL,
	"project" varchar(50) DEFAULT '' NOT NULL,
	"priority" "task_priority" DEFAULT 'Medium' NOT NULL,
	"status" "task_status" DEFAULT 'Not Started' NOT NULL,
	"dueDate" timestamp with time zone NOT NULL,
	"startDate" timestamp with time zone DEFAULT now() NOT NULL,
	"completedDate" timestamp with time zone,
	"estimatedHours" numeric,
	"actualHours" numeric DEFAULT 0 NOT NULL,
	"category" "task_category" DEFAULT 'Other' NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"attachments" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"comments" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"subtasks" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"dependencies" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"isRecurring" boolean DEFAULT false NOT NULL,
	"recurringPattern" "task_recurring_pattern",
	"lastRecurringDate" timestamp with time zone,
	"nextRecurringDate" timestamp with time zone,
	"isSelfAssigned" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "tasks_assignedTo_idx" ON "tasks" USING btree ("assignedTo");--> statement-breakpoint
CREATE INDEX "tasks_assignedBy_idx" ON "tasks" USING btree ("assignedBy");--> statement-breakpoint
CREATE INDEX "tasks_status_idx" ON "tasks" USING btree ("status");--> statement-breakpoint
CREATE INDEX "tasks_priority_idx" ON "tasks" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "tasks_dueDate_idx" ON "tasks" USING btree ("dueDate");--> statement-breakpoint
CREATE INDEX "tasks_project_idx" ON "tasks" USING btree ("project");--> statement-breakpoint
CREATE INDEX "tasks_category_idx" ON "tasks" USING btree ("category");--> statement-breakpoint
CREATE INDEX "tasks_createdAt_idx" ON "tasks" USING btree ("createdAt");