CREATE TYPE "public"."lead_engagement_level" AS ENUM('Low', 'Medium', 'High');--> statement-breakpoint
CREATE TYPE "public"."lead_priority" AS ENUM('Low', 'Medium', 'High', 'Hot');--> statement-breakpoint
CREATE TYPE "public"."lead_source" AS ENUM('Website', 'Social Media', 'Email Campaign', 'Cold Call', 'Referral', 'Trade Show', 'Advertisement', 'Other');--> statement-breakpoint
CREATE TYPE "public"."lead_status" AS ENUM('New', 'Contacted', 'Qualified', 'Proposal', 'Negotiation', 'Won', 'Lost');--> statement-breakpoint
CREATE TABLE "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"leadId" varchar(64),
	"firstName" varchar(255) NOT NULL,
	"lastName" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone" varchar(64) NOT NULL,
	"company" varchar(255),
	"position" varchar(255),
	"source" "lead_source" NOT NULL,
	"status" "lead_status" DEFAULT 'New' NOT NULL,
	"priority" "lead_priority" DEFAULT 'Medium' NOT NULL,
	"interestedProducts" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"estimatedValue" numeric,
	"actualValue" numeric,
	"expectedCloseDate" timestamp with time zone,
	"actualCloseDate" timestamp with time zone,
	"assignedTo" uuid NOT NULL,
	"assignedBy" uuid,
	"meetings" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"totalMeetings" numeric DEFAULT 0 NOT NULL,
	"completedMeetings" numeric DEFAULT 0 NOT NULL,
	"upcomingMeetings" numeric DEFAULT 0 NOT NULL,
	"nextMeetingDate" timestamp with time zone,
	"lastMeetingDate" timestamp with time zone,
	"averageMeetingDuration" numeric DEFAULT 0 NOT NULL,
	"notes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"lastContactDate" timestamp with time zone,
	"nextFollowUpDate" timestamp with time zone,
	"address" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"wonDetails" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"leadScore" numeric DEFAULT 0 NOT NULL,
	"engagementLevel" "lead_engagement_level" DEFAULT 'Medium' NOT NULL,
	"responseRate" numeric DEFAULT 0 NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"customFields" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"convertedAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "leads_leadId_unique_idx" ON "leads" USING btree ("leadId");--> statement-breakpoint
CREATE INDEX "leads_assignedTo_status_idx" ON "leads" USING btree ("assignedTo","status");--> statement-breakpoint
CREATE INDEX "leads_email_idx" ON "leads" USING btree ("email");--> statement-breakpoint
CREATE INDEX "leads_phone_idx" ON "leads" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "leads_status_priority_idx" ON "leads" USING btree ("status","priority");--> statement-breakpoint
CREATE INDEX "leads_nextFollowUpDate_idx" ON "leads" USING btree ("nextFollowUpDate");--> statement-breakpoint
CREATE INDEX "leads_nextMeetingDate_idx" ON "leads" USING btree ("nextMeetingDate");