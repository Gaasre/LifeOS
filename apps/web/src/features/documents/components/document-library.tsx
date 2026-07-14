import {
  CircleAlertIcon,
  FileSearchIcon,
  FolderOpenIcon,
  RefreshCwIcon,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { Button } from "@lifeos/ui/components/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@lifeos/ui/components/empty";
import { Skeleton } from "@lifeos/ui/components/skeleton";

import { DocumentCard } from "@/features/documents/components/document-card";
import {
  documentEase,
  documentSpring,
} from "@/features/documents/document-motion";
import type { LifeDocument } from "@/features/documents/types";

type DocumentLibraryProps = {
  documents: LifeDocument[];
  onOpen: (document: LifeDocument) => void;
  onReset: () => void;
  onRetry?: () => void;
  state?: "ready" | "loading" | "error";
  isFiltered?: boolean;
  perspectiveLabel?: string;
};

function DocumentGridSkeleton() {
  return (
    <div
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      role="status"
      aria-label="Loading documents"
    >
      {Array.from({ length: 8 }, (_, index) => (
        <div
          key={index}
          className="flex flex-col gap-3 rounded-lg ring-1 ring-foreground/10"
        >
          <Skeleton className="h-[28rem] rounded-b-none sm:h-[23rem] lg:h-[24rem] xl:h-[22rem] 2xl:h-[24rem]" />
          <Skeleton className="mx-4 mb-3 h-4 w-2/3" />
        </div>
      ))}
    </div>
  );
}

export function DocumentLibrary({
  documents,
  onOpen,
  onReset,
  onRetry,
  state = "ready",
  isFiltered = false,
  perspectiveLabel = "this perspective",
}: DocumentLibraryProps) {
  return (
    <motion.div
      layout
      className="relative min-h-80"
      transition={{ layout: documentSpring }}
    >
      <AnimatePresence initial={false} mode="popLayout">
        {state === "loading" ? (
          <motion.div
            key="documents-loading"
            className="w-full"
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: documentEase }}
          >
            <DocumentGridSkeleton />
          </motion.div>
        ) : state === "error" ? (
          <motion.div
            key="documents-error"
            className="w-full"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: documentEase }}
          >
            <Empty role="status" className="min-h-80 border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <CircleAlertIcon />
                </EmptyMedia>
                <EmptyTitle>Documents could not be loaded</EmptyTitle>
                <EmptyDescription>
                  Your library is still safe. Retry the local index when you are
                  ready.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button type="button" variant="outline" onClick={onRetry}>
                  <RefreshCwIcon data-icon="inline-start" />
                  Retry
                </Button>
              </EmptyContent>
            </Empty>
          </motion.div>
        ) : documents.length === 0 ? (
          <motion.div
            key={`documents-empty-${isFiltered ? "filtered" : "perspective"}`}
            className="w-full"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: documentEase }}
          >
            <Empty className="min-h-80 border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <FileSearchIcon />
                </EmptyMedia>
                <EmptyTitle>
                  {isFiltered
                    ? "No documents match"
                    : `No documents for ${perspectiveLabel} yet`}
                </EmptyTitle>
                <EmptyDescription>
                  {isFiltered
                    ? "Clear a rule or broaden the search. Nothing in your library has been changed."
                    : `Documents connected to ${perspectiveLabel} will appear here. Add one or update an existing document’s relationships.`}
                </EmptyDescription>
              </EmptyHeader>
              {isFiltered ? (
                <EmptyContent>
                  <Button type="button" variant="outline" onClick={onReset}>
                    <FolderOpenIcon data-icon="inline-start" />
                    Clear search and filters
                  </Button>
                </EmptyContent>
              ) : null}
            </Empty>
          </motion.div>
        ) : (
          <motion.div
            key="documents-ready"
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: documentEase }}
          >
            <AnimatePresence mode="popLayout">
              {documents.map((document, index) => (
                <motion.div
                  key={document.id}
                  layout="position"
                  className="min-w-0"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.99 }}
                  transition={{
                    duration: 0.24,
                    delay: Math.min(index, 5) * 0.035,
                    ease: documentEase,
                    layout: documentSpring,
                  }}
                >
                  <DocumentCard
                    document={document}
                    onOpen={onOpen}
                    priority={index < 4}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
