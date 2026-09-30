import {
  index,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const offerLetters = pgTable(
  'offer_letters',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    employeeName: varchar('employeeName', { length: 255 }).notNull(),
    role: varchar('role', { length: 255 }).notNull(),
    joiningDate: varchar('joiningDate', { length: 128 }).notNull(),
    companyName: varchar('companyName', { length: 255 }).notNull().default('Taruna Technology'),
    location: varchar('location', { length: 255 }).notNull().default('Vadodara'),
    duration: varchar('duration', { length: 128 }).notNull().default('three (3) months'),
    workingHours: varchar('workingHours', { length: 255 }).notNull().default('10:00 AM to 7:00 PM, Monday to Saturday'),
    signatoryName: varchar('signatoryName', { length: 255 }).notNull().default('MIHIR MAKWANA'),
    signatoryRole: varchar('signatoryRole', { length: 255 }).notNull().default('Operational Manager'),
    employeeId: varchar('employeeId', { length: 128 }),
    candidateId: varchar('candidateId', { length: 128 }),
    pdfPath: varchar('pdfPath', { length: 1024 }),
    status: varchar('status', { length: 64 }).notNull().default('Generated'),
    createdBy: uuid('createdBy').notNull(),
    createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    createdByIdx: index('offer_letters_created_by_idx').on(table.createdBy),
    employeeNameIdx: index('offer_letters_employee_name_idx').on(table.employeeName),
    createdAtIdx: index('offer_letters_created_at_idx').on(table.createdAt),
  }),
);
