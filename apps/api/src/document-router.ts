import { AccessError } from "@lifeos/access";
import { DocumentServiceError } from "@lifeos/documents";
import { FileServiceError } from "@lifeos/files";
import { ORPCError } from "@orpc/server";

import type { AuthorizedRouter } from "./family-router";
import {
  getDocumentService,
  StorageConfigurationError,
} from "./storage-services";

function throwMappedError(error: unknown): never {
  if (error instanceof AccessError) {
    throw new ORPCError(error.code, { message: error.message });
  }
  if (error instanceof DocumentServiceError) {
    throw new ORPCError(
      error.code === "NOT_FOUND" ? "NOT_FOUND" : "INTERNAL_SERVER_ERROR",
      { message: error.message },
    );
  }
  if (error instanceof FileServiceError) {
    const code =
      error.code === "NOT_FOUND"
        ? "NOT_FOUND"
        : error.code === "INVALID_FILE" || error.code === "NOT_READY"
          ? "BAD_REQUEST"
          : "INTERNAL_SERVER_ERROR";
    throw new ORPCError(code, { message: error.message });
  }
  if (error instanceof StorageConfigurationError) {
    throw new ORPCError("INTERNAL_SERVER_ERROR", {
      message: "Document storage has not been configured yet.",
    });
  }
  throw error;
}

export function createDocumentsRouter(authorized: AuthorizedRouter) {
  const list = authorized.documents.list.handler(async ({ input, context }) => {
    try {
      return await getDocumentService().list(context.auth.user.id, {
        ...(input.personId ? { personId: input.personId } : {}),
      });
    } catch (error) {
      return throwMappedError(error);
    }
  });

  const search = authorized.documents.search.handler(
    async ({ input, context }) => {
      try {
        return await getDocumentService().search(context.auth.user.id, input);
      } catch (error) {
        return throwMappedError(error);
      }
    },
  );

  const createUpload = authorized.documents.createUpload.handler(
    async ({ input, context }) => {
      try {
        return await getDocumentService().createUpload(context.auth.user.id, {
          ...(input.organizationId
            ? { organizationId: input.organizationId }
            : {}),
          title: input.title,
          kind: input.kind,
          issuer: input.issuer,
          filename: input.filename,
          contentType: input.contentType,
          sizeBytes: input.sizeBytes,
          personIds: input.personIds,
          modules: input.modules,
        });
      } catch (error) {
        return throwMappedError(error);
      }
    },
  );

  const completeUpload = authorized.documents.completeUpload.handler(
    async ({ input, context }) => {
      try {
        return await getDocumentService().completeUpload(context.auth.user.id, {
          documentId: input.documentId,
          fileId: input.fileId,
        });
      } catch (error) {
        return throwMappedError(error);
      }
    },
  );

  const setRelationships = authorized.documents.setRelationships.handler(
    async ({ input, context }) => {
      try {
        return await getDocumentService().setRelationships(
          context.auth.user.id,
          input.documentId,
          {
            personIds: input.personIds,
            modules: input.modules,
          },
        );
      } catch (error) {
        return throwMappedError(error);
      }
    },
  );

  const getDownloadUrl = authorized.documents.getDownloadUrl.handler(
    async ({ input, context }) => {
      try {
        return await getDocumentService().getDownloadUrl(
          context.auth.user.id,
          input.documentId,
          input.disposition,
        );
      } catch (error) {
        return throwMappedError(error);
      }
    },
  );

  const getPreviewUrl = authorized.documents.getPreviewUrl.handler(
    async ({ input, context }) => {
      try {
        return await getDocumentService().getPreviewUrl(
          context.auth.user.id,
          input.documentId,
        );
      } catch (error) {
        return throwMappedError(error);
      }
    },
  );

  const setArchived = authorized.documents.setArchived.handler(
    async ({ input, context }) => {
      try {
        return await getDocumentService().setArchived(
          context.auth.user.id,
          input.documentId,
          input.archived,
        );
      } catch (error) {
        return throwMappedError(error);
      }
    },
  );

  const remove = authorized.documents.delete.handler(
    async ({ input, context }) => {
      try {
        return await getDocumentService().delete(
          context.auth.user.id,
          input.documentId,
        );
      } catch (error) {
        return throwMappedError(error);
      }
    },
  );

  return {
    list,
    search,
    createUpload,
    completeUpload,
    setRelationships,
    getDownloadUrl,
    getPreviewUrl,
    setArchived,
    delete: remove,
  };
}
