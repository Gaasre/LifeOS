import { useState } from "react";

import type { Filter } from "@lifeos/ui/components/reui/filters";

import { AppHeader } from "@/components/app-header";
import { AddDocumentDialog } from "@/features/documents/components/add-document-dialog";
import { AttentionPanel } from "@/features/documents/components/attention-panel";
import { DocumentDetailSheet } from "@/features/documents/components/document-detail-sheet";
import { DocumentLibrary } from "@/features/documents/components/document-library";
import { DocumentLibraryToolbar } from "@/features/documents/components/document-library-toolbar";
import { DOCUMENTS } from "@/features/documents/data/documents";
import { useDocumentLibrary } from "@/features/documents/hooks/use-document-library";
import type {
  DocumentSort,
  FilterValue,
  LifeDocument,
} from "@/features/documents/types";

import "@/features/documents/documents-motion.css";

export function DocumentsPage() {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Filter<FilterValue>[]>([]);
  const [sort, setSort] = useState<DocumentSort>("recently-added");
  const [selectedDocument, setSelectedDocument] = useState<LifeDocument | null>(
    null,
  );
  const [detailOpen, setDetailOpen] = useState(false);

  const library = useDocumentLibrary({
    documents: DOCUMENTS,
    query,
    filters,
    sort,
  });

  const attentionDocuments = DOCUMENTS.filter((document) => document.attention);
  const showAttentionPanel = query.trim() === "" && filters.length === 0;

  function openDocument(document: LifeDocument) {
    setSelectedDocument(document);
    setDetailOpen(true);
  }

  function resetLibrary() {
    setQuery("");
    setFilters([]);
    setSort("recently-added");
  }

  return (
    <main className="dark min-h-screen overflow-x-hidden bg-background text-foreground">
      <div className="mx-auto w-full max-w-[92rem] px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
        <AppHeader section="Documents" />

        <div className="mt-12 flex min-w-0 flex-col gap-9 lg:mt-18 lg:pl-32">
          <section
            className="documents-section-enter flex min-w-0 flex-col gap-6 md:flex-row md:items-end md:justify-between"
            style={{ animationDelay: "20ms" }}
            aria-labelledby="documents-title"
          >
            <div className="flex min-w-0 max-w-2xl flex-col gap-2">
              <p className="m-0 text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
                Your connected record
              </p>
              <h1
                id="documents-title"
                className="m-0 text-[clamp(2.25rem,8vw,3.35rem)] leading-[1.02] font-normal tracking-[-0.025em] sm:text-[clamp(2.6rem,4.4vw,3.35rem)]"
              >
                Documents
              </h1>
              <p className="m-0 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                Files that know where they belong.
              </p>
            </div>
            <AddDocumentDialog />
          </section>

          {showAttentionPanel ? (
            <AttentionPanel
              documents={attentionDocuments}
              onOpen={openDocument}
            />
          ) : null}

          <section
            className="flex min-w-0 flex-col gap-5"
            aria-labelledby="library-title"
          >
            <h2 id="library-title" className="sr-only">
              Document library
            </h2>

            <DocumentLibraryToolbar
              query={query}
              onQueryChange={setQuery}
              filters={filters}
              onFiltersChange={setFilters}
              sort={sort}
              onSortChange={setSort}
            />

            <DocumentLibrary
              documents={library.results}
              onOpen={openDocument}
              onReset={resetLibrary}
            />
          </section>
        </div>
      </div>

      <DocumentDetailSheet
        document={selectedDocument}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </main>
  );
}
