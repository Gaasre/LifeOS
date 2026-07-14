import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { organization } from "./auth-schema";
import { entities } from "./domain-schema";

export const moneyAccountType = pgEnum("money_account_type", [
  "bank",
  "savings",
  "cash",
  "investment",
  "other",
]);

export const moneyDirection = pgEnum("money_direction", ["income", "expense"]);

export const moneyRecurringGroup = pgEnum("money_recurring_group", [
  "income",
  "essential",
  "subscription",
  "savings",
]);

export const moneyFrequency = pgEnum("money_frequency", [
  "weekly",
  "monthly",
  "quarterly",
  "yearly",
]);

export const financialGoalStatus = pgEnum("financial_goal_status", [
  "active",
  "paused",
  "completed",
]);

export const financialDecisionStatus = pgEnum("financial_decision_status", [
  "considering",
  "decided",
  "rejected",
]);

export const moneyDocumentRole = pgEnum("money_document_role", [
  "source",
  "receipt",
  "statement",
  "related",
]);

/** Household-wide calculation preferences. Amounts are stored in minor units. */
export const moneySettings = pgTable(
  "money_settings",
  {
    organizationId: text("organization_id")
      .primaryKey()
      .references(() => organization.id, { onDelete: "cascade" }),
    currency: text("currency").notNull().default("EUR"),
    safetyBufferMinor: integer("safety_buffer_minor").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "money_settings_currency_check",
      sql`${table.currency} ~ '^[A-Z]{3}$'`,
    ),
    check(
      "money_settings_safety_buffer_check",
      sql`${table.safetyBufferMinor} >= 0`,
    ),
  ],
);

