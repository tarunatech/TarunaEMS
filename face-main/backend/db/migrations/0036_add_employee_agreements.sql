CREATE TABLE IF NOT EXISTS "agreement_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"templateKey" varchar(64) NOT NULL,
	"title" varchar(255) NOT NULL,
	"version" varchar(32) DEFAULT '1.0' NOT NULL,
	"documentType" varchar(64) DEFAULT 'internship_agreement' NOT NULL,
	"companyName" varchar(255) DEFAULT 'Taruna Technology' NOT NULL,
	"companyAddress" varchar(512) DEFAULT '709,710 Broadway Empire, circle, Vasna Bhayli Main Rd, Vadodara, Gujarat 391410' NOT NULL,
	"companyEmail" varchar(255) DEFAULT 'tarunatechnology@gmail.com' NOT NULL,
	"companyPhone" varchar(64) DEFAULT '+91 9106610595' NOT NULL,
	"signatoryName" varchar(255) DEFAULT 'Tisha Bhadja' NOT NULL,
	"signatoryRole" varchar(255) DEFAULT 'Operational Manager' NOT NULL,
	"sections" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "agreement_templates_key_version_idx" ON "agreement_templates" ("templateKey", "version");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agreement_templates_is_active_idx" ON "agreement_templates" ("isActive");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "employee_agreements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employeeId" uuid NOT NULL REFERENCES "employees"("id") ON DELETE CASCADE,
	"templateId" uuid NOT NULL REFERENCES "agreement_templates"("id"),
	"agreementTitle" varchar(255) DEFAULT 'Internship Agreement' NOT NULL,
	"version" varchar(32) DEFAULT '1.0' NOT NULL,
	"status" varchar(64) DEFAULT 'Not Sent' NOT NULL,
	"employeeName" varchar(255) NOT NULL,
	"employeeEmail" varchar(255) NOT NULL,
	"employeePhone" varchar(64),
	"jobRole" varchar(255) DEFAULT 'MERN Stack Developer Intern' NOT NULL,
	"commencementDate" varchar(64),
	"duration" varchar(64) DEFAULT 'three (3) months',
	"stipendStatus" varchar(128) DEFAULT 'Unpaid',
	"customTerms" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"acknowledged" boolean DEFAULT false NOT NULL,
	"acknowledgementText" text,
	"signatureData" text,
	"signaturePath" varchar(1024),
	"signedPdfPath" varchar(1024),
	"signedAt" timestamp with time zone,
	"ipAddress" varchar(128),
	"userAgent" text,
	"lastSentAt" timestamp with time zone,
	"emailDeliveryStatus" varchar(64),
	"emailMessageId" varchar(255),
	"createdBy" uuid NOT NULL REFERENCES "users"("id"),
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "employee_agreements_employee_id_idx" ON "employee_agreements" ("employeeId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "employee_agreements_status_idx" ON "employee_agreements" ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "employee_agreements_template_id_idx" ON "employee_agreements" ("templateId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "employee_agreements_created_by_idx" ON "employee_agreements" ("createdBy");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "agreement_signing_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agreementId" uuid NOT NULL REFERENCES "employee_agreements"("id") ON DELETE CASCADE,
	"tokenHash" varchar(128) NOT NULL,
	"expiresAt" timestamp with time zone NOT NULL,
	"usedAt" timestamp with time zone,
	"revokedAt" timestamp with time zone,
	"createdBy" uuid NOT NULL REFERENCES "users"("id"),
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "agreement_signing_links_token_hash_idx" ON "agreement_signing_links" ("tokenHash");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agreement_signing_links_agreement_id_idx" ON "agreement_signing_links" ("agreementId");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agreement_signing_links_expires_at_idx" ON "agreement_signing_links" ("expiresAt");
