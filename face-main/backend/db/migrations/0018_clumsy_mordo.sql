CREATE TYPE "public"."group_message_type" AS ENUM('text', 'system');--> statement-breakpoint
CREATE TABLE "group_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group" uuid NOT NULL,
	"sender" uuid NOT NULL,
	"text" varchar(5000) NOT NULL,
	"type" "group_message_type" DEFAULT 'text' NOT NULL,
	"readBy" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"isDeleted" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "group_messages_group_createdAt_idx" ON "group_messages" USING btree ("group","createdAt");--> statement-breakpoint
CREATE INDEX "group_messages_sender_idx" ON "group_messages" USING btree ("sender");