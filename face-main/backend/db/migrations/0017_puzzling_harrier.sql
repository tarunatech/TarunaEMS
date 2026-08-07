CREATE TABLE "groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" varchar(500) DEFAULT '' NOT NULL,
	"avatar" varchar(1024),
	"owner" uuid NOT NULL,
	"members" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"lastMessage" jsonb DEFAULT '{}'::jsonb,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "groups_owner_idx" ON "groups" USING btree ("owner");--> statement-breakpoint
CREATE INDEX "groups_isActive_idx" ON "groups" USING btree ("isActive");--> statement-breakpoint
CREATE INDEX "groups_updatedAt_idx" ON "groups" USING btree ("updatedAt");