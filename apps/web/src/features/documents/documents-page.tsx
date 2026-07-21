import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, MotionConfig } from "motion/react";
import { useSearchParams } from "react-router-dom";

import type { Filter } from "@lifeos/ui/components/reui/filters";

import { AppHeader } from "@/components/app-header";
import {
  ModulePageContainer,
  ModulePageContent,
} from "@/components/module-page-layout";
import { AddDocumentDialog } from "@/features/documents/components/add-document-dialog";
import { AttentionPanel } from "@/features/documents/components/attention-panel";
import { DocumentDetailSheet } from "@/features/documents/components/document-detail-sheet";
import { DocumentLibrary } from "@/features/documents/components/document-library";
import { DocumentLibraryToolbar } from "@/features/documents/components/document-library-toolbar";
import {
  documentEase,
  documentSpring,
} from "@/features/documents/document-motion";
import { useDocuments } from "@/features/documents/hooks/use-documents";
import { useDocumentLibrary } from "@/features/documents/hooks/use-document-library";
import type {
  DocumentSort,
  FilterValue,
  LifeDocument,
} from "@/features/documents/types";
import { usePerspective } from "@/features/perspectives/perspective-context";

import "@/features/documents/documents-motion.css";

export function DocumentsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Filter<FilterValue>[]>([]);
  const [sort, setSort] = useState<DocumentSort>("recently-added");
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(
    null,
  );
  const [detailOpen, setDetailOpen] = useState(false);
  const {
    people,
    perspective,
    selectedPerson,
    viewerPersonId,
    isPending: isPerspectivePending,
  } = usePerspective();
  const perspectivePersonId =
    perspective.kind === "person" ? perspective.personId : undefined;
  const documentsQuery = useDocuments(
    perspectivePersonId,
    !isPerspectivePending,
  );

  const requestedDocumentId = searchParams.get("document");
  const documents = documentsQuery.data ?? [];
  const perspectiveLabel =
    perspective.kind === "family"
      ? "Family"
      : (selectedPerson?.preferredName ?? "Personal");
  const uploadPersonId = perspectivePersonId ?? viewerPersonId;
  const uploadPerson = people.find((person) => person.id === uploadPersonId);
  const defaultPersonIds = uploadPersonId ? [uploadPersonId] : [];
  const personFilterOptions = useMemo(
    () =>
      people.map((person) => ({
        value: person.id,
        label: person.preferredName,
      })),
    [people],
  );
  const creatorFilterOptions = useMemo(() => {
    const creators = new Map<string, string>();
    for (const document of documentsQuery.data ?? []) {
      if (document.addedBy) {
        creators.set(document.addedBy.id, document.addedBy.name);
      }
    }
    return [...creators].map(([value, label]) => ({ value, label }));
  }, [documentsQuery.data]);

  const selectedDocument =
    documents.find((document) => document.id === selectedDocumentId) ?? null;

  const library = useDocumentLibrary({
    documents,
    query,
    filters,
    sort,
  });

  const attentionDocuments = documents.filter((document) => document.attention);
  const showAttentionPanel = query.trim() === "" && filters.length === 0;
  const hasAttentionPanel = showAttentionPanel && attentionDocuments.length > 0;

  useEffect(() => {
    if (!requestedDocumentId) {
      setSelectedDocumentId(null);
      setDetailOpen(false);
      return;
    }

    const requestedDocument = documents.find(
      (document) => document.id === requestedDocumentId,
    );
    if (!requestedDocument) return;

    setSelectedDocumentId(requestedDocument.id);
    setDetailOpen(true);
  }, [documents, requestedDocumentId]);

  function openDocument(document: LifeDocument) {
    setSelectedDocumentId(document.id);
    setDetailOpen(true);

    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.set("document", document.id);
    setSearchParams(nextSearchParams);
  }

  function changeDetailOpen(open: boolean) {
    setDetailOpen(open);
    if (open) return;

    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.delete("document");
    setSearchParams(nextSearchParams, { replace: true });
  }

  function resetLibrary() {
    setQuery("");
    setFilters([]);
    setSort("recently-added");
  }

  return (
    <MotionConfig reducedMotion="user">
      <main className="dark min-h-screen overflow-x-hidden bg-background text-foreground">
        <ModulePageContainer>
          <AppHeader section="Documents" />

          <ModulePageContent className="flex flex-col gap-9">
            <section
              className="documents-section-enter flex min-w-0 flex-col gap-6 md:flex-row md:items-end md:justify-between"
              style={{ animationDelay: "20ms" }}
              aria-labelledby="documents-title"
            >
              <div className="flex min-w-0 max-w-2xl flex-col gap-2">
                <p className="m-0 text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
                  {perspectiveLabel} perspective
                </p>
                <h1
                  id="documents-title"
                  className="m-0 text-[clamp(2.25rem,8vw,3.35rem)] leading-[1.02] font-normal tracking-[-0.025em] sm:text-[clamp(2.6rem,4.4vw,3.35rem)]"
                >
                  Documents
                </h1>
                <p className="m-0 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                  {perspective.kind === "family"
                    ? "Every household document, together in one calm view."
                    : `Documents connected to ${perspectiveLabel}.`}
                </p>
              </div>
              <AddDocumentDialog
                people={people}
                defaultPersonIds={defaultPersonIds}
                defaultPersonLabel={uploadPerson?.preferredName ?? "Your space"}
              />
            </section>

            <AnimatePresence initial={false}>
              {hasAttentionPanel ? (
                <motion.div
                  key="documents-attention"
                  className="overflow-hidden"
                  initial={{ height: 0, opacity: 0, y: -4 }}
                  animate={{ height: "auto", opacity: 1, y: 0 }}
                  exit={{ height: 0, opacity: 0, y: -4 }}
                  transition={{ duration: 0.26, ease: documentEase }}
                >
                  <AttentionPanel
                    documents={attentionDocuments}
                    onOpen={openDocument}
                  />
                </motion.div>
              ) : null}
            </AnimatePresence>

            <motion.section
              layout
              className="flex min-w-0 flex-col gap-5"
              aria-labelledby="library-title"
              transition={{ layout: documentSpring }}
            >
              <h2 id="library-title" className="sr-only">
                Document library
              </h2>

              <DocumentLibraryToolbar
                query={query}
                onQueryChange={setQuery}
                filters={filters}
                onFiltersChange={setFilters}
                people={personFilterOptions}
                creators={creatorFilterOptions}
                sort={sort}
                onSortChange={setSort}
              />

              <DocumentLibrary
                documents={library.results}
                onOpen={openDocument}
                onReset={resetLibrary}
                isFiltered={query.trim() !== "" || filters.length > 0}
                perspectiveLabel={perspectiveLabel}
                state={
                  documentsQuery.isPending
                    ? "loading"
                    : documentsQuery.isError
                      ? "error"
                      : "ready"
                }
                onRetry={() => void documentsQuery.refetch()}
              />
            </motion.section>
          </ModulePageContent>
        </ModulePageContainer>

        <DocumentDetailSheet
          document={selectedDocument}
          open={detailOpen}
          onOpenChange={changeDetailOpen}
        />
      </main>
    </MotionConfig>
  );
}
