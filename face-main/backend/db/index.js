import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as userSchema from './schema/user.js';
import * as departmentSchema from './schema/department.js';
import * as employeeSchema from './schema/employee.js';
import * as attendanceSchema from './schema/attendance.js';
import * as leaveSchema from './schema/leave.js';
import * as holidaySchema from './schema/holiday.js';
import * as taskSchema from './schema/task.js';
import * as performanceReviewSchema from './schema/performanceReview.js';
import * as dayBookSchema from './schema/dayBook.js';
import * as payslipSchema from './schema/payslip.js';
import * as expenseTransactionSchema from './schema/expenseTransaction.js';
import * as purchaseOrderSchema from './schema/purchaseOrder.js';
import * as supplierSchema from './schema/supplier.js';
import * as leadSchema from './schema/lead.js';
import * as salesPipelineSchema from './schema/salesPipeline.js';
import * as interviewScheduleSchema from './schema/interviewSchedule.js';
import * as problemSchema from './schema/problem.js';
import * as notificationSchema from './schema/notification.js';
import * as groupSchema from './schema/group.js';
import * as groupMessageSchema from './schema/groupMessage.js';
import * as messageSchema from './schema/message.js';
import * as faceDataSchema from './schema/faceData.js';
import * as offerLetterSchema from './schema/offerLetter.js';
import * as projectSchema from './schema/project.js';
import * as budgetSchema from './schema/budget.js';
import * as customerInvoiceSchema from './schema/customerInvoice.js';
import * as customerEquipmentSchema from './schema/customerEquipment.js';
import * as amcContractSchema from './schema/amcContract.js';
import * as agreementSchema from './schema/agreement.js';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool, {
  schema: {
    ...userSchema,
    ...departmentSchema,
    ...employeeSchema,
    ...attendanceSchema,
    ...leaveSchema,
    ...holidaySchema,
    ...taskSchema,
    ...performanceReviewSchema,
    ...dayBookSchema,
    ...payslipSchema,
    ...expenseTransactionSchema,
    ...purchaseOrderSchema,
    ...supplierSchema,
    ...leadSchema,
    ...salesPipelineSchema,
    ...interviewScheduleSchema,
    ...problemSchema,
    ...notificationSchema,
    ...groupSchema,
    ...groupMessageSchema,
    ...messageSchema,
    ...faceDataSchema,
    ...offerLetterSchema,
    ...projectSchema,
    ...budgetSchema,
    ...customerInvoiceSchema,
    ...customerEquipmentSchema,
    ...amcContractSchema,
    ...agreementSchema,
  },
});

