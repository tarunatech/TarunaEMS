CREATE TABLE "face_data" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee" uuid NOT NULL,
	"user" uuid NOT NULL,
	"faceDescriptor" real[] NOT NULL,
	"landmarks" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"faceImageUrl" varchar(2048) NOT NULL,
	"confidence" integer DEFAULT 0 NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"registrationDate" timestamp with time zone DEFAULT now() NOT NULL,
	"lastUpdated" timestamp with time zone DEFAULT now() NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "face_data_employee_unique_idx" ON "face_data" USING btree ("employee");--> statement-breakpoint
CREATE INDEX "face_data_user_idx" ON "face_data" USING btree ("user");--> statement-breakpoint
CREATE INDEX "face_data_isActive_idx" ON "face_data" USING btree ("isActive");