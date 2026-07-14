import { createDocumentService } from "@lifeos/documents";
import { createFileService } from "@lifeos/files";
import { createDocumentJobQueue } from "@lifeos/jobs";
import { createR2Storage } from "@lifeos/storage";

export class StorageConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StorageConfigurationError";
  }
}

function requiredEnvironment(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new StorageConfigurationError(
      `${name} is required before document uploads can be used.`,
    );
  }
  return value;
}

function readDuration(name: string, fallback: number) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1 || value > 604_800) {
    throw new StorageConfigurationError(
      `${name} must be a whole number between 1 and 604800.`,
    );
  }
  return value;
}

let documentService: ReturnType<typeof createDocumentService> | null = null;

export function getDocumentService() {
  if (documentService) return documentService;

  const storage = createR2Storage({
    endpoint: requiredEnvironment("R2_ENDPOINT"),
    bucket: requiredEnvironment("R2_BUCKET_NAME"),
    accessKeyId: requiredEnvironment("R2_ACCESS_KEY_ID"),
    secretAccessKey: requiredEnvironment("R2_SECRET_ACCESS_KEY"),
  });
  const files = createFileService({
    storage,
    uploadUrlTtlSeconds: readDuration("FILE_UPLOAD_URL_TTL_SECONDS", 300),
    downloadUrlTtlSeconds: readDuration("FILE_DOWNLOAD_URL_TTL_SECONDS", 60),
  });
  const previewQueue = createDocumentJobQueue({
    connectionString: requiredEnvironment("DATABASE_URL"),
    role: "producer",
  });

  documentService = createDocumentService({ files, previewQueue });
  return documentService;
}
