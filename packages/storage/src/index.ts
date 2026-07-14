import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export type ObjectMetadata = {
  sizeBytes: number;
  contentType: string | null;
  etag: string | null;
};

export type StoredObject = {
  body: Uint8Array;
  metadata: ObjectMetadata;
};

export type PresignedObjectUrl = {
  url: string;
  expiresAt: Date;
};

export type ObjectStorage = {
  readonly provider: string;
  readonly bucket: string;
  createUploadUrl(input: {
    key: string;
    contentType: string;
    expiresInSeconds: number;
  }): Promise<PresignedObjectUrl>;
  createDownloadUrl(input: {
    key: string;
    filename: string;
    disposition: "inline" | "attachment";
    expiresInSeconds: number;
  }): Promise<PresignedObjectUrl>;
  getObject(key: string): Promise<StoredObject>;
  putObject(input: {
    key: string;
    body: Uint8Array;
    contentType: string;
  }): Promise<ObjectMetadata>;
  headObject(key: string): Promise<ObjectMetadata>;
  deleteObject(key: string): Promise<void>;
};

export type R2StorageConfig = {
  endpoint: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
};

function contentDisposition(
  disposition: "inline" | "attachment",
  filename: string,
) {
  const asciiFallback = filename
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/["\\]/g, "_")
    .trim()
    .slice(0, 180);
  const encoded = encodeURIComponent(filename).replace(/[!'()*]/g, (value) =>
    `%${value.charCodeAt(0).toString(16).toUpperCase()}`,
  );

  return `${disposition}; filename="${asciiFallback || "download"}"; filename*=UTF-8''${encoded}`;
}

function normalizedEtag(etag: string | undefined) {
  return etag?.replace(/^"|"$/g, "") ?? null;
}

export function createR2Storage(config: R2StorageConfig): ObjectStorage {
  const endpoint = config.endpoint.replace(/\/$/, "");
  const client = new S3Client({
    endpoint,
    region: "auto",
    // R2 does not require S3's optional flexible checksums. Leaving the AWS
    // SDK default enabled puts checksum parameters in browser presigned URLs,
    // which can prevent R2 from completing a CORS preflight.
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  return {
    provider: "r2",
    bucket: config.bucket,

    async createUploadUrl({ key, contentType, expiresInSeconds }) {
      const url = await getSignedUrl(
        client,
        new PutObjectCommand({
          Bucket: config.bucket,
          Key: key,
          ContentType: contentType,
        }),
        { expiresIn: expiresInSeconds },
      );

      return {
        url,
        expiresAt: new Date(Date.now() + expiresInSeconds * 1_000),
      };
    },

    async createDownloadUrl({
      key,
      filename,
      disposition,
      expiresInSeconds,
    }) {
      const url = await getSignedUrl(
        client,
        new GetObjectCommand({
          Bucket: config.bucket,
          Key: key,
          ResponseContentDisposition: contentDisposition(
            disposition,
            filename,
          ),
        }),
        { expiresIn: expiresInSeconds },
      );

      return {
        url,
        expiresAt: new Date(Date.now() + expiresInSeconds * 1_000),
      };
    },

    async getObject(key) {
      const response = await client.send(
        new GetObjectCommand({ Bucket: config.bucket, Key: key }),
      );
      if (!response.Body) {
        throw new Error("The object did not include a response body.");
      }

      return {
        body: await response.Body.transformToByteArray(),
        metadata: {
          sizeBytes: response.ContentLength ?? 0,
          contentType: response.ContentType ?? null,
          etag: normalizedEtag(response.ETag),
        },
      };
    },

    async putObject({ key, body, contentType }) {
      const response = await client.send(
        new PutObjectCommand({
          Bucket: config.bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
        }),
      );

      return {
        sizeBytes: body.byteLength,
        contentType,
        etag: normalizedEtag(response.ETag),
      };
    },

    async headObject(key) {
      const response = await client.send(
        new HeadObjectCommand({ Bucket: config.bucket, Key: key }),
      );

      return {
        sizeBytes: response.ContentLength ?? 0,
        contentType: response.ContentType ?? null,
        etag: normalizedEtag(response.ETag),
      };
    },

    async deleteObject(key) {
      await client.send(
        new DeleteObjectCommand({ Bucket: config.bucket, Key: key }),
      );
    },
  };
}