export const ensurePostgresExtensions = async () => {
  await pool.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "offer_letters" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "letterType" varchar(64) NOT NULL DEFAULT 'offer',
      "employeeName" varchar(255) NOT NULL,
      "role" varchar(255) NOT NULL,
      "joiningDate" varchar(128),
      "completionDate" varchar(128),
      "employmentType" varchar(128) DEFAULT 'Internship',
      "letterDate" varchar(128),
      "companyName" varchar(255) NOT NULL DEFAULT 'Taruna Technology',
      "location" varchar(255) NOT NULL DEFAULT 'Vadodara',
      "duration" varchar(128) DEFAULT 'three (3) months',
      "workingHours" varchar(255) DEFAULT '10:00 AM to 7:00 PM, Monday to Saturday',
      "signatoryName" varchar(255) NOT NULL DEFAULT 'MIHIR MAKWANA',
      "signatoryRole" varchar(255) NOT NULL DEFAULT 'Operational Manager',
      "employeeId" varchar(128),
      "candidateId" varchar(128),
      "pdfPath" varchar(1024),
      "status" varchar(64) NOT NULL DEFAULT 'Generated',
      "createdBy" uuid NOT NULL,
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now()
    )
  `);
  await pool.query('ALTER TABLE "offer_letters" ALTER COLUMN "joiningDate" DROP NOT NULL');
  await pool.query('ALTER TABLE "offer_letters" ALTER COLUMN "duration" DROP NOT NULL');
  await pool.query('ALTER TABLE "offer_letters" ALTER COLUMN "workingHours" DROP NOT NULL');
  await pool.query('ALTER TABLE "offer_letters" ADD COLUMN IF NOT EXISTS "letterType" varchar(64) DEFAULT \'offer\'');
  await pool.query('ALTER TABLE "offer_letters" ADD COLUMN IF NOT EXISTS "completionDate" varchar(128)');
  await pool.query('ALTER TABLE "offer_letters" ADD COLUMN IF NOT EXISTS "employmentType" varchar(128) DEFAULT \'Internship\'');
  await pool.query('ALTER TABLE "offer_letters" ADD COLUMN IF NOT EXISTS "letterDate" varchar(128)');
  await pool.query('ALTER TABLE "offer_letters" ADD COLUMN IF NOT EXISTS "department" varchar(128)');
  await pool.query('ALTER TABLE "offer_letters" ADD COLUMN IF NOT EXISTS "lastWorkingDate" varchar(128)');
  await pool.query('ALTER TABLE "offer_letters" ADD COLUMN IF NOT EXISTS "relievingDate" varchar(128)');
  await pool.query('ALTER TABLE "dayBooks" ADD COLUMN IF NOT EXISTS "isHalfDay" boolean DEFAULT false');
  await pool.query('ALTER TABLE "dayBooks" ADD COLUMN IF NOT EXISTS "halfDayType" varchar(32) DEFAULT \'full\'');
  await pool.query('ALTER TABLE "dayBooks" ADD COLUMN IF NOT EXISTS "includeBreak" boolean DEFAULT true');
  await pool.query('ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "achievedSoFar" text DEFAULT \'\'');

  // Projects table & Task linkage initialization
  await pool.query(`
    DO $$ BEGIN
      CREATE TYPE "project_status" AS ENUM ('Planning', 'Active', 'On Hold', 'Completed', 'Cancelled');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS "projects" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "projectCode" varchar(64) NOT NULL,
      "name" varchar(255) NOT NULL,
      "description" text,
      "leadId" uuid,
      "pipelineId" uuid,
      "status" "project_status" NOT NULL DEFAULT 'Planning',
      "contractValue" numeric NOT NULL DEFAULT 0,
      "approvedBudget" numeric NOT NULL DEFAULT 0,
      "billingSchedule" jsonb NOT NULL DEFAULT '[]'::jsonb,
      "currency" varchar(10) NOT NULL DEFAULT 'INR',
      "startDate" timestamptz,
      "endDate" timestamptz,
      "projectManager" uuid,
      "clientName" varchar(255),
      "createdBy" uuid,
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now()
    )
  `);

  await pool.query('CREATE UNIQUE INDEX IF NOT EXISTS "projects_projectCode_unique_idx" ON "projects" ("projectCode")');
  await pool.query('CREATE UNIQUE INDEX IF NOT EXISTS "projects_pipelineId_unique_idx" ON "projects" ("pipelineId")');
  await pool.query('CREATE INDEX IF NOT EXISTS "projects_leadId_idx" ON "projects" ("leadId")');
  await pool.query('CREATE INDEX IF NOT EXISTS "projects_status_idx" ON "projects" ("status")');
  await pool.query('CREATE INDEX IF NOT EXISTS "projects_projectManager_idx" ON "projects" ("projectManager")');
  await pool.query('CREATE INDEX IF NOT EXISTS "projects_createdAt_idx" ON "projects" ("createdAt")');

  await pool.query('ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "projectId" uuid');
  await pool.query('CREATE INDEX IF NOT EXISTS "tasks_projectId_idx" ON "tasks" ("projectId")');

  // Phase 2: Budgets and Linkages
  await pool.query(`
    DO $$ BEGIN
      CREATE TYPE "budget_status" AS ENUM ('Draft', 'Pending Approval', 'Approved', 'Rejected', 'Superseded');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS "project_budgets" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "projectId" uuid NOT NULL,
      "budgetNumber" varchar(64) NOT NULL,
      "version" integer NOT NULL DEFAULT 1,
      "status" "budget_status" NOT NULL DEFAULT 'Draft',
      "totalPlannedAmount" numeric NOT NULL DEFAULT 0,
      "totalApprovedAmount" numeric NOT NULL DEFAULT 0,
      "currency" varchar(10) NOT NULL DEFAULT 'INR',
      "notes" text,
      "createdBy" uuid NOT NULL,
      "approvedBy" uuid,
      "approvedAt" timestamptz,
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now()
    )
  `);

  await pool.query('CREATE INDEX IF NOT EXISTS "project_budgets_projectId_idx" ON "project_budgets" ("projectId")');
  await pool.query('CREATE INDEX IF NOT EXISTS "project_budgets_status_idx" ON "project_budgets" ("status")');
  await pool.query('CREATE INDEX IF NOT EXISTS "project_budgets_budgetNumber_idx" ON "project_budgets" ("budgetNumber")');
  await pool.query('CREATE UNIQUE INDEX IF NOT EXISTS "project_budgets_project_version_unique_idx" ON "project_budgets" ("projectId", "version")');
  await pool.query('CREATE INDEX IF NOT EXISTS "project_budgets_createdAt_idx" ON "project_budgets" ("createdAt")');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS "project_budget_items" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "budgetId" uuid NOT NULL,
      "category" varchar(255) NOT NULL,
      "description" text,
      "plannedAmount" numeric NOT NULL DEFAULT 0,
      "approvedAmount" numeric NOT NULL DEFAULT 0,
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now()
    )
  `);

  await pool.query('CREATE INDEX IF NOT EXISTS "project_budget_items_budgetId_idx" ON "project_budget_items" ("budgetId")');
  await pool.query('CREATE INDEX IF NOT EXISTS "project_budget_items_category_idx" ON "project_budget_items" ("category")');

  // Purchase Order & Expense Transaction project linkages
  await pool.query('ALTER TABLE "purchaseOrders" ADD COLUMN IF NOT EXISTS "projectId" uuid');
  await pool.query('CREATE INDEX IF NOT EXISTS "purchaseOrders_projectId_idx" ON "purchaseOrders" ("projectId")');

  await pool.query('ALTER TABLE "expenseTransactions" ADD COLUMN IF NOT EXISTS "projectId" uuid');
  await pool.query('ALTER TABLE "expenseTransactions" ADD COLUMN IF NOT EXISTS "leadId" uuid');
  await pool.query('CREATE INDEX IF NOT EXISTS "expenseTransactions_projectId_idx" ON "expenseTransactions" ("projectId")');
  await pool.query('CREATE INDEX IF NOT EXISTS "expenseTransactions_leadId_idx" ON "expenseTransactions" ("leadId")');

  // Phase 3: Customer Invoicing and Payment Allocations
  await pool.query(`
    DO $$ BEGIN
      CREATE TYPE "customer_invoice_status" AS ENUM ('draft', 'issued', 'partially_paid', 'paid', 'cancelled');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  await pool.query(`
    DO $$ BEGIN
      CREATE TYPE "customer_invoice_tax_type" AS ENUM ('CGST_SGST', 'IGST', 'None');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  await pool.query('CREATE SEQUENCE IF NOT EXISTS "customer_invoice_number_seq" START WITH 1001 INCREMENT BY 1');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS "customer_invoices" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "invoiceNumber" varchar(64) UNIQUE,
      "clientId" uuid,
      "leadId" uuid,
      "projectId" uuid,
      "milestoneName" varchar(255),
      "invoiceDate" varchar(32) NOT NULL,
      "dueDate" varchar(32) NOT NULL,
      "status" "customer_invoice_status" NOT NULL DEFAULT 'draft',
      "currency" varchar(10) NOT NULL DEFAULT 'INR',
      "subtotal" numeric NOT NULL DEFAULT 0,
      "discountAmount" numeric NOT NULL DEFAULT 0,
      "taxableAmount" numeric NOT NULL DEFAULT 0,
      "taxType" "customer_invoice_tax_type" NOT NULL DEFAULT 'CGST_SGST',
      "taxRate" numeric NOT NULL DEFAULT 18,
      "cgstRate" numeric NOT NULL DEFAULT 9,
      "sgstRate" numeric NOT NULL DEFAULT 9,
      "igstRate" numeric NOT NULL DEFAULT 0,
      "cgstAmount" numeric NOT NULL DEFAULT 0,
      "sgstAmount" numeric NOT NULL DEFAULT 0,
      "igstAmount" numeric NOT NULL DEFAULT 0,
      "taxAmount" numeric NOT NULL DEFAULT 0,
      "totalAmount" numeric NOT NULL DEFAULT 0,
      "paidAmount" numeric NOT NULL DEFAULT 0,
      "outstandingAmount" numeric NOT NULL DEFAULT 0,
      "notes" text,
      "terms" text,
      "cancellationReason" text,
      "cancelledAt" timestamptz,
      "cancelledBy" uuid,
      "issuedAt" timestamptz,
      "issuedBy" uuid,
      "createdBy" uuid,
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now()
    )
  `);

  await pool.query('CREATE INDEX IF NOT EXISTS "customer_invoices_invoiceNumber_idx" ON "customer_invoices" ("invoiceNumber")');
  await pool.query('CREATE INDEX IF NOT EXISTS "customer_invoices_clientId_idx" ON "customer_invoices" ("clientId")');
  await pool.query('CREATE INDEX IF NOT EXISTS "customer_invoices_leadId_idx" ON "customer_invoices" ("leadId")');
  await pool.query('CREATE INDEX IF NOT EXISTS "customer_invoices_projectId_idx" ON "customer_invoices" ("projectId")');
  await pool.query('CREATE INDEX IF NOT EXISTS "customer_invoices_status_idx" ON "customer_invoices" ("status")');
  await pool.query('CREATE INDEX IF NOT EXISTS "customer_invoices_dueDate_idx" ON "customer_invoices" ("dueDate")');
  await pool.query('CREATE INDEX IF NOT EXISTS "customer_invoices_createdAt_idx" ON "customer_invoices" ("createdAt")');

  await pool.query('ALTER TABLE "customer_invoices" ADD COLUMN IF NOT EXISTS "clientName" varchar(255)');
  await pool.query('ALTER TABLE "customer_invoices" ADD COLUMN IF NOT EXISTS "milestoneIndex" integer');
  await pool.query('ALTER TABLE "customer_invoices" ADD COLUMN IF NOT EXISTS "cancelReason" text');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS "customer_invoice_items" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "invoiceId" uuid NOT NULL,
      "description" text NOT NULL,
      "quantity" numeric NOT NULL DEFAULT 1,
      "unitPrice" numeric NOT NULL DEFAULT 0,
      "taxableAmount" numeric NOT NULL DEFAULT 0,
      "taxRate" numeric NOT NULL DEFAULT 0,
      "taxAmount" numeric NOT NULL DEFAULT 0,
      "lineTotal" numeric NOT NULL DEFAULT 0,
      "sortOrder" integer NOT NULL DEFAULT 0,
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now()
    )
  `);

  await pool.query('CREATE INDEX IF NOT EXISTS "customer_invoice_items_invoiceId_idx" ON "customer_invoice_items" ("invoiceId")');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS "invoice_payment_allocations" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "paymentTransactionId" uuid NOT NULL,
      "invoiceId" uuid NOT NULL,
      "allocatedAmount" numeric NOT NULL DEFAULT 0,
      "allocatedAt" timestamptz NOT NULL DEFAULT now(),
      "allocatedBy" uuid,
      "notes" text,
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now()
    )
  `);

  await pool.query('CREATE INDEX IF NOT EXISTS "invoice_payment_allocations_paymentId_idx" ON "invoice_payment_allocations" ("paymentTransactionId")');
  await pool.query('CREATE INDEX IF NOT EXISTS "invoice_payment_allocations_invoiceId_idx" ON "invoice_payment_allocations" ("invoiceId")');

  // Phase 5: AMC Contracts & Customer Equipment
  await pool.query(`
    DO $$ BEGIN
      CREATE TYPE "amc_contract_status" AS ENUM ('Draft', 'Pending Approval', 'Active', 'Expired', 'Cancelled', 'Renewed');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `);

  await pool.query('CREATE SEQUENCE IF NOT EXISTS "amc_contract_number_seq" START WITH 1001 INCREMENT BY 1');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS "customer_equipment" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "clientId" uuid NOT NULL,
      "clientName" varchar(255),
      "projectId" uuid,
      "equipmentName" varchar(255) NOT NULL,
      "modelNumber" varchar(255),
      "serialNumber" varchar(255),
      "category" varchar(128),
      "location" varchar(255),
      "installationDate" varchar(32),
      "warrantyStartDate" varchar(32),
      "warrantyEndDate" varchar(32),
      "status" varchar(64) NOT NULL DEFAULT 'Operational',
      "notes" text,
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now()
    )
  `);

  await pool.query('CREATE INDEX IF NOT EXISTS "customer_equipment_clientId_idx" ON "customer_equipment" ("clientId")');
  await pool.query('CREATE INDEX IF NOT EXISTS "customer_equipment_projectId_idx" ON "customer_equipment" ("projectId")');
  await pool.query('CREATE INDEX IF NOT EXISTS "customer_equipment_serialNumber_idx" ON "customer_equipment" ("serialNumber")');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS "amc_contracts" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "contractNumber" varchar(64) NOT NULL,
      "title" varchar(255) NOT NULL,
      "clientId" uuid NOT NULL,
      "clientName" varchar(255) NOT NULL,
      "projectId" uuid,
      "projectCode" varchar(64),
      "projectName" varchar(255),
      "contractType" varchar(32) NOT NULL DEFAULT 'New',
      "previousContractId" uuid,
      "status" "amc_contract_status" NOT NULL DEFAULT 'Draft',
      "startDate" varchar(32) NOT NULL,
      "endDate" varchar(32) NOT NULL,
      "durationMonths" integer NOT NULL DEFAULT 12,
      "signingDate" varchar(32),
      "coverageType" varchar(64) NOT NULL DEFAULT 'Comprehensive',
      "coveredEquipment" jsonb NOT NULL DEFAULT '[]'::jsonb,
      "coveredServices" jsonb NOT NULL DEFAULT '[]'::jsonb,
      "excludedServices" jsonb NOT NULL DEFAULT '[]'::jsonb,
      "preventiveVisitCount" integer NOT NULL DEFAULT 4,
      "coverageNotes" text,
      "contractValue" numeric NOT NULL DEFAULT 0,
      "currency" varchar(10) NOT NULL DEFAULT 'INR',
      "billingFrequency" varchar(32) NOT NULL DEFAULT 'Annual',
      "billingStartDate" varchar(32),
      "paymentTerms" varchar(255),
      "renewalTerms" text,
      "commercialNotes" text,
      "plannedInstallments" jsonb NOT NULL DEFAULT '[]'::jsonb,
      "documentPath" varchar(1024),
      "documentOriginalName" varchar(255),
      "documentSize" integer,
      "documentMimeType" varchar(128),
      "internalNotes" text,
      "approvedBy" uuid,
      "approvedAt" timestamptz,
      "createdBy" uuid,
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now()
    )
  `);

  await pool.query('CREATE UNIQUE INDEX IF NOT EXISTS "amc_contracts_contractNumber_unique_idx" ON "amc_contracts" ("contractNumber")');
  await pool.query('CREATE INDEX IF NOT EXISTS "amc_contracts_clientId_idx" ON "amc_contracts" ("clientId")');
  await pool.query('CREATE INDEX IF NOT EXISTS "amc_contracts_projectId_idx" ON "amc_contracts" ("projectId")');
  await pool.query('CREATE INDEX IF NOT EXISTS "amc_contracts_status_idx" ON "amc_contracts" ("status")');
  await pool.query('CREATE INDEX IF NOT EXISTS "amc_contracts_endDate_idx" ON "amc_contracts" ("endDate")');
  await pool.query('CREATE INDEX IF NOT EXISTS "amc_contracts_previousContractId_idx" ON "amc_contracts" ("previousContractId")');
  await pool.query('CREATE INDEX IF NOT EXISTS "amc_contracts_createdAt_idx" ON "amc_contracts" ("createdAt")');

  // Employee Agreement Tables Initialization
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "agreement_templates" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "templateKey" varchar(64) NOT NULL,
      "title" varchar(255) NOT NULL,
      "version" varchar(32) NOT NULL DEFAULT '1.0',
      "documentType" varchar(64) NOT NULL DEFAULT 'internship_agreement',
      "companyName" varchar(255) NOT NULL DEFAULT 'Taruna Technology',
      "companyAddress" varchar(512) NOT NULL DEFAULT '709,710 Broadway Empire, circle, Vasna Bhayli Main Rd, Vadodara, Gujarat 391410',
      "companyEmail" varchar(255) NOT NULL DEFAULT 'tarunatechnology@gmail.com',
      "companyPhone" varchar(64) NOT NULL DEFAULT '+91 9106610595',
      "signatoryName" varchar(255) NOT NULL DEFAULT 'Tisha Bhadja',
      "signatoryRole" varchar(255) NOT NULL DEFAULT 'Operational Manager',
      "sections" jsonb NOT NULL DEFAULT '[]'::jsonb,
      "isActive" boolean NOT NULL DEFAULT true,
      "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now()
    )
  `);
  await pool.query('CREATE UNIQUE INDEX IF NOT EXISTS "agreement_templates_key_version_idx" ON "agreement_templates" ("templateKey", "version")');
  await pool.query('CREATE INDEX IF NOT EXISTS "agreement_templates_is_active_idx" ON "agreement_templates" ("isActive")');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS "employee_agreements" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "employeeId" uuid NOT NULL REFERENCES "employees"("id") ON DELETE CASCADE,
      "templateId" uuid NOT NULL REFERENCES "agreement_templates"("id"),
      "agreementTitle" varchar(255) NOT NULL DEFAULT 'Internship Agreement',
      "version" varchar(32) NOT NULL DEFAULT '1.0',
      "status" varchar(64) NOT NULL DEFAULT 'Not Sent',
      "employeeName" varchar(255) NOT NULL,
      "employeeEmail" varchar(255) NOT NULL,
      "employeePhone" varchar(64),
      "jobRole" varchar(255) NOT NULL DEFAULT 'MERN Stack Developer Intern',
      "commencementDate" varchar(64),
      "duration" varchar(64) DEFAULT 'three (3) months',
      "stipendStatus" varchar(128) DEFAULT 'Unpaid',
      "customTerms" jsonb NOT NULL DEFAULT '{}'::jsonb,
      "acknowledged" boolean NOT NULL DEFAULT false,
      "acknowledgementText" text,
      "signatureData" text,
      "signaturePath" varchar(1024),
      "signedPdfPath" varchar(1024),
      "signedAt" timestamptz,
      "ipAddress" varchar(128),
      "userAgent" text,
      "lastSentAt" timestamptz,
      "emailDeliveryStatus" text,
      "emailMessageId" varchar(255),
      "createdBy" uuid NOT NULL REFERENCES "users"("id"),
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now()
    )
  `);
  await pool.query('CREATE INDEX IF NOT EXISTS "employee_agreements_employee_id_idx" ON "employee_agreements" ("employeeId")');
  await pool.query('CREATE INDEX IF NOT EXISTS "employee_agreements_status_idx" ON "employee_agreements" ("status")');
  await pool.query('CREATE INDEX IF NOT EXISTS "employee_agreements_template_id_idx" ON "employee_agreements" ("templateId")');
  await pool.query('CREATE INDEX IF NOT EXISTS "employee_agreements_created_by_idx" ON "employee_agreements" ("createdBy")');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS "agreement_signing_links" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "agreementId" uuid NOT NULL REFERENCES "employee_agreements"("id") ON DELETE CASCADE,
      "tokenHash" varchar(128) NOT NULL,
      "expiresAt" timestamptz NOT NULL,
      "usedAt" timestamptz,
      "revokedAt" timestamptz,
      "createdBy" uuid NOT NULL REFERENCES "users"("id"),
      "createdAt" timestamptz NOT NULL DEFAULT now()
    )
  `);
  await pool.query('CREATE UNIQUE INDEX IF NOT EXISTS "agreement_signing_links_token_hash_idx" ON "agreement_signing_links" ("tokenHash")');
  await pool.query('CREATE INDEX IF NOT EXISTS "agreement_signing_links_agreement_id_idx" ON "agreement_signing_links" ("agreementId")');
  await pool.query('CREATE INDEX IF NOT EXISTS "agreement_signing_links_expires_at_idx" ON "agreement_signing_links" ("expiresAt")');
};

export default db;
