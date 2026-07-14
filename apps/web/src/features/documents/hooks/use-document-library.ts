import { useMemo } from "react";

import type { Filter } from "@lifeos/ui/components/reui/filters";

import { matchesDocumentFilters } from "@/features/documents/filters/match-document-filters";
import type {
  DocumentSort,
  FilterValue,
  LifeDocument,
} from "@/features/documents/types";

type UseDocumentLibraryOptions = {
  documents: LifeDocument[];
  query: string;
  filters: Filter<FilterValue>[];
  sort: DocumentSort;
};

function matchesQuery(document: LifeDocument, query: string) {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  if (!normalizedQuery) return true;

  return [
    document.title,
    document.filename,
    document.kind,
    document.issuer,
    document.mediaType,
    document.addedBy?.name ?? "",
    ...document.areas,
    ...document.people,
    ...document.tags,
  ]
    .join(" ")
    .toLocaleLowerCase()
    .includes(normalizedQuery);
}

function sortDocuments(documents: LifeDocument[], sort: DocumentSort) {
  return documents.toSorted((left, right) => {
    if (sort === "title") return left.title.localeCompare(right.title);
    if (sort === "oldest") return left.addedAt.localeCompare(right.addedAt);
    if (sort === "expiring-soon") {
      return (left.expiresAt ?? "9999").localeCompare(
        right.expiresAt ?? "9999",
      );
    }
    return right.addedAt.localeCompare(left.addedAt);
  });
}

export function useDocumentLibrary({
  documents,
  query,
  filters,
  sort,
}: UseDocumentLibraryOptions) {
  return useMemo(() => {
    const filtered = documents.filter(
      (document) =>
        matchesQuery(document, query) &&
        matchesDocumentFilters(document, filters),
    );

    return {
      results: sortDocuments(filtered, sort),
    };
  }, [documents, filters, query, sort]);
}
