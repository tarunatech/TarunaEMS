import {
  boolean,
  index,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const leaveTypeEnum = pgEnum('leave_type', [
  'casual',
  'sick',
  'earned',
  'maternity',
  'paternity',
  'emergency',
  'personal',
]);

export const leaveStatusEnum = pgEnum('leave_status', [
  'Pending',
  'Approved',
  'Rejected',
  'Cancelled',
]);

export const halfDaySessionEnum = pgEnum('half_day_session', ['Morning', 'Evening']);

export const leavePriorityEnum = pgEnum('leave_priority', [
  'Low',
  'Medium',
  'High',
  'Emergency',
]);

export const leaves = pgTable(
  'leaves',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    employee: uuid('employee').notNull(),
    user: uuid('user').notNull(),
    leaveType: leaveTypeEnum('leaveType').notNull(),
    startDate: timestamp('startDate', { withTimezone: true }).notNull(),
    endDate: timestamp('endDate', { withTimezone: true }).notNull(),
    totalDays: numeric('totalDays', { mode: 'number' }).notNull(),
    reason: varchar('reason', { length: 500 }).notNull(),
    status: leaveStatusEnum('status').notNull().default('Pending'),
    appliedDate: timestamp('appliedDate', { withTimezone: true }).notNull().defaultNow(),
    actionDate: timestamp('actionDate', { withTimezone: true }),
    actionBy: uuid('actionBy'),
    approverComments: varchar('approverComments', { length: 300 }),
    attachment: jsonb('attachment'),
    isHalfDay: boolean('isHalfDay').notNull().default(false),
    halfDaySession: halfDaySessionEnum('halfDaySession'),
    contactDuringLeave: jsonb('contactDuringLeave'),
    workHandover: jsonb('workHandover'),
    priority: leavePriorityEnum('priority').notNull().default('Medium'),
    createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    employeeIdx: index('leaves_employee_idx').on(table.employee),
    userIdx: index('leaves_user_idx').on(table.user),
    statusIdx: index('leaves_status_idx').on(table.status),
    leaveTypeIdx: index('leaves_leaveType_idx').on(table.leaveType),
    startEndIdx: index('leaves_startDate_endDate_idx').on(table.startDate, table.endDate),
    appliedDateIdx: index('leaves_appliedDate_idx').on(table.appliedDate),
  }),
);
