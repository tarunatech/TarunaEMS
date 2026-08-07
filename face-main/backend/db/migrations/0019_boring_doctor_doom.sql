CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from" uuid,
	"to" uuid NOT NULL,
	"text" varchar(5000) NOT NULL,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL,
	"fromBot" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "messages_from_to_timestamp_idx" ON "messages" USING btree ("from","to","timestamp");--> statement-breakpoint
CREATE INDEX "messages_to_from_timestamp_idx" ON "messages" USING btree ("to","from","timestamp");