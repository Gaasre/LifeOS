import { requireEntityAccess } from "@lifeos/access";
import { db, entities, fileAccessEvents, fileObjects } from "@lifeos/db";
import type { DatabaseTransaction } from "@lifeos/db";
import type { ObjectStorage } from "@lifeos/storage";
import { and, eq } from "drizzle-orm";

export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;
export const ALLOWED_FILE_CONTENT_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/heic",
  "image/heif",
] as const;

type AllowedContentType = (typeof ALLOWED_FILE_CONTENT_TYPES)[number];
export type FileObjectRole =
  "original" | "attachment" | "preview" | "thumbnail" | "export";

export class FileServiceError extends Error {
  constructor(
    public readonly code:
      "NOT_FOUND" | "INVALID_FILE" | "UPLOAD_FAILED" | "NOT_READY",
    message: string,
  ) {
    super(message);
    this.name = "FileServiceError";
  }
}

export type FileService = ReturnType<typeof createFileService>;
export type FileProcessingService = ReturnType<
  typeof createFileProcessingService
>;

function normalizeContentType(value: string | null) {
  return value?.split(";", 1)[0]?.trim().toLowerCase() ?? null;
}

function validateFile(input: {
  filename: string;
  contentType: string;
  sizeBytes: number;
}) {
  const filename = input.filename.trim();
  const contentType = normalizeContentType(input.contentType);

  if (!filename || filename.length > 240 || /[\0\r\n]/.test(filename)) {
    throw new FileServiceError(
      "INVALID_FILE",
      "Choose a file with a valid filename.",
    );
  }
  if (
    !contentType ||
    !ALLOWED_FILE_CONTENT_TYPES.includes(contentType as AllowedContentType)
  ) {
    throw new FileServiceError(
      "INVALID_FILE",
      "LifeOS currently accepts PDF, PNG, JPG, HEIC, and HEIF files.",
    );
  }
  if (
    !Number.isSafeInteger(input.sizeBytes) ||
    input.sizeBytes <= 0 ||
    input.sizeBytes > MAX_FILE_SIZE_BYTES
  ) {
    throw new FileServiceError(
      "INVALID_FILE",
      "The file must be larger than 0 bytes and no larger than 50 MB.",
    );
  }

  return { filename, contentType };
}

/**
 * Trusted server-side operations for durable file-processing jobs. Unlike the
 * user-facing file service, this service intentionally has no interactive-user
 * authorization dependency; callers must only invoke it for a claimed job.
 */
