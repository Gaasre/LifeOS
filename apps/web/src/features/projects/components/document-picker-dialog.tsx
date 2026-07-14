import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import {
  CheckIcon,
  FileSearchIcon,
  FileTextIcon,
  SearchIcon,
  XIcon,
} from "lucide-react";

import type { DocumentPickerItem } from "@lifeos/rpc";
import { Alert, AlertDescription } from "@lifeos/ui/components/alert";
import { Badge } from "@lifeos/ui/components/badge";
import { Button } from "@lifeos/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@lifeos/ui/components/dialog";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@lifeos/ui/components/empty";
import { Field, FieldLabel } from "@lifeos/ui/components/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@lifeos/ui/components/input-group";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@lifeos/ui/components/item";
import { Skeleton } from "@lifeos/ui/components/skeleton";
import { Spinner } from "@lifeos/ui/components/spinner";

import { rpcClient } from "@/lib/rpc-client";

const pickerPageSize = 20;

export type DocumentPickerChoice = Pick<
  DocumentPickerItem,
  "id" | "title" | "filename" | "kind"
>;

function documentMeta(document: DocumentPickerItem) {
  return [
    document.filename,
    document.kind,
    document.issuer === "Unknown" ? null : document.issuer,
  ]
    .filter(Boolean)
    .join(" · ");
}

