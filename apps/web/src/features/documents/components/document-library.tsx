import {
  CircleAlertIcon,
  FileSearchIcon,
  FolderOpenIcon,
  RefreshCwIcon,
} from "lucide-react";

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
import type { LifeDocument } from "@/features/documents/types";

type DocumentLibraryProps = {
  documents: LifeDocument[];
  onOpen: (document: LifeDocument) => void;
  onReset: () => void;
  state?: "ready" | "loading" | "error";
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
  state = "ready",
}: DocumentLibraryProps) {
  if (state === "loading") return <DocumentGridSkeleton />;

  if (state === "error") {
    return (
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
          <Button type="button" variant="outline">
            <RefreshCwIcon data-icon="inline-start" />
            Retry
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  if (documents.length === 0) {
    return (
      <Empty className="min-h-80 border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <FileSearchIcon />
          </EmptyMedia>
          <EmptyTitle>No documents match</EmptyTitle>
          <EmptyDescription>
            Clear a rule or broaden the search. Nothing in your library has been
            changed.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button type="button" variant="outline" onClick={onReset}>
            <FolderOpenIcon data-icon="inline-start" />
            Show every document
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {documents.map((document, index) => (
        <DocumentCard
          key={document.id}
          document={document}
          onOpen={onOpen}
          priority={index < 4}
          entranceIndex={index}
        />
      ))}
    </div>
  );
}
