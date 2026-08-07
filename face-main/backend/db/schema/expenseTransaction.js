import {
  index,
  numeric,
  pgEnum,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const expenseTransactionTypeEnum = pgEnum('expense_transaction_type', ['expense', 'payment']);
export const expensePaymentMethodEnum = pgEnum('expense_payment_method', ['Cash', 'UPI', 'Bank Transfer', 'Card', 'Cheque', 'Other']);
export const expenseTransactionSourceEnum = pgEnum('expense_transaction_source', ['admin', 'employee']);

export const expenseTransactions = pgTable(
  'expenseTransactions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    type: expenseTransactionTypeEnum('type').notNull(),
    date: timestamp('date', { withTimezone: true }).notNull(),
    amount: numeric('amount', { mode: 'number' }).notNull(),
    paymentMethod: expensePaymentMethodEnum('paymentMethod').notNull(),
    paidTo: varchar('paidTo', { length: 255 }),
    clientName: varchar('clientName', { length: 255 }),
    category: varchar('category', { length: 255 }),
    description: varchar('description', { length: 2048 }),
    referenceNumber: varchar('referenceNumber', { length: 255 }),
    invoiceNumber: varchar('invoiceNumber', { length: 255 }),
    remarks: varchar('remarks', { length: 2048 }),
    createdBy: uuid('createdBy').notNull(),
    employee: uuid('employee'),
    source: expenseTransactionSourceEnum('source').notNull().default('admin'),
    createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    typeIdx: index('expenseTransactions_type_idx').on(table.type),
    dateIdx: index('expenseTransactions_date_idx').on(table.date),
    employeeIdx: index('expenseTransactions_employee_idx').on(table.employee),
    sourceIdx: index('expenseTransactions_source_idx').on(table.source),
    typeDateIdx: index('expenseTransactions_type_date_idx').on(table.type, table.date),
  }),
);
