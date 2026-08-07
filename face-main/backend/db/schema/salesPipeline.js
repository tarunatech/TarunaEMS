import {
  index,
  jsonb,
  pgEnum,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

export const salesPipelineStageEnum = pgEnum('sales_pipeline_stage', [
  'client_details',
  'quotation',
  'admin_approval',
  'sent_to_client',
  'negotiation',
  'won_closed',
]);

export const salesPipelines = pgTable(
  'salesPipelines',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    lead: uuid('lead').notNull(),
    currentStage: salesPipelineStageEnum('currentStage').notNull().default('client_details'),
    clientDetails: jsonb('clientDetails').notNull().default({}),
    quotation: jsonb('quotation').notNull().default({}),
    approval: jsonb('approval').notNull().default({ status: 'not_submitted', history: [] }),
    sentToClient: jsonb('sentToClient').notNull().default({}),
    negotiation: jsonb('negotiation').notNull().default({}),
    outcome: jsonb('outcome').notNull().default({ status: 'open' }),
    stageHistory: jsonb('stageHistory').notNull().default([]),
    createdAt: timestamp('createdAt', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updatedAt', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    leadUniqueIdx: uniqueIndex('salesPipelines_lead_unique_idx').on(table.lead),
    leadIdx: index('salesPipelines_lead_idx').on(table.lead),
    currentStageIdx: index('salesPipelines_currentStage_idx').on(table.currentStage),
    updatedAtIdx: index('salesPipelines_updatedAt_idx').on(table.updatedAt),
  }),
);
