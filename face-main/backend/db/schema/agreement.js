import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { employees } from './employee.js';
import { users } from './user.js';

export const agreementTemplates = pgTable(
  'agreement_templates',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    templateKey: varchar('templateKey', { length: 64 }).notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    version: varchar('version', { length: 32 }).notNull().default('1.0'),
    documentType: varchar('documentType', { length: 64 }).notNull().default('internship_agreement'),
    companyName: varchar('companyName', { length: 255 }).notNull().default('Taruna Technology'),
    companyAddress: varchar('companyAddress', { length: 512 }).notNull().default('709,710 Broadway Empire, circle, Vasna Bhayli Main Rd, Vadodara, Gujarat 391410'),
    companyEmail: varchar('companyEmail', { length: 255 }).notNull().default('tarunatechnology@gmail.com'),
    companyPhone: varchar('companyPhone', { length: 64 }).notNull().default('+91 9106610595'),
    signatoryName: varchar('signatoryName', { length: 255 }).notNull().default('Tisha Bhadja'),
    signatoryRole: varchar('signatoryRole', { length: 255 }).notNull().default('Operational Manager'),
    sections: jsonb('sections').notNull().default([]),
    isActive: boolean('isActive').notNull().default(true),
    metadata: jsonb('metadata').notNull().default({}),
    createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    templateKeyVersionIdx: uniqueIndex('agreement_templates_key_version_idx').on(table.templateKey, table.version),
    isActiveIdx: index('agreement_templates_is_active_idx').on(table.isActive),
  }),
);

export const employeeAgreements = pgTable(
  'employee_agreements',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    employeeId: uuid('employeeId').notNull().references(() => employees.id, { onDelete: 'cascade' }),
    templateId: uuid('templateId').notNull().references(() => agreementTemplates.id),
    agreementTitle: varchar('agreementTitle', { length: 255 }).notNull().default('Internship Agreement'),
    version: varchar('version', { length: 32 }).notNull().default('1.0'),
    status: varchar('status', { length: 64 }).notNull().default('Not Sent'), // 'Not Sent' | 'Link Sent' | 'Email Failed' | 'Expired' | 'Signed'
    
    // Dynamic Employee Details
    employeeName: varchar('employeeName', { length: 255 }).notNull(),
    employeeEmail: varchar('employeeEmail', { length: 255 }).notNull(),
    employeePhone: varchar('employeePhone', { length: 64 }),
    jobRole: varchar('jobRole', { length: 255 }).notNull().default('MERN Stack Developer Intern'),
    commencementDate: varchar('commencementDate', { length: 64 }),
    duration: varchar('duration', { length: 64 }).default('three (3) months'),
    stipendStatus: varchar('stipendStatus', { length: 128 }).default('Unpaid'),
    customTerms: jsonb('customTerms').notNull().default({}),

    // Signing & Acknowledgement
    acknowledged: boolean('acknowledged').notNull().default(false),
    acknowledgementText: text('acknowledgementText'),
    signatureData: text('signatureData'),
    signaturePath: varchar('signaturePath', { length: 1024 }),
    signedPdfPath: varchar('signedPdfPath', { length: 1024 }),
    signedAt: timestamp('signedAt', { withTimezone: true }),
    ipAddress: varchar('ipAddress', { length: 128 }),
    userAgent: text('userAgent'),

    // Delivery Tracking
    lastSentAt: timestamp('lastSentAt', { withTimezone: true }),
    emailDeliveryStatus: text('emailDeliveryStatus'),
    emailMessageId: varchar('emailMessageId', { length: 255 }),

    createdBy: uuid('createdBy').notNull().references(() => users.id),
    createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    employeeIdx: index('employee_agreements_employee_id_idx').on(table.employeeId),
    statusIdx: index('employee_agreements_status_idx').on(table.status),
    templateIdx: index('employee_agreements_template_id_idx').on(table.templateId),
    createdByIdx: index('employee_agreements_created_by_idx').on(table.createdBy),
  }),
);

export const agreementSigningLinks = pgTable(
  'agreement_signing_links',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    agreementId: uuid('agreementId').notNull().references(() => employeeAgreements.id, { onDelete: 'cascade' }),
    tokenHash: varchar('tokenHash', { length: 128 }).notNull(),
    expiresAt: timestamp('expiresAt', { withTimezone: true }).notNull(),
    usedAt: timestamp('usedAt', { withTimezone: true }),
    revokedAt: timestamp('revokedAt', { withTimezone: true }),
    createdBy: uuid('createdBy').notNull().references(() => users.id),
    createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tokenHashIdx: uniqueIndex('agreement_signing_links_token_hash_idx').on(table.tokenHash),
    agreementIdIdx: index('agreement_signing_links_agreement_id_idx').on(table.agreementId),
    expiresAtIdx: index('agreement_signing_links_expires_at_idx').on(table.expiresAt),
  }),
);
