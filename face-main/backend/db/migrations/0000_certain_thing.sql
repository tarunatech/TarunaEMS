CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(50) NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone" varchar(32) DEFAULT '',
	"password" varchar(255) NOT NULL,
	"role" varchar(20) DEFAULT 'employee' NOT NULL,
	"employeeId" varchar(32),
	"isActive" boolean DEFAULT true NOT NULL,
	"profileImage" varchar(1024),
	"lastLogin" timestamp,
	"loginAttempts" integer DEFAULT 0 NOT NULL,
	"lockUntil" timestamp,
	"resetPasswordToken" varchar(255),
	"resetPasswordExpire" timestamp,
	"emailVerified" boolean DEFAULT true NOT NULL,
	"emailVerificationToken" varchar(255),
	"emailVerificationExpire" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_employeeId_unique" UNIQUE("employeeId")
);
--> statement-breakpoint
CREATE INDEX "users_role_idx" ON "users" USING btree ("role");--> statement-breakpoint
CREATE INDEX "users_isActive_idx" ON "users" USING btree ("isActive");--> statement-breakpoint
CREATE UNIQUE INDEX "users_employeeId_unique_idx" ON "users" USING btree ("employeeId");