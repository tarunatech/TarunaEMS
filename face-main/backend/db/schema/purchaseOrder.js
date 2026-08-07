import {
  index,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const purchaseBillingCycleEnum = pgEnum('purchase_billing_cycle', ['Monthly', 'Quarterly', 'Half-Yearly', 'Yearly', 'One Time']);
export const purchaseOrderStatusEnum = pgEnum('purchase_order_status', ['Active', 'Pending', 'Expired', 'Cancelled']);

export const purchaseOrders = pgTable(
  'purchaseOrders',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    poNumber: varchar('poNumber', { length: 255 }).notNull(),
    client: uuid('client'),
    clientName: varchar('clientName', { length: 255 }).notNull(),
    project: varchar('project', { length: 100 }).notNull(),
    serviceType: varchar('serviceType', { length: 60 }).notNull(),
    vendor: varchar('vendor', { length: 80 }).notNull(),
    serviceName: varchar('serviceName', { length: 120 }).notNull(),
    billingCycle: purchaseBillingCycleEnum('billingCycle').notNull(),
    purchaseDate: timestamp('purchaseDate', { withTimezone: true }).notNull(),
    renewalDate: timestamp('renewalDate', { withTimezone: true }).notNull(),
    amount: numeric('amount', { mode: 'number' }).notNull(),
    status: purchaseOrderStatusEnum('status').notNull().default('Active'),
    notes: varchar('notes', { length: 4096 }),
    supplier: uuid('supplier'),
    deliveryDate: timestamp('deliveryDate', { withTimezone: true }),
    paymentTerms: varchar('paymentTerms', { length: 1024 }),
    lineItems: jsonb('lineItems').notNull().default([]),
    totalAmount: numeric('totalAmount', { mode: 'number' }).notNull().default(0),
    grandTotal: numeric('grandTotal', { mode: 'number' }).notNull().default(0),
    createdBy: uuid('createdBy').notNull(),
    createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    poNumberUniqueIdx: uniqueIndex('purchaseOrders_poNumber_unique_idx').on(table.poNumber),
    statusIdx: index('purchaseOrders_status_idx').on(table.status),
    vendorIdx: index('purchaseOrders_vendor_idx').on(table.vendor),
    serviceTypeIdx: index('purchaseOrders_serviceType_idx').on(table.serviceType),
    purchaseDateIdx: index('purchaseOrders_purchaseDate_idx').on(table.purchaseDate),
    renewalDateIdx: index('purchaseOrders_renewalDate_idx').on(table.renewalDate),
    createdAtIdx: index('purchaseOrders_createdAt_idx').on(table.createdAt),
  }),
);
