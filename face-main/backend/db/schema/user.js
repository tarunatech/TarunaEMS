// import {
//   boolean,
//   index,
//   integer,
//   pgTable,
//   timestamp,
//   uniqueIndex,
//   uuid,
//   varchar,
// } from 'drizzle-orm/pg-core';

// export const users = pgTable(
//   'users',
//   {
//     id: uuid('id').defaultRandom().primaryKey(),
//     name: varchar('name', { length: 50 }).notNull(),
//     email: varchar('email', { length: 255 }).notNull().unique(),
//     phone: varchar('phone', { length: 32 }).default(''),
//     password: varchar('password', { length: 255 }).notNull(),
//     role: varchar('role', { length: 20 }).notNull().default('employee'),
//     employeeId: varchar('employeeId', { length: 32 }).unique(),
//     isActive: boolean('isActive').notNull().default(true),
//     profileImage: varchar('profileImage', { length: 1024 }),
//     lastLogin: timestamp('lastLogin'),
//     loginAttempts: integer('loginAttempts').notNull().default(0),
//     lockUntil: timestamp('lockUntil'),
//     resetPasswordToken: varchar('resetPasswordToken', { length: 255 }),
//     resetPasswordExpire: timestamp('resetPasswordExpire'),
//     emailVerified: boolean('emailVerified').notNull().default(true),
//     emailVerificationToken: varchar('emailVerificationToken', { length: 255 }),
//     emailVerificationExpire: timestamp('emailVerificationExpire'),
//     createdAt: timestamp('createdAt').notNull().defaultNow(),
//     updatedAt: timestamp('updatedAt').notNull().defaultNow(),
//   },
//   (table) => ({
//     roleIdx: index('users_role_idx').on(table.role),
//     isActiveIdx: index('users_isActive_idx').on(table.isActive),
//     employeeIdUniqueIdx: uniqueIndex('users_employeeId_unique_idx').on(table.employeeId),
//   }),
// );

import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

// Enforces the same allowed values Mongoose's `enum: ['admin', 'employee']` did.
// Postgres now rejects any other value at the DB level, not just at the app level.
export const userRoleEnum = pgEnum('user_role', ['admin', 'employee']);

export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 50 }).notNull(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    phone: varchar('phone', { length: 32 }).default(''),
    password: varchar('password', { length: 255 }).notNull(),
    role: userRoleEnum('role').notNull().default('employee'),
    // Single unique constraint (removed the duplicate uniqueIndex that existed
    // alongside .unique() in the old version — Postgres treats NULLs as
    // distinct, so sparse-unique behavior from Mongoose is preserved for free).
    employeeId: varchar('employeeId', { length: 32 }).unique(),
    isActive: boolean('isActive').notNull().default(true),
    profileImage: varchar('profileImage', { length: 1024 }),
    lastLogin: timestamp('lastLogin'),
    loginAttempts: integer('loginAttempts').notNull().default(0),
    lockUntil: timestamp('lockUntil'),
    resetPasswordToken: varchar('resetPasswordToken', { length: 255 }),
    resetPasswordExpire: timestamp('resetPasswordExpire'),
    emailVerified: boolean('emailVerified').notNull().default(true),
    emailVerificationToken: varchar('emailVerificationToken', { length: 255 }),
    emailVerificationExpire: timestamp('emailVerificationExpire'),
    createdAt: timestamp('createdAt').notNull().defaultNow(),
    updatedAt: timestamp('updatedAt').notNull().defaultNow(),
  },
  (table) => ({
    roleIdx: index('users_role_idx').on(table.role),
    isActiveIdx: index('users_isActive_idx').on(table.isActive),
  }),
);