CREATE TABLE "performance_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employeeId" uuid NOT NULL,
	"month" varchar(7) NOT NULL,
	"totalTasks" integer DEFAULT 0 NOT NULL,
	"onTimeCount" integer DEFAULT 0 NOT NULL,
	"lateCount" integer DEFAULT 0 NOT NULL,
	"autoScore" numeric DEFAULT 0 NOT NULL,
	"suggestedRating" integer DEFAULT 0 NOT NULL,
	"adminRating" integer,
	"adminComment" varchar(1000),
	"ratedBy" uuid,
	"ratedAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "performance_reviews_employeeId_idx" ON "performance_reviews" USING btree ("employeeId");--> statement-breakpoint
CREATE INDEX "performance_reviews_month_idx" ON "performance_reviews" USING btree ("month");--> statement-breakpoint
CREATE INDEX "performance_reviews_employee_month_idx" ON "performance_reviews" USING btree ("employeeId","month");
