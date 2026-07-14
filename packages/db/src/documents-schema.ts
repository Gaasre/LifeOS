import { relations, sql } from "drizzle-orm";
import {
  bigint,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { user } from "./auth-schema";
import { entities } from "./domain-schema";

export const fileObjectRole = pgEnum("file_object_role", [
  "original",
  "attachment",
  "preview",
  "thumbnail",
  "export",
]);
export const fileObjectStatus = pgEnum("file_object_status", [
  "pending",
  "ready",
  "failed",
  "deleting",
]);
export const documentSource = pgEnum("document_source", [
  "upload",
  "scan",
  "email",
  "generated",
]);
export const documentLifecycle = pgEnum("document_lifecycle", [
  "active",
  "archived",
]);
export const documentPreviewStatus = pgEnum("document_preview_status", [
  "pending",
  "ready",
  "failed",
]);
export const fileAuditAction = pgEnum("file_audit_action", [
  "upload_started",
  "upload_completed",
  "upload_failed",
  "download_url_issued",
  "delete_requested",
  "deleted",
]);

export const fileObjects = pgTable(
  "file_objects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entityId: uuid("entity_id")
      .notNull()
      .references(() => entities.id, { onDelete: "cascade" }),
    role: fileObjectRole("role").notNull().default("attachment"),
    storageProvider: text("storage_provider").notNull().default("r2"),
    storageBucket: text("storage_bucket").notNull(),
    objectKey: text("object_key").notNull(),
    originalName: text("original_name").notNull(),
    contentType: text("content_type").notNull(),
    expectedSizeBytes: bigint("expected_size_bytes", {
      mode: "number",
    }).notNull(),
    sizeBytes: bigint("size_bytes", { mode: "number" }),
    etag: text("etag"),
    checksumSha256: text("checksum_sha256"),
    status: fileObjectStatus("status").notNull().default("pending"),
    failureReason: text("failure_reason"),
    uploadExpiresAt: timestamp("upload_expires_at", {
      withTimezone: true,
    }).notNull(),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true }),
    createdByUserId: text("created_by_user_id").references(() => user.id, {
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
    uniqueIndex("file_objects_storage_key_uidx").on(
      table.storageProvider,
      table.storageBucket,
      table.objectKey,
    ),
    uniqueIndex("file_objects_original_entity_uidx")
      .on(table.entityId)
      .where(sql`${table.role} = 'original'`),
    uniqueIndex("file_objects_preview_entity_uidx")
      .on(table.entityId)
      .where(sql`${table.role} = 'preview'`),
    index("file_objects_entity_status_idx").on(table.entityId, table.status),
    index("file_objects_pending_expiry_idx").on(
      table.status,
      table.uploadExpiresAt,
    ),
  ],
);

export const documents = pgTable(
  "documents",
  {
    entityId: uuid("entity_id")
      .primaryKey()
      .references(() => entities.id, { onDelete: "cascade" }),
    kind: text("kind").notNull().default("Other"),
    issuer: text("issuer").notNull().default("Unknown"),
    source: documentSource("source").notNull().default("upload"),
    lifecycle: documentLifecycle("lifecycle").notNull().default("active"),
    previewStatus: documentPreviewStatus("preview_status")
      .notNull()
      .default("pending"),
    previewFailureReason: text("preview_failure_reason"),
    pageCount: integer("page_count"),
    issuedAt: date("issued_at"),
    expiresAt: date("expires_at"),
    tags: text("tags").array().notNull().default([]),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("documents_lifecycle_created_idx").on(
      table.lifecycle,
      table.createdAt,
    ),
    index("documents_expires_at_idx").on(table.expiresAt),
  ],
);

export const fileAccessEvents = pgTable(
  "file_access_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    fileObjectId: uuid("file_object_id").references(() => fileObjects.id, {
      onDelete: "set null",
    }),
    entityId: uuid("entity_id").references(() => entities.id, {
      onDelete: "set null",
    }),
    actorUserId: text("actor_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    action: fileAuditAction("action").notNull(),
    metadata: jsonb("metadata")
      .$type<Record<string, string | number | boolean | null>>()
      .notNull()
      .default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("file_access_events_entity_created_idx").on(
      table.entityId,
      table.createdAt,
    ),
    index("file_access_events_actor_created_idx").on(
      table.actorUserId,
      table.createdAt,
    ),
  ],
);

export const fileObjectsRelations = relations(fileObjects, ({ one, many }) => ({
  entity: one(entities, {
    fields: [fileObjects.entityId],
    references: [entities.id],
  }),
  creator: one(user, {
    fields: [fileObjects.createdByUserId],
    references: [user.id],
  }),
  accessEvents: many(fileAccessEvents),
}));

export const documentsRelations = relations(documents, ({ one }) => ({
  entity: one(entities, {
    fields: [documents.entityId],
    references: [entities.id],
  }),
}));

export const fileAccessEventsRelations = relations(
  fileAccessEvents,
  ({ one }) => ({
    fileObject: one(fileObjects, {
      fields: [fileAccessEvents.fileObjectId],
      references: [fileObjects.id],
    }),
    entity: one(entities, {
      fields: [fileAccessEvents.entityId],
      references: [entities.id],
    }),
    actor: one(user, {
      fields: [fileAccessEvents.actorUserId],
      references: [user.id],
    }),
  }),
);
