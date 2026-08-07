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

export const payslipStatusEnum = pgEnum('payslip_status', ['draft', 'generated', 'paid', 'cancelled']);
export const payslipPaymentMethodEnum = pgEnum('payslip_payment_method', ['bank_transfer', 'cheque', 'cash']);

export const payslips = pgTable(
  'payslips',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    employee: uuid('employee').notNull(),
    employeeId: varchar('employeeId', { length: 128 }).notNull(),
    employeeName: varchar('employeeName', { length: 255 }).notNull(),
    periodMonth: numeric('periodMonth', { mode: 'number' }).notNull(),
    periodYear: numeric('periodYear', { mode: 'number' }).notNull(),
    earnings: jsonb('earnings').notNull().default({}),
    deductions: jsonb('deductions').notNull().default({}),
    attendance: jsonb('attendance').notNull().default({}),
    grossEarnings: numeric('grossEarnings', { mode: 'number' }).notNull().default(0),
    totalDeductions: numeric('totalDeductions', { mode: 'number' }).notNull().default(0),
    netSalary: numeric('netSalary', { mode: 'number' }).notNull().default(0),
    bankInfo: jsonb('bankInfo').notNull().default({}),
    status: payslipStatusEnum('status').notNull().default('generated'),
    paymentDate: timestamp('paymentDate', { withTimezone: true }),
    paymentMethod: payslipPaymentMethodEnum('paymentMethod').notNull().default('bank_transfer'),
    pdfPath: varchar('pdfPath', { length: 1024 }),
    generatedBy: uuid('generatedBy').notNull(),
    remarks: varchar('remarks', { length: 2048 }).notNull().default(''),
    createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    employeePeriodUniqueIdx: uniqueIndex('payslips_employee_period_unique_idx').on(table.employee, table.periodYear, table.periodMonth),
    periodIdx: index('payslips_period_idx').on(table.periodYear, table.periodMonth),
    statusIdx: index('payslips_status_idx').on(table.status),
  }),
);
