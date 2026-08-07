CREATE TYPE "public"."purchase_billing_cycle" AS ENUM('Monthly', 'Quarterly', 'Half-Yearly', 'Yearly', 'One Time');--> statement-breakpoint
CREATE TYPE "public"."purchase_order_status" AS ENUM('Active', 'Pending', 'Expired', 'Cancelled');--> statement-breakpoint
CREATE TABLE "purchaseOrders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"poNumber" varchar(255) NOT NULL,
	"client" uuid,
	"clientName" varchar(255) NOT NULL,
	"project" varchar(100) NOT NULL,
	"serviceType" varchar(60) NOT NULL,
	"vendor" varchar(80) NOT NULL,
	"serviceName" varchar(120) NOT NULL,
	"billingCycle" "purchase_billing_cycle" NOT NULL,
	"purchaseDate" timestamp with time zone NOT NULL,
	"renewalDate" timestamp with time zone NOT NULL,
	"amount" numeric NOT NULL,
	"status" "purchase_order_status" DEFAULT 'Active' NOT NULL,
	"notes" varchar(4096),
	"supplier" uuid,
	"deliveryDate" timestamp with time zone,
	"paymentTerms" varchar(1024),
	"lineItems" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"totalAmount" numeric DEFAULT 0 NOT NULL,
	"grandTotal" numeric DEFAULT 0 NOT NULL,
	"createdBy" uuid NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "purchaseOrders_poNumber_unique_idx" ON "purchaseOrders" USING btree ("poNumber");--> statement-breakpoint
CREATE INDEX "purchaseOrders_status_idx" ON "purchaseOrders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "purchaseOrders_vendor_idx" ON "purchaseOrders" USING btree ("vendor");--> statement-breakpoint
CREATE INDEX "purchaseOrders_serviceType_idx" ON "purchaseOrders" USING btree ("serviceType");--> statement-breakpoint
CREATE INDEX "purchaseOrders_purchaseDate_idx" ON "purchaseOrders" USING btree ("purchaseDate");--> statement-breakpoint
CREATE INDEX "purchaseOrders_renewalDate_idx" ON "purchaseOrders" USING btree ("renewalDate");--> statement-breakpoint
CREATE INDEX "purchaseOrders_createdAt_idx" ON "purchaseOrders" USING btree ("createdAt");