/** Places where household money is currently held. */
export const moneyAccounts = pgTable(
  "money_accounts",
  {
    entityId: uuid("entity_id")
      .primaryKey()
      .references(() => entities.id, { onDelete: "cascade" }),
    type: moneyAccountType("type").notNull(),
    institution: text("institution"),
    balanceMinor: integer("balance_minor").notNull(),
    currency: text("currency").notNull().default("EUR"),
    includeInAvailableBalance: boolean("include_in_available_balance")
      .notNull()
      .default(true),
    lastUpdatedAt: timestamp("last_updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    archived: boolean("archived").notNull().default(false),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("money_accounts_type_archived_idx").on(table.type, table.archived),
    index("money_accounts_currency_idx").on(table.currency),
    check(
      "money_accounts_currency_check",
      sql`${table.currency} ~ '^[A-Z]{3}$'`,
    ),
  ],
);

/** Repeated incoming and outgoing cash movements. */
export const recurringMoneyItems = pgTable(
  "recurring_money_items",
  {
    entityId: uuid("entity_id")
      .primaryKey()
      .references(() => entities.id, { onDelete: "cascade" }),
    amountMinor: integer("amount_minor").notNull(),
    currency: text("currency").notNull().default("EUR"),
    direction: moneyDirection("direction").notNull(),
    group: moneyRecurringGroup("group").notNull(),
    frequency: moneyFrequency("frequency").notNull(),
    nextOccurrence: date("next_occurrence").notNull(),
    startDate: date("start_date"),
    endDate: date("end_date"),
    accountId: uuid("account_id").references(() => moneyAccounts.entityId, {
      onDelete: "set null",
    }),
    category: text("category"),
    isActive: boolean("is_active").notNull().default(true),
    isVariable: boolean("is_variable").notNull().default(false),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("recurring_money_items_active_next_idx").on(
      table.isActive,
      table.nextOccurrence,
    ),
    index("recurring_money_items_account_idx").on(table.accountId),
    index("recurring_money_items_group_idx").on(table.group),
    check("recurring_money_items_amount_check", sql`${table.amountMinor} > 0`),
    check(
      "recurring_money_items_currency_check",
      sql`${table.currency} ~ '^[A-Z]{3}$'`,
    ),
    check(
      "recurring_money_items_date_range_check",
      sql`${table.startDate} is null or ${table.endDate} is null or ${table.endDate} >= ${table.startDate}`,
    ),
    check(
      "recurring_money_items_group_direction_check",
      sql`(${table.group} = 'income' and ${table.direction} = 'income') or (${table.group} <> 'income' and ${table.direction} = 'expense')`,
    ),
  ],
);

/** Actual household income and expenses. Account balances remain source-of-truth. */
export const moneyEntries = pgTable(
  "money_entries",
  {
    entityId: uuid("entity_id")
      .primaryKey()
      .references(() => entities.id, { onDelete: "cascade" }),
    amountMinor: integer("amount_minor").notNull(),
    currency: text("currency").notNull().default("EUR"),
    direction: moneyDirection("direction").notNull(),
    occurredAt: date("occurred_at").notNull(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => moneyAccounts.entityId),
    recurringItemId: uuid("recurring_item_id").references(
      () => recurringMoneyItems.entityId,
      { onDelete: "set null" },
    ),
    category: text("category"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("money_entries_account_date_idx").on(
      table.accountId,
      table.occurredAt,
    ),
    index("money_entries_occurred_at_idx").on(table.occurredAt),
    index("money_entries_recurring_item_idx").on(table.recurringItemId),
    check("money_entries_amount_check", sql`${table.amountMinor} > 0`),
    check(
      "money_entries_currency_check",
      sql`${table.currency} ~ '^[A-Z]{3}$'`,
    ),
  ],
);

/** Purpose-driven reserves and contribution plans. */
export const financialGoals = pgTable(
  "financial_goals",
  {
    entityId: uuid("entity_id")
      .primaryKey()
      .references(() => entities.id, { onDelete: "cascade" }),
    targetAmountMinor: integer("target_amount_minor").notNull(),
    currentAmountMinor: integer("current_amount_minor").notNull().default(0),
    currency: text("currency").notNull().default("EUR"),
    targetDate: date("target_date"),
    recurringContributionMinor: integer("recurring_contribution_minor")
      .notNull()
      .default(0),
    relatedAccountId: uuid("related_account_id").references(
      () => moneyAccounts.entityId,
      { onDelete: "set null" },
    ),
    relatedProjectId: uuid("related_project_id").references(() => entities.id, {
      onDelete: "set null",
    }),
    excludeFromSafeToSpend: boolean("exclude_from_safe_to_spend")
      .notNull()
      .default(false),
    status: financialGoalStatus("status").notNull().default("active"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("financial_goals_status_idx").on(table.status),
    index("financial_goals_account_idx").on(table.relatedAccountId),
    check(
      "financial_goals_target_amount_check",
      sql`${table.targetAmountMinor} > 0`,
    ),
    check(
      "financial_goals_current_amount_check",
      sql`${table.currentAmountMinor} >= 0`,
    ),
    check(
      "financial_goals_contribution_check",
      sql`${table.recurringContributionMinor} >= 0`,
    ),
    check(
      "financial_goals_currency_check",
      sql`${table.currency} ~ '^[A-Z]{3}$'`,
    ),
  ],
);

/** An active financial question that does not affect actual finances yet. */
export const financialDecisions = pgTable(
  "financial_decisions",
  {
    entityId: uuid("entity_id")
      .primaryKey()
      .references(() => entities.id, { onDelete: "cascade" }),
    description: text("description"),
    status: financialDecisionStatus("status").notNull().default("considering"),
    relatedProjectId: uuid("related_project_id").references(() => entities.id, {
      onDelete: "set null",
    }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("financial_decisions_status_idx").on(table.status)],
);

export const financialDecisionOptions = pgTable(
  "financial_decision_options",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    decisionId: uuid("decision_id")
      .notNull()
      .references(() => financialDecisions.entityId, { onDelete: "cascade" }),
    title: text("title").notNull(),
    monthlyImpactMinor: integer("monthly_impact_minor").notNull().default(0),
    upfrontCostMinor: integer("upfront_cost_minor").notNull().default(0),
    annualImpactMinor: integer("annual_impact_minor").notNull().default(0),
    currency: text("currency").notNull().default("EUR"),
    notes: text("notes"),
    selected: boolean("selected").notNull().default(false),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("financial_decision_options_decision_idx").on(table.decisionId),
    uniqueIndex("financial_decision_options_selected_uidx")
      .on(table.decisionId)
      .where(sql`${table.selected} = true`),
    check(
      "financial_decision_options_upfront_cost_check",
      sql`${table.upfrontCostMinor} >= 0`,
    ),
    check(
      "financial_decision_options_position_check",
      sql`${table.position} >= 0`,
    ),
    check(
      "financial_decision_options_currency_check",
      sql`${table.currency} ~ '^[A-Z]{3}$'`,
    ),
  ],
);

/** Links remain pointers to canonical Documents records; files are never copied. */
export const moneyDocuments = pgTable(
  "money_documents",
  {
    moneyEntityId: uuid("money_entity_id")
      .notNull()
      .references(() => entities.id, { onDelete: "cascade" }),
    documentId: uuid("document_id")
      .notNull()
      .references(() => entities.id, { onDelete: "cascade" }),
    role: moneyDocumentRole("role").notNull().default("related"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({
      name: "money_documents_pk",
      columns: [table.moneyEntityId, table.documentId, table.role],
    }),
    index("money_documents_document_id_idx").on(table.documentId),
    check(
      "money_documents_not_self_check",
      sql`${table.moneyEntityId} <> ${table.documentId}`,
    ),
  ],
);

/** Optional links to Home, Projects, or any other canonical LifeOS object. */
export const moneyRelatedEntities = pgTable(
  "money_related_entities",
  {
    moneyEntityId: uuid("money_entity_id")
      .notNull()
      .references(() => entities.id, { onDelete: "cascade" }),
    relatedEntityId: uuid("related_entity_id")
      .notNull()
      .references(() => entities.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({
      name: "money_related_entities_pk",
      columns: [table.moneyEntityId, table.relatedEntityId],
    }),
    index("money_related_entities_related_id_idx").on(table.relatedEntityId),
    check(
      "money_related_entities_not_self_check",
      sql`${table.moneyEntityId} <> ${table.relatedEntityId}`,
    ),
  ],
);

export const moneySettingsRelations = relations(moneySettings, ({ one }) => ({
  organization: one(organization, {
    fields: [moneySettings.organizationId],
    references: [organization.id],
  }),
}));

export const moneyAccountsRelations = relations(
  moneyAccounts,
  ({ one, many }) => ({
    entity: one(entities, {
      fields: [moneyAccounts.entityId],
      references: [entities.id],
    }),
    recurringItems: many(recurringMoneyItems),
    entries: many(moneyEntries),
    goals: many(financialGoals),
  }),
);

export const recurringMoneyItemsRelations = relations(
  recurringMoneyItems,
  ({ one, many }) => ({
    entity: one(entities, {
      fields: [recurringMoneyItems.entityId],
      references: [entities.id],
    }),
    account: one(moneyAccounts, {
      fields: [recurringMoneyItems.accountId],
      references: [moneyAccounts.entityId],
    }),
    entries: many(moneyEntries),
  }),
);

export const moneyEntriesRelations = relations(moneyEntries, ({ one }) => ({
  entity: one(entities, {
    fields: [moneyEntries.entityId],
    references: [entities.id],
  }),
  account: one(moneyAccounts, {
    fields: [moneyEntries.accountId],
    references: [moneyAccounts.entityId],
  }),
  recurringItem: one(recurringMoneyItems, {
    fields: [moneyEntries.recurringItemId],
    references: [recurringMoneyItems.entityId],
  }),
}));

export const financialGoalsRelations = relations(financialGoals, ({ one }) => ({
  entity: one(entities, {
    fields: [financialGoals.entityId],
    references: [entities.id],
  }),
  account: one(moneyAccounts, {
    fields: [financialGoals.relatedAccountId],
    references: [moneyAccounts.entityId],
  }),
  project: one(entities, {
    fields: [financialGoals.relatedProjectId],
    references: [entities.id],
    relationName: "financial_goal_project",
  }),
}));

export const financialDecisionsRelations = relations(
  financialDecisions,
  ({ one, many }) => ({
    entity: one(entities, {
      fields: [financialDecisions.entityId],
      references: [entities.id],
    }),
    project: one(entities, {
      fields: [financialDecisions.relatedProjectId],
      references: [entities.id],
      relationName: "financial_decision_project",
    }),
    options: many(financialDecisionOptions),
  }),
);

export const financialDecisionOptionsRelations = relations(
  financialDecisionOptions,
  ({ one }) => ({
    decision: one(financialDecisions, {
      fields: [financialDecisionOptions.decisionId],
      references: [financialDecisions.entityId],
    }),
  }),
);

export const moneyDocumentsRelations = relations(moneyDocuments, ({ one }) => ({
  moneyEntity: one(entities, {
    fields: [moneyDocuments.moneyEntityId],
    references: [entities.id],
    relationName: "money_document_owner",
  }),
  document: one(entities, {
    fields: [moneyDocuments.documentId],
    references: [entities.id],
    relationName: "money_linked_document",
  }),
}));

export const moneyRelatedEntitiesRelations = relations(
  moneyRelatedEntities,
  ({ one }) => ({
    moneyEntity: one(entities, {
      fields: [moneyRelatedEntities.moneyEntityId],
      references: [entities.id],
      relationName: "money_related_owner",
    }),
    relatedEntity: one(entities, {
      fields: [moneyRelatedEntities.relatedEntityId],
      references: [entities.id],
      relationName: "money_related_target",
    }),
  }),
);
