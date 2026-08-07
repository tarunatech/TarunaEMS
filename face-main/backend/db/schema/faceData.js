import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  real,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const faceData = pgTable(
  'face_data',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    employee: uuid('employee').notNull(),
    user: uuid('user').notNull(),
    faceDescriptor: real('faceDescriptor').array().notNull(),
    landmarks: jsonb('landmarks').notNull().default([]),
    faceImageUrl: varchar('faceImageUrl', { length: 2048 }).notNull(),
    confidence: integer('confidence').notNull().default(0),
    isActive: boolean('isActive').notNull().default(true),
    registrationDate: timestamp('registrationDate', { withTimezone: true }).notNull().defaultNow(),
    lastUpdated: timestamp('lastUpdated', { withTimezone: true }).notNull().defaultNow(),
    metadata: jsonb('metadata').notNull().default({}),
    createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    employeeUniqueIdx: uniqueIndex('face_data_employee_unique_idx').on(table.employee),
    userIdx: index('face_data_user_idx').on(table.user),
    isActiveIdx: index('face_data_isActive_idx').on(table.isActive),
  }),
);