export function DocumentPickerDialog({
  open,
  onOpenChange,
  title,
  description,
  selectedDocuments,
  maxSelection = 20,
  confirmLabel = "Save documents",
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  selectedDocuments: DocumentPickerChoice[];
  maxSelection?: number;
  confirmLabel?: string;
  onSave: (documents: DocumentPickerChoice[]) => Promise<void>;
}) {
  const wasOpen = useRef(false);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim());
  const [selectedById, setSelectedById] = useState(
    () => new Map<string, DocumentPickerChoice>(),
  );
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open && !wasOpen.current) {
      setQuery("");
      setSelectedById(
        new Map(selectedDocuments.map((document) => [document.id, document])),
      );
      setError(null);
    }
    wasOpen.current = open;
  }, [open, selectedDocuments]);

  const documentsQuery = useInfiniteQuery({
    queryKey: ["documents", "picker", deferredQuery],
    queryFn: ({ pageParam }) =>
      rpcClient.documents.search({
        query: deferredQuery,
        offset: pageParam,
        limit: pickerPageSize,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextOffset ?? undefined,
    enabled: open,
    staleTime: 30_000,
  });

  const results = useMemo(() => {
    const byId = new Map<string, DocumentPickerItem>();
    for (const page of documentsQuery.data?.pages ?? []) {
      for (const document of page.items) {
        byId.set(document.id, document);
      }
    }
    return [...byId.values()];
  }, [documentsQuery.data]);
  const selected = useMemo(() => [...selectedById.values()], [selectedById]);
  const total = documentsQuery.data?.pages[0]?.total ?? 0;
  const searchIsSettling = query.trim() !== deferredQuery;

  function toggle(document: DocumentPickerItem) {
    setSelectedById((current) => {
      const next = new Map(current);
      if (next.has(document.id)) {
        next.delete(document.id);
      } else if (next.size < maxSelection) {
        next.set(document.id, document);
      }
      return next;
    });
  }

  function remove(documentId: string) {
    setSelectedById((current) => {
      const next = new Map(current);
      next.delete(documentId);
      return next;
    });
  }

  async function save() {
    setIsSaving(true);
    setError(null);
    try {
      await onSave(selected);
      onOpenChange(false);
    } catch (caught) {
      setError(
        caught instanceof Error && caught.message
          ? caught.message
          : "These documents could not be linked.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(86dvh,42rem)] grid-rows-[auto_auto_minmax(0,1fr)_auto] overflow-hidden sm:max-w-xl">
        <DialogHeader className="pr-8">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="flex min-w-0 flex-col gap-3">
          <Field>
            <FieldLabel htmlFor="document-picker-search" className="sr-only">
              Search documents
            </FieldLabel>
            <InputGroup>
              <InputGroupInput
                id="document-picker-search"
                value={query}
                autoFocus
                placeholder="Search title, filename, kind, or issuer…"
                onChange={(event) => setQuery(event.target.value)}
              />
              <InputGroupAddon align="inline-start">
                <SearchIcon />
              </InputGroupAddon>
              <InputGroupAddon align="inline-end">
                {searchIsSettling ||
                (documentsQuery.isFetching &&
                  !documentsQuery.isFetchingNextPage) ? (
                  <Spinner />
                ) : (
                  <span>{total.toLocaleString()}</span>
                )}
              </InputGroupAddon>
            </InputGroup>
          </Field>

          {selected.length > 0 ? (
            <div className="flex min-w-0 items-center gap-2">
              <span className="shrink-0 text-xs text-muted-foreground">
                Selected
              </span>
              <div className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto pb-1">
                {selected.map((document) => (
                  <Badge key={document.id} asChild variant="secondary">
                    <button
                      type="button"
                      onClick={() => remove(document.id)}
                      aria-label={`Remove ${document.title}`}
                    >
                      <span className="max-w-36 truncate">
                        {document.title}
                      </span>
                      <XIcon data-icon="inline-end" />
                    </button>
                  </Badge>
                ))}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={() => setSelectedById(new Map())}
              >
                Clear
              </Button>
            </div>
          ) : null}
        </div>

        <div className="-mx-4 min-h-0 overflow-y-auto overscroll-contain px-4">
          <div className="flex min-h-0 flex-col gap-3 pb-1">
            <div className="flex items-center justify-between gap-3">
              <p className="m-0 text-xs font-medium text-muted-foreground">
                {deferredQuery ? "Search results" : "Recent documents"}
              </p>
              {selected.length >= maxSelection ? (
                <p className="m-0 text-xs text-muted-foreground">
                  Selection limit reached
                </p>
              ) : null}
            </div>

            {documentsQuery.isPending ? (
              <div className="flex flex-col gap-2">
                {Array.from({ length: 4 }, (_, index) => (
                  <Skeleton key={index} className="h-14 w-full" />
                ))}
              </div>
            ) : documentsQuery.isError ? (
              <Alert>
                <AlertDescription className="flex items-center justify-between gap-3">
                  <span>Documents could not be loaded.</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void documentsQuery.refetch()}
                  >
                    Try again
                  </Button>
                </AlertDescription>
              </Alert>
            ) : results.length > 0 ? (
              <ItemGroup className="gap-2">
                {results.map((document) => {
                  const isSelected = selectedById.has(document.id);
                  const selectionFull =
                    selected.length >= maxSelection && !isSelected;
                  return (
                    <Item
                      key={document.id}
                      asChild
                      variant={isSelected ? "muted" : "outline"}
                    >
                      <button
                        type="button"
                        disabled={selectionFull}
                        className="cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                        aria-pressed={isSelected}
                        onClick={() => toggle(document)}
                      >
                        <ItemMedia variant="icon">
                          <FileTextIcon />
                        </ItemMedia>
                        <ItemContent>
                          <ItemTitle>{document.title}</ItemTitle>
                          <ItemDescription>
                            {documentMeta(document)}
                          </ItemDescription>
                        </ItemContent>
                        <ItemActions>
                          {isSelected ? (
                            <CheckIcon
                              className="text-project-accent"
                              aria-label="Selected"
                            />
                          ) : null}
                        </ItemActions>
                      </button>
                    </Item>
                  );
                })}
                {documentsQuery.hasNextPage ? (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={documentsQuery.isFetchingNextPage}
                    onClick={() => void documentsQuery.fetchNextPage()}
                  >
                    {documentsQuery.isFetchingNextPage ? (
                      <Spinner data-icon="inline-start" />
                    ) : null}
                    {documentsQuery.isFetchingNextPage
                      ? "Loading…"
                      : `Load more · ${results.length.toLocaleString()} of ${total.toLocaleString()}`}
                  </Button>
                ) : null}
              </ItemGroup>
            ) : (
              <Empty className="min-h-48 border">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <FileSearchIcon />
                  </EmptyMedia>
                  <EmptyTitle>
                    {deferredQuery
                      ? "No matching documents"
                      : "No documents yet"}
                  </EmptyTitle>
                  <EmptyDescription>
                    {deferredQuery
                      ? "Try a title, filename, kind, or issuer."
                      : "Add a file in Documents first, then return here to link it."}
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}

            {error ? (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
          </div>
        </div>

        <DialogFooter showCloseButton>
          <Button type="button" onClick={() => void save()} disabled={isSaving}>
            {isSaving ? <Spinner data-icon="inline-start" /> : null}
            {isSaving
              ? "Saving…"
              : selected.length > 0
                ? `${confirmLabel} · ${selected.length}`
                : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
