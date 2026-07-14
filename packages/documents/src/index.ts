import {
  listReadableEntityIds,
  requireEntityAccess,
  requireHouseholdMembership,
} from "@lifeos/access";
import {
  db,
  documents,
  entities,
  entityModules,
  entityPeople,
  fileObjects,
  people,
  user,
} from "@lifeos/db";
import { FileServiceError, type FileService } from "@lifeos/files";
import type { DocumentJobQueue } from "@lifeos/jobs";
import { and, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";

export const DOCUMENT_KINDS = [
  "Passport",
  "Residence permit",
  "Contract",
  "Payslip",
  "Invoice",
  "Receipt",
  "Tax document",
  "Insurance document",
  "Medical document",
  "Certificate",
  "Letter",
  "Travel booking",
  "Bank document",
  "Other",
] as const;

export type DocumentKind = (typeof DOCUMENT_KINDS)[number];

export class DocumentServiceError extends Error {
  constructor(
    public readonly code: "NOT_FOUND" | "INTERNAL",
    message: string,
  ) {
    super(message);
    this.name = "DocumentServiceError";
  }
}

export type DocumentRecord = {
  id: string;
  fileId: string;
  title: string;
  filename: string;
  mediaType: "PDF" | "Image";
  mimeType: string;
  pageCount: number | null;
  sizeBytes: number;
  kind: DocumentKind;
  issuer: string;
  modules: string[];
  people: string[];
  personIds: string[];
  status: "Current" | "Needs attention" | "Archived";
  attention: {
    label: string;
    kind: "expiry" | "renewal" | "signature" | "unlinked";
    tone: "warning" | "destructive" | "info";
  } | null;
  addedAt: string;
  issuedAt: string | null;
  expiresAt: string | null;
  source: "Upload" | "Scan" | "Email" | "Generated";
  tags: string[];
  fileStatus: "pending" | "ready" | "failed" | "deleting";
  previewStatus: "pending" | "ready" | "failed";
  organizationId: string;
  addedBy: { id: string; name: string } | null;
};

export type DocumentPickerItem = {
  id: string;
  title: string;
  filename: string;
  kind: string;
  issuer: string;
  addedAt: string;
};

export type DocumentPickerPage = {
  items: DocumentPickerItem[];
  total: number;
  nextOffset: number | null;
};

type DocumentRow = {
  entity: typeof entities.$inferSelect;
  document: typeof documents.$inferSelect;
  file: typeof fileObjects.$inferSelect;
  creatorId: string | null;
  creatorName: string | null;
};

type DocumentRelationships = {
  modules: string[];
  people: string[];
  personIds: string[];
};

const sourceLabels = {
  upload: "Upload",
  scan: "Scan",
  email: "Email",
  generated: "Generated",
} as const;

async function listRelationships(entityIds: string[]) {
  const byEntityId = new Map<string, DocumentRelationships>();
  if (entityIds.length === 0) return byEntityId;

  const [personRows, moduleRows] = await Promise.all([
    db
      .select({
        entityId: entityPeople.entityId,
        personId: people.id,
        preferredName: people.preferredName,
      })
      .from(entityPeople)
      .innerJoin(people, eq(entityPeople.personId, people.id))
      .where(inArray(entityPeople.entityId, entityIds)),
    db
      .select({
        entityId: entityModules.entityId,
        module: entityModules.module,
      })
      .from(entityModules)
      .where(inArray(entityModules.entityId, entityIds)),
  ]);

  function get(entityId: string) {
    const current = byEntityId.get(entityId) ?? {
      modules: [],
      people: [],
      personIds: [],
    };
    byEntityId.set(entityId, current);
    return current;
  }

  for (const row of personRows) {
    const relationships = get(row.entityId);
    relationships.people.push(row.preferredName);
    relationships.personIds.push(row.personId);
  }
  for (const row of moduleRows) {
    if (row.module !== "documents") get(row.entityId).modules.push(row.module);
  }

  return byEntityId;
}

function mapDocument(
  row: DocumentRow,
  relationships: DocumentRelationships,
): DocumentRecord {
  const now = new Date();
  const expiry = row.document.expiresAt
    ? new Date(`${row.document.expiresAt}T00:00:00.000Z`)
    : null;
  const daysUntilExpiry = expiry
    ? Math.ceil((expiry.getTime() - now.getTime()) / 86_400_000)
    : null;
  let status: DocumentRecord["status"] = "Current";
  let attention: DocumentRecord["attention"] = null;

  if (row.document.lifecycle === "archived") {
    status = "Archived";
  } else if (daysUntilExpiry !== null && daysUntilExpiry <= 90) {
    status = "Needs attention";
    attention = {
      label:
        daysUntilExpiry < 0
          ? "Expired"
          : `Ends ${expiry!.toLocaleDateString("en", {
              day: "numeric",
              month: "short",
              year: "numeric",
              timeZone: "UTC",
            })}`,
      kind: "expiry",
      tone: daysUntilExpiry < 0 ? "destructive" : "warning",
    };
  } else if (
    relationships.people.length === 0 &&
    relationships.modules.length === 0
  ) {
    attention = {
      label: "Unsorted",
      kind: "unlinked",
      tone: "info",
    };
  }

  return {
    id: row.entity.id,
    fileId: row.file.id,
    title: row.entity.title,
    filename: row.file.originalName,
    mediaType: row.file.contentType === "application/pdf" ? "PDF" : "Image",
    mimeType: row.file.contentType,
    pageCount: row.document.pageCount,
    sizeBytes: row.file.sizeBytes ?? row.file.expectedSizeBytes,
    kind: DOCUMENT_KINDS.includes(row.document.kind as DocumentKind)
      ? (row.document.kind as DocumentKind)
      : "Other",
    issuer: row.document.issuer,
    modules: relationships.modules,
    people: relationships.people,
    personIds: relationships.personIds,
    status,
    attention,
    addedAt: row.document.createdAt.toISOString(),
    issuedAt: row.document.issuedAt,
    expiresAt: row.document.expiresAt,
    source: sourceLabels[row.document.source],
    tags: row.document.tags,
    fileStatus: row.file.status,
    previewStatus: row.document.previewStatus,
    organizationId: row.entity.organizationId,
    addedBy:
      row.creatorId && row.creatorName
        ? { id: row.creatorId, name: row.creatorName }
        : null,
  };
}

export function createDocumentService(input: {
  files: FileService;
  previewQueue: DocumentJobQueue;
}) {
  async function getRecord(actorUserId: string, documentId: string) {
    await requireEntityAccess(actorUserId, documentId);
    const [row] = await db
      .select({
        entity: entities,
        document: documents,
        file: fileObjects,
        creatorId: user.id,
        creatorName: user.name,
      })
      .from(documents)
      .innerJoin(entities, eq(documents.entityId, entities.id))
      .innerJoin(
        fileObjects,
        and(
          eq(fileObjects.entityId, entities.id),
          eq(fileObjects.role, "original"),
        ),
      )
      .leftJoin(user, eq(entities.createdByUserId, user.id))
      .where(eq(documents.entityId, documentId))
      .limit(1);

    if (!row) {
      throw new DocumentServiceError("NOT_FOUND", "Document not found.");
    }
    const relationships = await listRelationships([documentId]);
    return mapDocument(
      row,
      relationships.get(documentId) ?? {
        modules: [],
        people: [],
        personIds: [],
      },
    );
  }

  return {
    async list(actorUserId: string, perspective: { personId?: string } = {}) {
      const readableIds = await listReadableEntityIds(actorUserId, "document");
      if (readableIds.length === 0) return [];

      if (perspective.personId) {
        const membership = await requireHouseholdMembership(actorUserId);
        const [selectedPerson] = await db
          .select({ id: people.id })
          .from(people)
          .where(
            and(
              eq(people.id, perspective.personId),
              eq(people.organizationId, membership.organization.id),
            ),
          )
          .limit(1);
        if (!selectedPerson) {
          throw new DocumentServiceError(
            "NOT_FOUND",
            "That person could not be found in your Family.",
          );
        }
      }

      const rows = await db
        .select({
          entity: entities,
          document: documents,
          file: fileObjects,
          creatorId: user.id,
          creatorName: user.name,
        })
        .from(documents)
        .innerJoin(entities, eq(documents.entityId, entities.id))
        .innerJoin(
          fileObjects,
          and(
            eq(fileObjects.entityId, entities.id),
            eq(fileObjects.role, "original"),
          ),
        )
        .leftJoin(user, eq(entities.createdByUserId, user.id))
        .where(inArray(documents.entityId, readableIds))
        .orderBy(desc(documents.createdAt));
      const relationships = await listRelationships(
        rows.map((row) => row.entity.id),
      );

      const records = rows.map((row) =>
        mapDocument(
          row,
          relationships.get(row.entity.id) ?? {
            modules: [],
            people: [],
            personIds: [],
          },
        ),
      );
      return perspective.personId
        ? records.filter((record) =>
            record.personIds.includes(perspective.personId!),
          )
        : records;
    },

    async search(
      actorUserId: string,
      search: { query: string; offset: number; limit: number },
    ): Promise<DocumentPickerPage> {
      const membership = await requireHouseholdMembership(actorUserId);
      const query = search.query.trim();
      const baseCondition = and(
        eq(entities.organizationId, membership.organization.id),
        eq(documents.lifecycle, "active"),
        eq(fileObjects.role, "original"),
        eq(fileObjects.status, "ready"),
      );
      const pattern = `%${query}%`;
      const whereCondition = query
        ? and(
            baseCondition,
            or(
              ilike(entities.title, pattern),
              ilike(fileObjects.originalName, pattern),
              ilike(documents.kind, pattern),
              ilike(documents.issuer, pattern),
            ),
          )
        : baseCondition;

      const [rows, countRows] = await Promise.all([
        db
          .select({
            id: entities.id,
            title: entities.title,
            filename: fileObjects.originalName,
            kind: documents.kind,
            issuer: documents.issuer,
            addedAt: documents.createdAt,
          })
          .from(documents)
          .innerJoin(entities, eq(documents.entityId, entities.id))
          .innerJoin(
            fileObjects,
            and(
              eq(fileObjects.entityId, entities.id),
              eq(fileObjects.role, "original"),
            ),
          )
          .where(whereCondition)
          .orderBy(desc(entities.updatedAt), desc(entities.id))
          .limit(search.limit)
          .offset(search.offset),
        db
          .select({
            count: sql<number>`count(*)`.mapWith(Number),
          })
          .from(documents)
          .innerJoin(entities, eq(documents.entityId, entities.id))
          .innerJoin(
            fileObjects,
            and(
              eq(fileObjects.entityId, entities.id),
              eq(fileObjects.role, "original"),
            ),
          )
          .where(whereCondition),
      ]);

      const total = countRows[0]?.count ?? 0;
      const nextOffset = search.offset + rows.length;
      return {
        items: rows.map((row) => ({
          ...row,
          addedAt: row.addedAt.toISOString(),
        })),
        total,
        nextOffset: nextOffset < total ? nextOffset : null,
      };
    },

    async createUpload(
      actorUserId: string,
      create: {
        organizationId?: string;
        title: string;
        kind: DocumentKind;
        issuer: string;
        filename: string;
        contentType: string;
        sizeBytes: number;
        personIds: string[];
        modules: string[];
      },
    ) {
      const membership = await requireHouseholdMembership(
        actorUserId,
        create.organizationId,
      );
      const personIds = [...new Set(create.personIds)];
      const modules = [...new Set(create.modules)];

      if (personIds.length > 0) {
        const matchingPeople = await db
          .select({ id: people.id })
          .from(people)
          .where(
            and(
              eq(people.organizationId, membership.organization.id),
              inArray(people.id, personIds),
            ),
          );
        if (matchingPeople.length !== personIds.length) {
          throw new DocumentServiceError(
            "NOT_FOUND",
            "One of the selected people is not in this Family.",
          );
        }
      }

      const [entity] = await db.transaction(async (tx) => {
        const createdEntities = await tx
          .insert(entities)
          .values({
            organizationId: membership.organization.id,
            type: "document",
            title: create.title,
            summary: create.issuer === "Unknown" ? null : create.issuer,
            createdByUserId: actorUserId,
          })
          .returning();
        const createdEntity = createdEntities[0];
        if (!createdEntity) {
          throw new DocumentServiceError(
            "INTERNAL",
            "The document could not be created.",
          );
        }

        await tx.insert(documents).values({
          entityId: createdEntity.id,
          kind: create.kind,
          issuer: create.issuer,
          source: "upload",
        });
        if (personIds.length > 0) {
          await tx.insert(entityPeople).values(
            personIds.map((personId) => ({
              entityId: createdEntity.id,
              personId,
            })),
          );
        }
        await tx.insert(entityModules).values([
          { entityId: createdEntity.id, module: "documents" },
          ...modules.map((module) => ({
            entityId: createdEntity.id,
            module,
          })),
        ]);
        return createdEntities;
      });

      if (!entity) {
        throw new DocumentServiceError(
          "INTERNAL",
          "The document could not be created.",
        );
      }

      try {
        const upload = await input.files.createUpload({
          actorUserId,
          entityId: entity.id,
          filename: create.filename,
          contentType: create.contentType,
          sizeBytes: create.sizeBytes,
          role: "original",
        });

        return {
          documentId: entity.id,
          fileId: upload.fileId,
          upload: {
            url: upload.url,
            method: "PUT" as const,
            headers: upload.headers,
            expiresAt: upload.expiresAt.toISOString(),
          },
        };
      } catch (error) {
        await db.delete(entities).where(eq(entities.id, entity.id));
        throw error;
      }
    },

    async completeUpload(
      actorUserId: string,
      complete: { documentId: string; fileId: string },
    ) {
      await requireEntityAccess(actorUserId, complete.documentId);
      const [upload] = await db
        .select({ contentType: fileObjects.contentType })
        .from(fileObjects)
        .where(
          and(
            eq(fileObjects.id, complete.fileId),
            eq(fileObjects.entityId, complete.documentId),
          ),
        )
        .limit(1);
      if (upload?.contentType === "application/pdf") {
        // Queue installation/migrations must complete before entering the
        // upload-finalization transaction used by the Drizzle adapter.
        await input.previewQueue.start();
      }

      await input.files.completeUpload({
        actorUserId,
        entityId: complete.documentId,
        fileId: complete.fileId,
        onReady: async ({ transaction, file }) => {
          const now = new Date();
          const isPdf = file.contentType === "application/pdf";
          const [existingPreview] = isPdf
            ? await transaction
                .select({ status: fileObjects.status })
                .from(fileObjects)
                .where(
                  and(
                    eq(fileObjects.entityId, complete.documentId),
                    eq(fileObjects.role, "preview"),
                  ),
                )
                .limit(1)
            : [];
          const previewReady = existingPreview?.status === "ready";

          await transaction
            .update(documents)
            .set({
              previewStatus: isPdf && !previewReady ? "pending" : "ready",
              previewFailureReason: null,
              updatedAt: now,
            })
            .where(eq(documents.entityId, complete.documentId));
          await transaction
            .update(entities)
            .set({ updatedAt: now })
            .where(eq(entities.id, complete.documentId));

          if (isPdf && !previewReady) {
            await input.previewQueue.enqueuePdfPreview({
              documentId: complete.documentId,
              sourceFileId: file.id,
              transaction,
            });
          }
        },
      });

      return getRecord(actorUserId, complete.documentId);
    },

    async setRelationships(
      actorUserId: string,
      documentId: string,
      relationships: { personIds: string[]; modules: string[] },
    ) {
      const entity = await requireEntityAccess(actorUserId, documentId);
      const personIds = [...new Set(relationships.personIds)];
      const modules = [...new Set(relationships.modules)];

      if (personIds.length > 0) {
        const matchingPeople = await db
          .select({ id: people.id })
          .from(people)
          .where(
            and(
              eq(people.organizationId, entity.organizationId),
              inArray(people.id, personIds),
            ),
          );
        if (matchingPeople.length !== personIds.length) {
          throw new DocumentServiceError(
            "NOT_FOUND",
            "One of the selected people is not in this Family.",
          );
        }
      }

      await db.transaction(async (tx) => {
        await tx
          .delete(entityPeople)
          .where(eq(entityPeople.entityId, documentId));
        await tx
          .delete(entityModules)
          .where(eq(entityModules.entityId, documentId));

        if (personIds.length > 0) {
          await tx
            .insert(entityPeople)
            .values(
              personIds.map((personId) => ({ entityId: documentId, personId })),
            );
        }
        await tx
          .insert(entityModules)
          .values([
            { entityId: documentId, module: "documents" },
            ...modules.map((module) => ({ entityId: documentId, module })),
          ]);
        await tx
          .update(entities)
          .set({ updatedAt: new Date() })
          .where(eq(entities.id, documentId));
      });

      return getRecord(actorUserId, documentId);
    },

    async getDownloadUrl(
      actorUserId: string,
      documentId: string,
      disposition: "inline" | "attachment",
    ) {
      const result = await input.files.createDownloadUrl({
        actorUserId,
        entityId: documentId,
        disposition,
      });

      return {
        url: result.url,
        filename: result.file.originalName,
        expiresAt: result.expiresAt.toISOString(),
      };
    },

    async getPreviewUrl(actorUserId: string, documentId: string) {
      const record = await getRecord(actorUserId, documentId);
      const role = record.mediaType === "PDF" ? "preview" : "original";

      if (record.mediaType === "PDF" && record.previewStatus !== "ready") {
        return {
          status: record.previewStatus,
          url: null,
          expiresAt: null,
        };
      }

      try {
        const result = await input.files.createDownloadUrl({
          actorUserId,
          entityId: documentId,
          role,
          disposition: "inline",
        });
        return {
          status: "ready" as const,
          url: result.url,
          expiresAt: result.expiresAt.toISOString(),
        };
      } catch (error) {
        if (
          record.mediaType === "PDF" &&
          error instanceof FileServiceError &&
          (error.code === "NOT_FOUND" || error.code === "NOT_READY")
        ) {
          return {
            status: record.previewStatus === "failed" ? "failed" : "pending",
            url: null,
            expiresAt: null,
          } as const;
        }
        throw error;
      }
    },

    async setArchived(
      actorUserId: string,
      documentId: string,
      archived: boolean,
    ) {
      await requireEntityAccess(actorUserId, documentId);
      const now = new Date();
      const [updated] = await db
        .update(documents)
        .set({
          lifecycle: archived ? "archived" : "active",
          archivedAt: archived ? now : null,
          updatedAt: now,
        })
        .where(eq(documents.entityId, documentId))
        .returning({ entityId: documents.entityId });
      if (!updated) {
        throw new DocumentServiceError("NOT_FOUND", "Document not found.");
      }
      await db
        .update(entities)
        .set({ updatedAt: now })
        .where(eq(entities.id, documentId));
      return getRecord(actorUserId, documentId);
    },

    async delete(actorUserId: string, documentId: string) {
      await requireEntityAccess(actorUserId, documentId);
      await input.files.deleteFilesForEntity({
        actorUserId,
        entityId: documentId,
      });
      const [deleted] = await db
        .delete(entities)
        .where(eq(entities.id, documentId))
        .returning({ id: entities.id });
      if (!deleted) {
        throw new DocumentServiceError("NOT_FOUND", "Document not found.");
      }
      return { deleted: true as const };
    },
  };
}

export type DocumentService = ReturnType<typeof createDocumentService>;
