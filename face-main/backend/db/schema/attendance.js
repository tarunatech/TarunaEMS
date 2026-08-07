import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const attendanceStatusEnum = pgEnum('attendance_status', [
  'Present',
  'Late',
  'Half Day',
  'Absent',
  'Work from Home',
]);

export const attendance = pgTable(
  'attendance',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    employee: uuid('employee').notNull(),
    user: uuid('user').notNull(),
    date: timestamp('date', { withTimezone: true }).notNull().defaultNow(),
    checkInTime: timestamp('checkInTime', { withTimezone: true }).notNull(),
    checkOutTime: timestamp('checkOutTime', { withTimezone: true }),
    checkInLocation: jsonb('checkInLocation').notNull(),
    checkOutLocation: jsonb('checkOutLocation'),
    workingHours: integer('workingHours').notNull().default(0),
    status: attendanceStatusEnum('status').notNull().default('Present'),
    isLate: boolean('isLate').notNull().default(false),
    lateMinutes: integer('lateMinutes').notNull().default(0),
    notes: varchar('notes', { length: 4096 }).default(''),
    approvedBy: uuid('approvedBy'),
    ipAddress: varchar('ipAddress', { length: 128 }).default(''),
    deviceInfo: jsonb('deviceInfo').notNull().default({}),
    isManualEntry: boolean('isManualEntry').notNull().default(false),
    manualEntryReason: varchar('manualEntryReason', { length: 2048 }).default(''),
    createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userDateIdx: index('attendance_user_date_idx').on(table.user, table.date),
    dateIdx: index('attendance_date_idx').on(table.date),
    statusIdx: index('attendance_status_idx').on(table.status),
    checkInTimeIdx: index('attendance_checkInTime_idx').on(table.checkInTime),
    employeeDateUniqueIdx: uniqueIndex('attendance_employee_date_unique_idx').on(table.employee, table.date),
  }),
);
