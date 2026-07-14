import "dotenv/config";

import { db, documents, entities, fileObjects, pool } from "@lifeos/db";
import { renderPdfFirstPagePreview } from "@lifeos/document-previews";
import { createFileProcessingService, FileServiceError } from "@lifeos/files";
import { createDocumentJobQueue, type PdfPreviewJobData } from "@lifeos/jobs";
import { createR2Storage } from "@lifeos/storage";
import { and, eq, sql } from "drizzle-orm";

const RECONCILIATION_INTERVAL_MS = 5 * 60 * 1_000;
const FAILURE_REASON_MAX_LENGTH = 500;

function requiredEnvironment(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required by the LifeOS worker.`);
  return value;
}

function failureReason(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message.slice(0, FAILURE_REASON_MAX_LENGTH);
}

const storage = createR2Storage({
  endpoint: requiredEnvironment("R2_ENDPOINT"),
  bucket: requiredEnvironment("R2_BUCKET_NAME"),
  accessKeyId: requiredEnvironment("R2_ACCESS_KEY_ID"),
  secretAccessKey: requiredEnvironment("R2_SECRET_ACCESS_KEY"),
});
const files = createFileProcessingService({ storage });
const previewQueue = createDocumentJobQueue({
  connectionString: requiredEnvironment("DATABASE_URL"),
  role: "worker",
});

async function findDocument(documentId: string) {
  const [document] = await db
    .select({ id: documents.entityId })
    .from(documents)
    .where(eq(documents.entityId, documentId))
    .limit(1);
  return document;
}

async function findReadyPreview(documentId: string) {
  const [preview] = await db
    .select({ id: fileObjects.id })
    .from(fileObjects)
    .where(
      and(
        eq(fileObjects.entityId, documentId),
        eq(fileObjects.role, "preview"),
        eq(fileObjects.status, "ready"),
      ),
    )
    .limit(1);
  return preview;
}

async function markPreviewReady(documentId: string) {
  const now = new Date();
  await db.transaction(async (transaction) => {
    await transaction
      .update(documents)
      .set({
        previewStatus: "ready",
        previewFailureReason: null,
        updatedAt: now,
      })
      .where(eq(documents.entityId, documentId));
    await transaction
      .update(entities)
      .set({ updatedAt: now })
      .where(eq(entities.id, documentId));
  });
}

async function processPdfPreview(job: PdfPreviewJobData) {
  if (!(await findDocument(job.documentId))) return;

  // A worker can die after recording the derived file but before updating the
  // document status. Treat that state as completed instead of rendering again.
  if (await findReadyPreview(job.documentId)) {
    await markPreviewReady(job.documentId);
    return;
  }

  try {
    const original = await files.readReadyFile({
      entityId: job.documentId,
      fileId: job.sourceFileId,
      role: "original",
    });
    if (original.file.contentType !== "application/pdf") {
      await markPreviewReady(job.documentId);
      return;
    }

    const preview = await renderPdfFirstPagePreview(original.bytes);
    await files.storeDerivedFile({
      entityId: job.documentId,
      role: "preview",
      filename: `${original.file.id}-first-page.png`,
      contentType: preview.contentType,
      bytes: preview.bytes,
      createdByUserId: original.file.createdByUserId,
      sourceFileId: original.file.id,
      onStored: async ({ transaction }) => {
        const now = new Date();
        await transaction
          .update(documents)
          .set({
            previewStatus: "ready",
            previewFailureReason: null,
            pageCount: preview.pageCount,
            updatedAt: now,
          })
          .where(eq(documents.entityId, job.documentId));
        await transaction
          .update(entities)
          .set({ updatedAt: now })
          .where(eq(entities.id, job.documentId));
      },
    });
  } catch (error) {
    // Deleting a document while its preview is running is a successful no-op.
    if (
      error instanceof FileServiceError &&
      error.code === "NOT_FOUND" &&
      !(await findDocument(job.documentId))
    ) {
      return;
    }

    await db
      .update(documents)
      .set({
        previewStatus: "pending",
        previewFailureReason: failureReason(error),
        updatedAt: new Date(),
      })
      .where(eq(documents.entityId, job.documentId));
    throw error;
  }
}

async function markPdfPreviewFailed(job: PdfPreviewJobData) {
  if (!(await findDocument(job.documentId))) return;
  if (await findReadyPreview(job.documentId)) {
    await markPreviewReady(job.documentId);
    return;
  }

  await db
    .update(documents)
    .set({
      previewStatus: "failed",
      previewFailureReason: sql`coalesce(
        ${documents.previewFailureReason},
        'Preview generation failed after all retries.'
      )`,
      updatedAt: new Date(),
    })
    .where(eq(documents.entityId, job.documentId));
}

/**
 * Repairs uploads that predate the queue, or whose transaction committed while
 * no worker was available. Failed previews are deliberately left failed until
 * the user completes the upload again or a future explicit retry action exists.
 */
async function reconcilePdfPreviews() {
  const originals = await db
    .select({
      documentId: documents.entityId,
      previewStatus: documents.previewStatus,
      sourceFileId: fileObjects.id,
      contentType: fileObjects.contentType,
    })
    .from(documents)
    .innerJoin(
      fileObjects,
      and(
        eq(fileObjects.entityId, documents.entityId),
        eq(fileObjects.role, "original"),
        eq(fileObjects.status, "ready"),
      ),
    )
    .where(eq(documents.previewStatus, "pending"));
  const readyPreviews = new Set(
    (
      await db
        .select({ documentId: fileObjects.entityId })
        .from(fileObjects)
        .where(
          and(eq(fileObjects.role, "preview"), eq(fileObjects.status, "ready")),
        )
    ).map((preview) => preview.documentId),
  );

  for (const original of originals) {
    if (original.contentType !== "application/pdf") {
      if (original.previewStatus !== "ready") {
        await markPreviewReady(original.documentId);
      }
      continue;
    }
    if (readyPreviews.has(original.documentId)) {
      if (original.previewStatus !== "ready") {
        await markPreviewReady(original.documentId);
      }
      continue;
    }
    if (original.previewStatus === "failed") continue;
    if (await previewQueue.hasOutstandingPdfPreview(original.documentId)) {
      continue;
    }

    await db.transaction(async (transaction) => {
      const [current] = await transaction
        .select({ previewStatus: documents.previewStatus })
        .from(documents)
        .where(eq(documents.entityId, original.documentId))
        .limit(1);
      if (!current || current.previewStatus === "failed") return;

      await transaction
        .update(documents)
        .set({ previewStatus: "pending", updatedAt: new Date() })
        .where(eq(documents.entityId, original.documentId));
      await previewQueue.enqueuePdfPreview({
        documentId: original.documentId,
        sourceFileId: original.sourceFileId,
        transaction,
      });
    });
  }
}

async function main() {
  await previewQueue.start();
  await previewQueue.workPdfPreviews(processPdfPreview);
  await previewQueue.workFailedPdfPreviews(markPdfPreviewFailed);
  await reconcilePdfPreviews();

  const interval = setInterval(() => {
    void reconcilePdfPreviews().catch((error) => {
      console.error("[LifeOS worker reconciliation]", error);
    });
  }, RECONCILIATION_INTERVAL_MS);
  interval.unref();

  console.log("LifeOS document preview worker started.");
  await new Promise<void>((resolve) => {
    const shutdown = () => resolve();
    process.once("SIGINT", shutdown);
    process.once("SIGTERM", shutdown);
  });
  clearInterval(interval);
}

main()
  .catch((error) => {
    console.error("[LifeOS worker]", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await previewQueue.stop().catch((error) => {
      console.error("[LifeOS worker shutdown]", error);
    });
    await pool.end();
  });