export function createFileProcessingService(input: { storage: ObjectStorage }) {
  return {
    async readReadyFile(read: {
      entityId: string;
      fileId?: string;
      role: FileObjectRole;
    }) {
      const [file] = await db
        .select()
        .from(fileObjects)
        .where(
          read.fileId
            ? and(
                eq(fileObjects.id, read.fileId),
                eq(fileObjects.entityId, read.entityId),
                eq(fileObjects.role, read.role),
              )
            : and(
                eq(fileObjects.entityId, read.entityId),
                eq(fileObjects.role, read.role),
              ),
        )
        .limit(1);

      if (!file) {
        throw new FileServiceError("NOT_FOUND", "The file was not found.");
      }
      if (file.status !== "ready") {
        throw new FileServiceError(
          "NOT_READY",
          "The file is not ready to be processed.",
        );
      }

      try {
        const object = await input.storage.getObject(file.objectKey);
        return { file, bytes: object.body };
      } catch {
        throw new FileServiceError(
          "UPLOAD_FAILED",
          "The file could not be read from storage.",
        );
      }
    },

    async storeDerivedFile(derived: {
      entityId: string;
      role: Exclude<FileObjectRole, "original">;
      filename: string;
      contentType: string;
      bytes: Uint8Array;
      createdByUserId: string | null;
      sourceFileId?: string;
      onStored?: (input: {
        transaction: DatabaseTransaction;
        file: typeof fileObjects.$inferSelect;
      }) => Promise<void>;
    }) {
      const validated = validateFile({
        filename: derived.filename,
        contentType: derived.contentType,
        sizeBytes: derived.bytes.byteLength,
      });
      const [entity] = await db
        .select({ organizationId: entities.organizationId })
        .from(entities)
        .where(eq(entities.id, derived.entityId))
        .limit(1);

      if (!entity?.organizationId) {
        throw new FileServiceError(
          "NOT_FOUND",
          "The item does not belong to a Family.",
        );
      }

      const [existing] = await db
        .select()
        .from(fileObjects)
        .where(
          and(
            eq(fileObjects.entityId, derived.entityId),
            eq(fileObjects.role, derived.role),
          ),
        )
        .limit(1);
      const fileId = existing?.id ?? crypto.randomUUID();
      const objectKey = derived.sourceFileId
        ? `v1/${entity.organizationId}/${derived.entityId}/derived/${derived.role}/${derived.sourceFileId}`
        : `v1/${entity.organizationId}/${derived.entityId}/${fileId}`;

      let object: Awaited<ReturnType<ObjectStorage["putObject"]>>;
      try {
        object = await input.storage.putObject({
          key: objectKey,
          body: derived.bytes,
          contentType: validated.contentType,
        });
      } catch {
        throw new FileServiceError(
          "UPLOAD_FAILED",
          "The preview could not be stored.",
        );
      }

      const now = new Date();
      try {
        const file = await db.transaction(async (tx) => {
          const values = {
            storageProvider: input.storage.provider,
            storageBucket: input.storage.bucket,
            objectKey,
            originalName: validated.filename,
            contentType: validated.contentType,
            expectedSizeBytes: derived.bytes.byteLength,
            sizeBytes: object.sizeBytes,
            etag: object.etag,
            status: "ready" as const,
            failureReason: null,
            uploadExpiresAt: now,
            uploadedAt: now,
            createdByUserId: derived.createdByUserId,
            updatedAt: now,
          };
          const [updated] = existing
            ? await tx
                .update(fileObjects)
                .set(values)
                .where(eq(fileObjects.id, existing.id))
                .returning()
            : [];
          const [file] = updated
            ? [updated]
            : await tx
                .insert(fileObjects)
                .values({
                  id: fileId,
                  entityId: derived.entityId,
                  role: derived.role,
                  ...values,
                })
                .returning();

          if (!file) {
            throw new FileServiceError(
              "UPLOAD_FAILED",
              "The preview could not be recorded.",
            );
          }
          await tx.insert(fileAccessEvents).values({
            fileObjectId: file.id,
            entityId: file.entityId,
            actorUserId: derived.createdByUserId,
            action: "upload_completed",
            metadata: { generated: true, role: derived.role },
          });
          await derived.onStored?.({ transaction: tx, file });
          return file;
        });

        if (existing && existing.objectKey !== objectKey) {
          await input.storage
            .deleteObject(existing.objectKey)
            .catch(() => undefined);
        }
        return file;
      } catch (error) {
        // A deterministic derived key is deliberately retained after a
        // database failure so a retry can safely overwrite and adopt it.
        if (!derived.sourceFileId) {
          await input.storage.deleteObject(objectKey).catch(() => undefined);
        }
        if (error instanceof FileServiceError) throw error;
        throw new FileServiceError(
          "UPLOAD_FAILED",
          "The preview could not be recorded.",
        );
      }
    },
  };
}

