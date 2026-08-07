CREATE TYPE "public"."payslip_payment_method" AS ENUM('bank_transfer', 'cheque', 'cash');--> statement-breakpoint
CREATE TYPE "public"."payslip_status" AS ENUM('draft', 'generated', 'paid', 'cancelled');--> statement-breakpoint
CREATE TABLE "payslips" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee" uuid NOT NULL,
	"employeeId" varchar(128) NOT NULL,
	"employeeName" varchar(255) NOT NULL,
	"periodMonth" numeric NOT NULL,
	"periodYear" numeric NOT NULL,
	"earnings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"deductions" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"attendance" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"grossEarnings" numeric DEFAULT 0 NOT NULL,
	"totalDeductions" numeric DEFAULT 0 NOT NULL,
	"netSalary" numeric DEFAULT 0 NOT NULL,
	"bankInfo" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "payslip_status" DEFAULT 'generated' NOT NULL,
	"paymentDate" timestamp with time zone,
	"paymentMethod" "payslip_payment_method" DEFAULT 'bank_transfer' NOT NULL,
	"pdfPath" varchar(1024),
	"generatedBy" uuid NOT NULL,
	"remarks" varchar(2048) DEFAULT '' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "payslips_employee_period_unique_idx" ON "payslips" USING btree ("employee","periodYear","periodMonth");--> statement-breakpoint
CREATE INDEX "payslips_period_idx" ON "payslips" USING btree ("periodYear","periodMonth");--> statement-breakpoint
CREATE INDEX "payslips_status_idx" ON "payslips" USING btree ("status");