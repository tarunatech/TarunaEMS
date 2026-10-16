import {
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { projects } from './project.js';
import { leads } from './lead.js';
import { expenseTransactions } from './expenseTransaction.js';

export const customerInvoiceStatusEnum = pgEnum('customer_invoice_status', [
  'draft',
  'issued',
  'partially_paid',
  'paid',
  'cancelled',
]);

export const customerInvoiceTaxTypeEnum = pgEnum('customer_invoice_tax_type', [
  'CGST_SGST',
  'IGST',
  'None',
]);

export const customerInvoices = pgTable(
  'customer_invoices',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    invoiceNumber: varchar('invoiceNumber', { length: 64 }),
    clientId: uuid('clientId'),
    leadId: uuid('leadId'),
    clientName: varchar('clientName', { length: 255 }),
    projectId: uuid('projectId'),
    milestoneIndex: integer('milestoneIndex'),
    milestoneName: varchar('milestoneName', { length: 255 }),
    invoiceDate: varchar('invoiceDate', { length: 32 }).notNull(),
    dueDate: varchar('dueDate', { length: 32 }).notNull(),
    status: customerInvoiceStatusEnum('status').notNull().default('draft'),
    currency: varchar('currency', { length: 10 }).notNull().default('INR'),
    subtotal: numeric('subtotal').notNull().default(0),
    discountAmount: numeric('discountAmount').notNull().default(0),
    taxableAmount: numeric('taxableAmount').notNull().default(0),
    taxType: customerInvoiceTaxTypeEnum('taxType').notNull().default('CGST_SGST'),
    taxRate: numeric('taxRate').notNull().default(18),
    cgstRate: numeric('cgstRate').notNull().default(9),
    sgstRate: numeric('sgstRate').notNull().default(9),
    igstRate: numeric('igstRate').notNull().default(0),
    cgstAmount: numeric('cgstAmount').notNull().default(0),
    sgstAmount: numeric('sgstAmount').notNull().default(0),
    igstAmount: numeric('igstAmount').notNull().default(0),
    taxAmount: numeric('taxAmount').notNull().default(0),
    totalAmount: numeric('totalAmount').notNull().default(0),
    paidAmount: numeric('paidAmount').notNull().default(0),
    outstandingAmount: numeric('outstandingAmount').notNull().default(0),
    notes: text('notes'),
    terms: text('terms'),
    cancellationReason: text('cancellationReason'),
    cancelReason: text('cancelReason'),
    cancelledAt: timestamp('cancelledAt', { withTimezone: true }),
    cancelledBy: uuid('cancelledBy'),
    createdBy: uuid('createdBy'),
    issuedBy: uuid('issuedBy'),
    issuedAt: timestamp('issuedAt', { withTimezone: true }),
    createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    invoiceNumberIdx: index('customer_invoices_invoiceNumber_idx').on(table.invoiceNumber),
    projectIdx: index('customer_invoices_projectId_idx').on(table.projectId),
    clientIdx: index('customer_invoices_clientId_idx').on(table.clientId),
    leadIdx: index('customer_invoices_leadId_idx').on(table.leadId),
    statusIdx: index('customer_invoices_status_idx').on(table.status),
    dueDateIdx: index('customer_invoices_dueDate_idx').on(table.dueDate),
    createdAtIdx: index('customer_invoices_createdAt_idx').on(table.createdAt),
  })
);

export const customerInvoiceItems = pgTable(
  'customer_invoice_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    invoiceId: uuid('invoiceId').notNull(),
    description: text('description').notNull(),
    quantity: numeric('quantity').notNull().default(1),
    unitPrice: numeric('unitPrice').notNull().default(0),
    taxableAmount: numeric('taxableAmount').notNull().default(0),
    taxRate: numeric('taxRate').notNull().default(0),
    taxAmount: numeric('taxAmount').notNull().default(0),
    lineTotal: numeric('lineTotal').notNull().default(0),
    sortOrder: integer('sortOrder').notNull().default(0),
    createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    invoiceIdx: index('customer_invoice_items_invoiceId_idx').on(table.invoiceId),
  })
);

export const invoicePaymentAllocations = pgTable(
  'invoice_payment_allocations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    paymentTransactionId: uuid('paymentTransactionId').notNull(),
    invoiceId: uuid('invoiceId').notNull(),
    allocatedAmount: numeric('allocatedAmount').notNull().default(0),
    allocatedAt: timestamp('allocatedAt', { withTimezone: true }).notNull().defaultNow(),
    allocatedBy: uuid('allocatedBy'),
    notes: text('notes'),
    createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    paymentIdx: index('invoice_payment_allocations_paymentId_idx').on(table.paymentTransactionId),
    invoiceIdx: index('invoice_payment_allocations_invoiceId_idx').on(table.invoiceId),
  })
);
