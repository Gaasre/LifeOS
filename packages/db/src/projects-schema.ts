import { relations, sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  check,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { entities } from "./domain-schema";

export const projectStatus = pgEnum("project_status", [
  "active",
  "paused",
  "completed",
]);

export const projectStepStatus = pgEnum("project_step_status", [
  "pending",
  "active",
  "completed",
]);

/** Project-specific fields for a canonical household entity. */
export const projects = pgTable(
  "projects",
  {
    entityId: uuid("entity_id")
      .primaryKey()
      .references(() => entities.id, { onDelete: "cascade" }),
    outcome: text("outcome").notNull(),
    whyItMatters: text("why_it_matters"),
    status: projectStatus("status").notNull().default("active"),
    coverImage: text("cover_image"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("projects_status_idx").on(table.status)],
);

/** Ordered path stages and their optional one-level preparation substeps. */
export const projectSteps = pgTable(
  "project_steps",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.entityId, { onDelete: "cascade" }),
    parentStepId: uuid("parent_step_id").references(
      (): AnyPgColumn => projectSteps.id,
      { onDelete: "cascade" },
    ),
    title: text("title").notNull(),
    description: text("description"),
    status: projectStepStatus("status").notNull().default("pending"),
    position: integer("position").notNull().default(0),
    dueDate: date("due_date"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("project_steps_project_parent_position_uidx")
      .on(table.projectId, table.parentStepId, table.position)
      .nullsNotDistinct(),
    index("project_steps_project_status_idx").on(table.projectId, table.status),
    index("project_steps_parent_id_idx").on(table.parentStepId),
    index("project_steps_due_date_idx").on(table.dueDate),
    check("project_steps_position_check", sql`${table.position} >= 0`),
    check(
      "project_steps_not_own_parent_check",
      sql`${table.parentStepId} is null or ${table.parentStepId} <> ${table.id}`,
    ),
  ],
);

/** Documents stored in Documents and linked to the whole project. */
export const projectDocuments = pgTable(
  "project_documents",
  {
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.entityId, { onDelete: "cascade" }),
    documentId: uuid("document_id")
      .notNull()
      .references(() => entities.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({
      name: "project_documents_pk",
      columns: [table.projectId, table.documentId],
    }),
    index("project_documents_document_id_idx").on(table.documentId),
  ],
);

/** Documents stored in Documents and required by one path stage. */
export const projectStepDocuments = pgTable(
  "project_step_documents",
  {
    stepId: uuid("step_id")
      .notNull()
      .references(() => projectSteps.id, { onDelete: "cascade" }),
    documentId: uuid("document_id")
      .notNull()
      .references(() => entities.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({
      name: "project_step_documents_pk",
      columns: [table.stepId, table.documentId],
    }),
    index("project_step_documents_document_id_idx").on(table.documentId),
  ],
);

/** Optional links to other canonical LifeOS entities. */
export const projectRelatedEntities = pgTable(
  "project_related_entities",
  {
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.entityId, { onDelete: "cascade" }),
    relatedEntityId: uuid("related_entity_id")
      .notNull()
      .references(() => entities.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({
      name: "project_related_entities_pk",
      columns: [table.projectId, table.relatedEntityId],
    }),
    index("project_related_entities_related_id_idx").on(table.relatedEntityId),
    check(
      "project_related_entities_not_self_check",
      sql`${table.projectId} <> ${table.relatedEntityId}`,
    ),
  ],
);

export const projectsRelations = relations(projects, ({ one, many }) => ({
  entity: one(entities, {
    fields: [projects.entityId],
    references: [entities.id],
  }),
  steps: many(projectSteps),
  documents: many(projectDocuments),
  relatedEntities: many(projectRelatedEntities),
}));

export const projectStepsRelations = relations(
  projectSteps,
  ({ one, many }) => ({
    project: one(projects, {
      fields: [projectSteps.projectId],
      references: [projects.entityId],
    }),
    parent: one(projectSteps, {
      fields: [projectSteps.parentStepId],
      references: [projectSteps.id],
      relationName: "project_step_children",
    }),
    children: many(projectSteps, { relationName: "project_step_children" }),
    documents: many(projectStepDocuments),
  }),
);

export const projectDocumentsRelations = relations(
  projectDocuments,
  ({ one }) => ({
    project: one(projects, {
      fields: [projectDocuments.projectId],
      references: [projects.entityId],
    }),
    document: one(entities, {
      fields: [projectDocuments.documentId],
      references: [entities.id],
    }),
  }),
);

export const projectStepDocumentsRelations = relations(
  projectStepDocuments,
  ({ one }) => ({
    step: one(projectSteps, {
      fields: [projectStepDocuments.stepId],
      references: [projectSteps.id],
    }),
    document: one(entities, {
      fields: [projectStepDocuments.documentId],
      references: [entities.id],
    }),
  }),
);

export const projectRelatedEntitiesRelations = relations(
  projectRelatedEntities,
  ({ one }) => ({
    project: one(projects, {
      fields: [projectRelatedEntities.projectId],
      references: [projects.entityId],
    }),
    relatedEntity: one(entities, {
      fields: [projectRelatedEntities.relatedEntityId],
      references: [entities.id],
    }),
  }),
);
