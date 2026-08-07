CREATE TYPE "public"."expense_payment_method" AS ENUM('Cash', 'UPI', 'Bank Transfer', 'Card', 'Cheque', 'Other');--> statement-breakpoint
CREATE TYPE "public"."expense_transaction_source" AS ENUM('admin', 'employee');--> statement-breakpoint
CREATE TYPE "public"."expense_transaction_type" AS ENUM('expense', 'payment');--> statement-breakpoint
CREATE TABLE "expenseTransactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "expense_transaction_type" NOT NULL,
	"date" timestamp with time zone NOT NULL,
	"amount" numeric NOT NULL,
	"paymentMethod" "expense_payment_method" NOT NULL,
	"paidTo" varchar(255),
	"clientName" varchar(255),
	"category" varchar(255),
	"description" varchar(2048),
	"referenceNumber" varchar(255),
	"invoiceNumber" varchar(255),
	"remarks" varchar(2048),
	"createdBy" uuid NOT NULL,
	"employee" uuid,
	"source" "expense_transaction_source" DEFAULT 'admin' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "expenseTransactions_type_idx" ON "expenseTransactions" USING btree ("type");--> statement-breakpoint
CREATE INDEX "expenseTransactions_date_idx" ON "expenseTransactions" USING btree ("date");--> statement-breakpoint
CREATE INDEX "expenseTransactions_employee_idx" ON "expenseTransactions" USING btree ("employee");--> statement-breakpoint
CREATE INDEX "expenseTransactions_source_idx" ON "expenseTransactions" USING btree ("source");--> statement-breakpoint
CREATE INDEX "expenseTransactions_type_date_idx" ON "expenseTransactions" USING btree ("type","date");