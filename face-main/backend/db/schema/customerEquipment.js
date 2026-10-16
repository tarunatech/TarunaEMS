import {
  index,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const customerEquipment = pgTable(
  'customer_equipment',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    clientId: uuid('clientId').notNull(),
    clientName: varchar('clientName', { length: 255 }),
    projectId: uuid('projectId'),
    equipmentName: varchar('equipmentName', { length: 255 }).notNull(),
    modelNumber: varchar('modelNumber', { length: 255 }),
    serialNumber: varchar('serialNumber', { length: 255 }),
    category: varchar('category', { length: 128 }),
    location: varchar('location', { length: 255 }),
    installationDate: varchar('installationDate', { length: 32 }),
    warrantyStartDate: varchar('warrantyStartDate', { length: 32 }),
    warrantyEndDate: varchar('warrantyEndDate', { length: 32 }),
    status: varchar('status', { length: 64 }).notNull().default('Operational'),
    notes: text('notes'),
    createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    clientIdIdx: index('customer_equipment_clientId_idx').on(table.clientId),
    projectIdIdx: index('customer_equipment_projectId_idx').on(table.projectId),
    serialNumberIdx: index('customer_equipment_serialNumber_idx').on(table.serialNumber),
  })
);