export function createFileService(input: {
  storage: ObjectStorage;
  uploadUrlTtlSeconds?: number;
  downloadUrlTtlSeconds?: number;
}) {
  const uploadUrlTtlSeconds = input.uploadUrlTtlSeconds ?? 300;
  const downloadUrlTtlSeconds = input.downloadUrlTtlSeconds ?? 60;
  const processing = createFileProcessingService({ storage: input.storage });

  return {
    async createUpload(upload: {
      actorUserId: string;
      entityId: string;
      filename: string;
      contentType: string;
      sizeBytes: number;
      role?: FileObjectRole;
    }) {
      await requireEntityAccess(upload.actorUserId, upload.entityId);
      const validated = validateFile(upload);
      const [entity] = await db
        .select({ organizationId: entities.organizationId })
        .from(entities)
        .where(eq(entities.id, upload.entityId))
        .limit(1);

      if (!entity?.organizationId) {
        throw new FileServiceError(
          "NOT_FOUND",
          "The item does not belong to a Family.",
        );
      }

      const fileId = crypto.randomUUID();
      const objectKey = `v1/${entity.organizationId}/${upload.entityId}/${fileId}`;
      const uploadExpiresAt = new Date(
        Date.now() + uploadUrlTtlSeconds * 1_000,
      );

      await db.transaction(async (tx) => {
        await tx.insert(fileObjects).values({
          id: fileId,
          entityId: upload.entityId,
          role: upload.role ?? "attachment",
          storageProvider: input.storage.provider,
          storageBucket: input.storage.bucket,
          objectKey,
          originalName: validated.filename,
          contentType: validated.contentType,
          expectedSizeBytes: upload.sizeBytes,
          uploadExpiresAt,
          createdByUserId: upload.actorUserId,
        });
        await tx.insert(fileAccessEvents).values({
          fileObjectId: fileId,
          entityId: upload.entityId,
          actorUserId: upload.actorUserId,
          action: "upload_started",
          metadata: {
            sizeBytes: upload.sizeBytes,
            contentType: validated.contentType,
          },
        });
      });

      try {
        const signed = await input.storage.createUploadUrl({
          key: objectKey,
          contentType: validated.contentType,
          expiresInSeconds: uploadUrlTtlSeconds,
        });

        return {
          fileId,
          url: signed.url,
          expiresAt: signed.expiresAt,
          headers: { "Content-Type": validated.contentType },
        };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Object storage unavailable";
        await db.transaction(async (tx) => {
          await tx
            .update(fileObjects)
            .set({
              status: "failed",
              failureReason: message.slice(0, 500),
              updatedAt: new Date(),
            })
            .where(eq(fileObjects.id, fileId));
          await tx.insert(fileAccessEvents).values({
            fileObjectId: fileId,
            entityId: upload.entityId,
            actorUserId: upload.actorUserId,
            action: "upload_failed",
            metadata: { reason: "signing_failed" },
          });
        });
        throw new FileServiceError(
          "UPLOAD_FAILED",
          "LifeOS could not prepare the secure upload.",
        );
      }
    },

    async completeUpload(complete: {
      actorUserId: string;
      entityId: string;
      fileId: string;
      onReady?: (input: {
        transaction: DatabaseTransaction;
        file: typeof fileObjects.$inferSelect;
      }) => Promise<void>;
    }) {
      await requireEntityAccess(complete.actorUserId, complete.entityId);
      const [file] = await db
        .select()
        .from(fileObjects)
        .where(
          and(
            eq(fileObjects.id, complete.fileId),
            eq(fileObjects.entityId, complete.entityId),
          ),
        )
        .limit(1);

      if (!file) {
        throw new FileServiceError("NOT_FOUND", "The upload was not found.");
      }
      if (file.status === "ready") {
        if (complete.onReady) {
          await db.transaction((transaction) =>
            complete.onReady!({ transaction, file }),
          );
        }
        return file;
      }
      if (file.status !== "pending") {
        throw new FileServiceError(
          "UPLOAD_FAILED",
          "This upload can no longer be completed.",
        );
      }

      let object;
      try {
        object = await input.storage.headObject(file.objectKey);
      } catch {
        throw new FileServiceError(
          "UPLOAD_FAILED",
          "The uploaded object could not be verified.",
        );
      }

      const actualContentType = normalizeContentType(object.contentType);
      const expectedContentType = normalizeContentType(file.contentType);
      const valid =
        object.sizeBytes === file.expectedSizeBytes &&
        actualContentType === expectedContentType;

      if (!valid) {
        await input.storage.deleteObject(file.objectKey).catch(() => undefined);
        await db.transaction(async (tx) => {
          await tx
            .update(fileObjects)
            .set({
              status: "failed",
              failureReason: "The uploaded object did not match its intent.",
              sizeBytes: object.sizeBytes,
              etag: object.etag,
              updatedAt: new Date(),
            })
            .where(eq(fileObjects.id, file.id));
          await tx.insert(fileAccessEvents).values({
            fileObjectId: file.id,
            entityId: file.entityId,
            actorUserId: complete.actorUserId,
            action: "upload_failed",
            metadata: { reason: "metadata_mismatch" },
          });
        });
        throw new FileServiceError(
          "INVALID_FILE",
          "The uploaded file did not match its expected size or type.",
        );
      }

      const now = new Date();
      const readyFile = await db.transaction(async (transaction) => {
        const [readyFile] = await transaction
          .update(fileObjects)
          .set({
            status: "ready",
            sizeBytes: object.sizeBytes,
            etag: object.etag,
            uploadedAt: now,
            failureReason: null,
            updatedAt: now,
          })
          .where(eq(fileObjects.id, file.id))
          .returning();
        if (!readyFile) {
          throw new FileServiceError(
            "UPLOAD_FAILED",
            "The uploaded file could not be finalized.",
          );
        }
        await transaction.insert(fileAccessEvents).values({
          fileObjectId: file.id,
          entityId: file.entityId,
          actorUserId: complete.actorUserId,
          action: "upload_completed",
          metadata: { sizeBytes: object.sizeBytes },
        });
        await complete.onReady?.({ transaction, file: readyFile });
        return readyFile;
      });
      return readyFile;
    },

    async readFile(read: {
      actorUserId: string;
      entityId: string;
      role: FileObjectRole;
    }) {
      await requireEntityAccess(read.actorUserId, read.entityId);
      return processing.readReadyFile(read);
    },

    async createDerivedFile(derived: {
      actorUserId: string;
      entityId: string;
      role: Exclude<FileObjectRole, "original">;
      filename: string;
      contentType: string;
      bytes: Uint8Array;
    }) {
      await requireEntityAccess(derived.actorUserId, derived.entityId);
      return processing.storeDerivedFile({
        entityId: derived.entityId,
        role: derived.role,
        filename: derived.filename,
        contentType: derived.contentType,
        bytes: derived.bytes,
        createdByUserId: derived.actorUserId,
      });
    },

    async createDownloadUrl(download: {
      actorUserId: string;
      entityId: string;
      fileId?: string;
      role?: FileObjectRole;
      disposition: "inline" | "attachment";
    }) {
      await requireEntityAccess(download.actorUserId, download.entityId);
      const [file] = await db
        .select()
        .from(fileObjects)
        .where(
          download.fileId
            ? and(
                eq(fileObjects.id, download.fileId),
                eq(fileObjects.entityId, download.entityId),
              )
            : and(
                eq(fileObjects.entityId, download.entityId),
                eq(fileObjects.role, download.role ?? "original"),
              ),
        )
        .limit(1);

      if (!file) {
        throw new FileServiceError("NOT_FOUND", "The file was not found.");
      }
      if (file.status !== "ready") {
        throw new FileServiceError(
          "NOT_READY",
          "The file is not ready to open yet.",
        );
      }

      const signed = await input.storage.createDownloadUrl({
        key: file.objectKey,
        filename: file.originalName,
        disposition: download.disposition,
        expiresInSeconds: downloadUrlTtlSeconds,
      });
      await db.insert(fileAccessEvents).values({
        fileObjectId: file.id,
        entityId: file.entityId,
        actorUserId: download.actorUserId,
        action: "download_url_issued",
        metadata: { disposition: download.disposition },
      });

      return {
        file,
        url: signed.url,
        expiresAt: signed.expiresAt,
      };
    },

    async deleteFilesForEntity(deleteInput: {
      actorUserId: string;
      entityId: string;
    }) {
      await requireEntityAccess(deleteInput.actorUserId, deleteInput.entityId);
      const files = await db
        .select()
        .from(fileObjects)
        .where(eq(fileObjects.entityId, deleteInput.entityId));

      if (files.length === 0) return;

      await db.transaction(async (tx) => {
        await tx
          .update(fileObjects)
          .set({ status: "deleting", updatedAt: new Date() })
          .where(eq(fileObjects.entityId, deleteInput.entityId));
        await tx.insert(fileAccessEvents).values(
          files.map((file) => ({
            fileObjectId: file.id,
            entityId: file.entityId,
            actorUserId: deleteInput.actorUserId,
            action: "delete_requested" as const,
          })),
        );
      });

      try {
        await Promise.all(
          files.map((file) => input.storage.deleteObject(file.objectKey)),
        );
      } catch (error) {
        await db
          .update(fileObjects)
          .set({ status: "ready", updatedAt: new Date() })
          .where(eq(fileObjects.entityId, deleteInput.entityId));
        throw error;
      }

      await db.transaction(async (tx) => {
        await tx.insert(fileAccessEvents).values(
          files.map((file) => ({
            fileObjectId: file.id,
            entityId: file.entityId,
            actorUserId: deleteInput.actorUserId,
            action: "deleted" as const,
          })),
        );
        await tx
          .delete(fileObjects)
          .where(eq(fileObjects.entityId, deleteInput.entityId));
      });
    },
  };
}
