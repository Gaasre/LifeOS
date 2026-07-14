import type { DatabaseTransaction } from "@lifeos/db";
import { sql } from "drizzle-orm";
import {
  fromDrizzle,
  PgBoss,
  type SendOptions,
  type UpdateQueueOptions,
} from "pg-boss";

export const PDF_PREVIEW_QUEUE = "document-pdf-preview";
export const PDF_PREVIEW_DEAD_LETTER_QUEUE = "document-pdf-preview-dead-letter";

export type PdfPreviewJobData = {
  documentId: string;
  sourceFileId: string;
};

export type DocumentJobQueue = ReturnType<typeof createDocumentJobQueue>;

const previewQueueOptions = {
  retryLimit: 4,
  retryDelay: 30,
  retryBackoff: true,
  retryDelayMax: 3_600,
  expireInSeconds: 1_800,
  retentionSeconds: 14 * 24 * 60 * 60,
  deleteAfterSeconds: 7 * 24 * 60 * 60,
  warningQueueSize: 1_000,
  deadLetter: PDF_PREVIEW_DEAD_LETTER_QUEUE,
  notify: true,
} satisfies UpdateQueueOptions;

const deadLetterQueueOptions = {
  retryLimit: 10,
  retryDelay: 30,
  retryBackoff: true,
  retryDelayMax: 600,
  expireInSeconds: 300,
  retentionSeconds: 30 * 24 * 60 * 60,
  deleteAfterSeconds: 30 * 24 * 60 * 60,
  warningQueueSize: 100,
  notify: true,
} satisfies UpdateQueueOptions;

export function createDocumentJobQueue(input: {
  connectionString: string;
  role: "producer" | "worker";
}) {
  const boss = new PgBoss({
    connectionString: input.connectionString,
    schema: "pgboss",
    application_name: `lifeos-${input.role}-jobs`,
    max: input.role === "worker" ? 5 : 2,
    createSchema: true,
    migrate: true,
    schedule: false,
    supervise: input.role === "worker",
    useListenNotify: input.role === "worker",
  });
  let startPromise: Promise<void> | null = null;

  boss.on("error", (error) => {
    console.error(`[LifeOS ${input.role} jobs]`, error);
  });
  boss.on("warning", (warning) => {
    console.warn(`[LifeOS ${input.role} jobs]`, warning.message, warning.data);
  });

  async function ensureQueues() {
    await boss.createQueue(PDF_PREVIEW_DEAD_LETTER_QUEUE, {
      policy: "standard",
      ...deadLetterQueueOptions,
    });
    await boss.updateQueue(
      PDF_PREVIEW_DEAD_LETTER_QUEUE,
      deadLetterQueueOptions,
    );
    await boss.createQueue(PDF_PREVIEW_QUEUE, {
      // `exclusive` is scoped by singletonKey, so one source file can have at
      // most one queued, retrying, or active job across all worker processes.
      // Terminal failed jobs do not block a later explicit retry.
      policy: "exclusive",
      ...previewQueueOptions,
    });
    await boss.updateQueue(PDF_PREVIEW_QUEUE, previewQueueOptions);

    const queue = await boss.getQueue(PDF_PREVIEW_QUEUE);
    if (queue?.policy !== "exclusive") {
      throw new Error(
        `${PDF_PREVIEW_QUEUE} already exists with policy ${queue?.policy ?? "unknown"}; recreate this pg-boss queue with the exclusive policy before starting LifeOS.`,
      );
    }
  }

  async function start() {
    startPromise ??= (async () => {
      await boss.start();
      await ensureQueues();
    })();
    await startPromise;
  }

  return {
    start,

    async enqueuePdfPreview(
      enqueue: PdfPreviewJobData & { transaction?: DatabaseTransaction },
    ) {
      await start();
      const { transaction, ...data } = enqueue;
      const options: SendOptions = {
        singletonKey: data.documentId,
      };
      if (transaction) {
        options.db = fromDrizzle(transaction, sql);
      }
      return boss.send(PDF_PREVIEW_QUEUE, data, options);
    },

    async hasOutstandingPdfPreview(documentId: string) {
      await start();
      const jobs = await boss.findJobs(PDF_PREVIEW_QUEUE, {
        key: documentId,
      });
      return jobs.some((job) =>
        ["created", "retry", "active", "failed"].includes(job.state),
      );
    },

    async workPdfPreviews(handler: (data: PdfPreviewJobData) => Promise<void>) {
      await start();
      return boss.work<PdfPreviewJobData>(
        PDF_PREVIEW_QUEUE,
        {
          batchSize: 1,
          localConcurrency: 1,
          pollingIntervalSeconds: 2,
          notifyPollingIntervalSeconds: 30,
        },
        async (jobs) => {
          const job = jobs[0];
          if (job) await handler(job.data);
        },
      );
    },

    async workFailedPdfPreviews(
      handler: (data: PdfPreviewJobData) => Promise<void>,
    ) {
      await start();
      return boss.work<PdfPreviewJobData>(
        PDF_PREVIEW_DEAD_LETTER_QUEUE,
        {
          batchSize: 1,
          localConcurrency: 1,
          pollingIntervalSeconds: 2,
          // Moving a job into the DLQ does not reliably emit a queue NOTIFY,
          // so keep the fallback poll short enough to publish `failed` soon.
          notifyPollingIntervalSeconds: 5,
        },
        async (jobs) => {
          const job = jobs[0];
          if (job) await handler(job.data);
        },
      );
    },

    async stop() {
      if (!startPromise) return;
      await startPromise.catch(() => undefined);
      await boss.stop({ close: true, graceful: true, timeout: 30_000 });
    },
  };
}
