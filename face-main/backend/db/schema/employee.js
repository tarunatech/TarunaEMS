import {
  boolean,
  index,
  jsonb,
  pgEnum,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const employeeStatusEnum = pgEnum('employee_status', ['Active', 'Inactive', 'On Leave', 'Terminated']);
export const faceRegistrationMethodEnum = pgEnum('face_registration_method', ['single', 'multi-angle', 'video']);

export const employees = pgTable(
  'employees',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    user: uuid('user').notNull(),
    employeeId: varchar('employeeId', { length: 32 }),
    personalInfo: jsonb('personalInfo').notNull(),
    contactInfo: jsonb('contactInfo').notNull(),
    workInfo: jsonb('workInfo').notNull(),
    workInfoDepartment: uuid('workInfoDepartment'),
    salaryInfo: jsonb('salaryInfo').notNull(),
    bankInfo: jsonb('bankInfo').notNull().default({}),
    status: employeeStatusEnum('status').notNull().default('Active'),
    leaveBalance: jsonb('leaveBalance').notNull().default({ total: 30, used: 0, remaining: 30 }),
    // Existing controllers disagree on faceDescriptor length: createEmployee expects 128, updateEmployeeWithFace expects 512.
    // Keep this unconstrained until the face-recognition owner chooses one representation.
    faceDescriptor: jsonb('faceDescriptor'),
    faceEmbeddings: jsonb('faceEmbeddings').notNull().default({}),
    faceQualityScores: jsonb('faceQualityScores').notNull().default({}),
    faceImage: varchar('faceImage', { length: 2048 }),
    faceImages: jsonb('faceImages').notNull().default({}),
    hasFaceRegistered: boolean('hasFaceRegistered').notNull().default(false),
    faceRegistrationDate: timestamp('faceRegistrationDate', { withTimezone: true }),
    faceRegistrationMethod: faceRegistrationMethodEnum('faceRegistrationMethod'),
    documents: jsonb('documents').notNull().default({}),
    notes: varchar('notes', { length: 4096 }),
    tags: jsonb('tags').notNull().default([]),
    createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userUniqueIdx: uniqueIndex('employees_user_unique_idx').on(table.user),
    departmentIdx: index('employees_workInfoDepartment_idx').on(table.workInfoDepartment),
    statusIdx: index('employees_status_idx').on(table.status),
  }),
);
