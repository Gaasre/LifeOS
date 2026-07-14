import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { DocumentRecord } from "@lifeos/rpc";

import {
  DOCUMENT_AREAS,
  type DocumentArea,
  type LifeDocument,
} from "@/features/documents/types";
import { rpcClient } from "@/lib/rpc-client";

export const documentsQueryKey = ["documents"] as const;
export const documentPreviewQueryKey = (documentId: string) =>
  ["documents", documentId, "preview"] as const;

function isDocumentArea(value: string): value is DocumentArea {
  return (DOCUMENT_AREAS as readonly string[]).includes(value);
}

export function mapDocumentRecord(record: DocumentRecord): LifeDocument {
  const attention = record.attention ?? undefined;

  return {
    id: record.id,
    title: record.title,
    filename: record.filename,
    mediaType: record.mediaType,
    mimeType: record.mimeType,
    ...(record.pageCount ? { pageCount: record.pageCount } : {}),
    sizeMb: record.sizeBytes / (1024 * 1024),
    kind: record.kind,
    issuer: record.issuer,
    areas: record.modules
      .map((module) =>
        module.length > 0
          ? `${module[0]?.toUpperCase()}${module.slice(1)}`
          : module,
      )
      .filter(isDocumentArea),
    people: record.people,
    personIds: record.personIds,
    status: record.status,
    ...(attention ? { attention } : {}),
    addedAt: record.addedAt,
    ...(record.issuedAt ? { issuedAt: record.issuedAt } : {}),
    ...(record.expiresAt ? { expiresAt: record.expiresAt } : {}),
    source: record.source,
    tags: record.tags,
    fileStatus: record.fileStatus,
    previewStatus: record.previewStatus,
    organizationId: record.organizationId,
    addedBy: record.addedBy,
  };
}

export function useDocuments(personId?: string, enabled = true) {
  return useQuery({
    queryKey: [...documentsQueryKey, "list", personId ?? "family"],
    queryFn: () =>
      rpcClient.documents.list({ ...(personId ? { personId } : {}) }),
    select: (records) => records.map(mapDocumentRecord),
    enabled,
  });
}

export function useSetDocumentArchived() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      documentId,
      archived,
    }: {
      documentId: string;
      archived: boolean;
    }) => rpcClient.documents.setArchived({ documentId, archived }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: documentsQueryKey });
    },
  });
}

export function useDocumentPreviewUrl(documentId: string, enabled: boolean) {
  return useQuery({
    queryKey: documentPreviewQueryKey(documentId),
    queryFn: () => rpcClient.documents.getPreviewUrl({ documentId }),
    enabled,
    staleTime: 45_000,
    refetchInterval: (query) =>
      query.state.data?.status === "pending" ? 1_500 : false,
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ documentId }: { documentId: string }) =>
      rpcClient.documents.delete({ documentId }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: documentsQueryKey });
    },
  });
}
