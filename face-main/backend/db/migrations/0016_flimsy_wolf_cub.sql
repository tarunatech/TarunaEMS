CREATE TYPE "public"."notification_category" AS ENUM('attendance', 'leave', 'task', 'employee', 'system');--> statement-breakpoint
CREATE TYPE "public"."notification_priority" AS ENUM('low', 'medium', 'high', 'urgent');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('info', 'success', 'warning', 'error');--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(255) NOT NULL,
	"message" varchar(4096) NOT NULL,
	"type" "notification_type" DEFAULT 'info' NOT NULL,
	"category" "notification_category" NOT NULL,
	"targetUsers" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"sender" uuid NOT NULL,
	"relatedEntity" jsonb DEFAULT '{}'::jsonb,
	"isRead" boolean DEFAULT false NOT NULL,
	"readBy" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"priority" "notification_priority" DEFAULT 'medium' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "notifications_isRead_idx" ON "notifications" USING btree ("isRead");--> statement-breakpoint
CREATE INDEX "notifications_category_type_idx" ON "notifications" USING btree ("category","type");--> statement-breakpoint
CREATE INDEX "notifications_sender_idx" ON "notifications" USING btree ("sender");--> statement-breakpoint
CREATE INDEX "notifications_createdAt_idx" ON "notifications" USING btree ("createdAt");