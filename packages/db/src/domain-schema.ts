import { relations, sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { organization, user } from "./auth-schema";

export const personFactKind = pgEnum("person_fact_kind", [
  "personal_detail",
  "preference",
]);

export const personFactSource = pgEnum("person_fact_source", [
  "self",
  "document",
  "imported",
  "ai",
]);

export const officialRecordStatus = pgEnum("official_record_status", [
  "current",
  "needs_review",
  "expired",
]);

/**
 * Canonical household-owned objects. The organization is the sole data-access
 * boundary; person and Family spaces are computed queries over these rows.
 */
export const entities = pgTable(
  "entities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    title: text("title").notNull(),
    summary: text("summary"),
    createdByUserId: text("created_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    metadata: jsonb("metadata")
      .$type<Record<string, string | number | boolean | null>>()
      .notNull()
      .default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("entities_organization_id_idx").on(table.organizationId),
    index("entities_organization_type_idx").on(
      table.organizationId,
      table.type,
    ),
  ],
);

/** A real person in the household, optionally linked to a login account. */
export const people = pgTable(
  "people",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    preferredName: text("preferred_name").notNull(),
    legalName: text("legal_name"),
    birthday: date("birthday"),
    placeOfBirth: text("place_of_birth"),
    nationality: text("nationality"),
    currentCity: text("current_city"),
    currentAddress: text("current_address"),
    maritalStatus: text("marital_status"),
    languages: text("languages").array().notNull().default([]),
    avatarUrl: text("avatar_url"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("people_organization_id_idx").on(table.organizationId),
    uniqueIndex("people_organization_user_uidx")
      .on(table.organizationId, table.userId)
      .where(sql`${table.userId} is not null`),
  ],
);

/** Reusable structured facts shown in Personal details or Preferences. */
export const personFacts = pgTable(
  "person_facts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    personId: uuid("person_id")
      .notNull()
      .references(() => people.id, { onDelete: "cascade" }),
    kind: personFactKind("kind").notNull(),
    key: text("key").notNull(),
    label: text("label").notNull(),
    value: text("value").notNull(),
    source: personFactSource("source").notNull().default("self"),
    sourceDocumentId: uuid("source_document_id").references(() => entities.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("person_facts_person_key_uidx").on(table.personId, table.key),
    index("person_facts_person_kind_idx").on(table.personId, table.kind),
  ],
);

/** Structured records backed by, but never duplicating, source documents. */
export const officialRecords = pgTable(
  "official_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    personId: uuid("person_id")
      .notNull()
      .references(() => people.id, { onDelete: "cascade" }),
    recordType: text("record_type").notNull(),
    title: text("title").notNull(),
    identifier: text("identifier"),
    issuingAuthority: text("issuing_authority"),
    country: text("country"),
    issueDate: date("issue_date"),
    expiryDate: date("expiry_date"),
    status: officialRecordStatus("status").notNull().default("current"),
    sourceDocumentId: uuid("source_document_id").references(() => entities.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("official_records_person_id_idx").on(table.personId),
    index("official_records_expiry_date_idx").on(table.expiryDate),
  ],
);

/** Personal dates that are not already derived from the profile or a record. */
export const personalDates = pgTable(
  "personal_dates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    personId: uuid("person_id")
      .notNull()
      .references(() => people.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    occursOn: date("occurs_on").notNull(),
    recursAnnually: boolean("recurs_annually").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("personal_dates_person_id_idx").on(table.personId),
    index("personal_dates_occurs_on_idx").on(table.occursOn),
  ],
);

/** Person relationships determine where one canonical entity appears. */
export const entityPeople = pgTable(
  "entity_people",
  {
    entityId: uuid("entity_id")
      .notNull()
      .references(() => entities.id, { onDelete: "cascade" }),
    personId: uuid("person_id")
      .notNull()
      .references(() => people.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({
      name: "entity_people_pk",
      columns: [table.entityId, table.personId],
    }),
    index("entity_people_person_id_idx").on(table.personId),
  ],
);

/** Module relationships are context tags, not storage or access boundaries. */
export const entityModules = pgTable(
  "entity_modules",
  {
    entityId: uuid("entity_id")
      .notNull()
      .references(() => entities.id, { onDelete: "cascade" }),
    module: text("module").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({
      name: "entity_modules_pk",
      columns: [table.entityId, table.module],
    }),
    index("entity_modules_module_idx").on(table.module),
  ],
);

export const entitiesRelations = relations(entities, ({ one, many }) => ({
  organization: one(organization, {
    fields: [entities.organizationId],
    references: [organization.id],
  }),
  people: many(entityPeople),
  modules: many(entityModules),
}));

export const peopleRelations = relations(people, ({ one, many }) => ({
  organization: one(organization, {
    fields: [people.organizationId],
    references: [organization.id],
  }),
  user: one(user, {
    fields: [people.userId],
    references: [user.id],
  }),
  facts: many(personFacts),
  officialRecords: many(officialRecords),
  personalDates: many(personalDates),
  entities: many(entityPeople),
}));

export const personFactsRelations = relations(personFacts, ({ one }) => ({
  person: one(people, {
    fields: [personFacts.personId],
    references: [people.id],
  }),
  sourceDocument: one(entities, {
    fields: [personFacts.sourceDocumentId],
    references: [entities.id],
  }),
}));

export const officialRecordsRelations = relations(
  officialRecords,
  ({ one }) => ({
    person: one(people, {
      fields: [officialRecords.personId],
      references: [people.id],
    }),
    sourceDocument: one(entities, {
      fields: [officialRecords.sourceDocumentId],
      references: [entities.id],
    }),
  }),
);

export const personalDatesRelations = relations(personalDates, ({ one }) => ({
  person: one(people, {
    fields: [personalDates.personId],
    references: [people.id],
  }),
}));

export const entityPeopleRelations = relations(entityPeople, ({ one }) => ({
  entity: one(entities, {
    fields: [entityPeople.entityId],
    references: [entities.id],
  }),
  person: one(people, {
    fields: [entityPeople.personId],
    references: [people.id],
  }),
}));

export const entityModulesRelations = relations(entityModules, ({ one }) => ({
  entity: one(entities, {
    fields: [entityModules.entityId],
    references: [entities.id],
  }),
}));
