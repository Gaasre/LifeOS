import {
  DownloadIcon,
  ExternalLinkIcon,
  FileImageIcon,
  FileTextIcon,
  Link2Icon,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@lifeos/ui/components/badge";
import { Button } from "@lifeos/ui/components/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@lifeos/ui/components/sheet";

import { DocumentFileDetails } from "@/features/documents/components/document-file-details";
import { DocumentFilePreview } from "@/features/documents/components/document-file-preview";
import { DocumentRelationshipsDialog } from "@/features/documents/components/document-relationships-dialog";
import type { LifeDocument } from "@/features/documents/types";
import { rpcClient } from "@/lib/rpc-client";

type DocumentDetailSheetProps = {
  document: LifeDocument | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function DocumentDetailSheet({
  document: selectedDocument,
  open,
  onOpenChange,
}: DocumentDetailSheetProps) {
  const [isOpeningFile, setIsOpeningFile] = useState(false);

  if (!selectedDocument) return null;

  const selectedDocumentId = selectedDocument.id;
  const hasConnections =
    selectedDocument.areas.length > 0 || selectedDocument.people.length > 0;

  async function openFile(disposition: "inline" | "attachment") {
    setIsOpeningFile(true);
    try {
      const download = await rpcClient.documents.getDownloadUrl({
        documentId: selectedDocumentId,
        disposition,
      });
      window.open(download.url, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast.error(
        error instanceof Error && error.message
          ? error.message
          : "The file could not be opened.",
      );
    } finally {
      setIsOpeningFile(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto data-[side=right]:w-full data-[side=right]:sm:max-w-2xl">
        <SheetHeader className="pr-10">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {selectedDocument.mediaType === "PDF" ? (
              <FileTextIcon />
            ) : (
              <FileImageIcon />
            )}
            {selectedDocument.kind} · {selectedDocument.mediaType}
          </div>
          <SheetTitle className="text-xl">{selectedDocument.title}</SheetTitle>
          <SheetDescription>{selectedDocument.issuer}</SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-6 px-4 pb-4">
          <div className="overflow-hidden rounded-lg bg-muted ring-1 ring-foreground/10">
            <DocumentFilePreview
              document={selectedDocument}
              alt={`Full preview of ${selectedDocument.title}`}
              fit="contain"
              priority={open}
              className="h-[38vh] w-full"
            />
          </div>

          {selectedDocument.attention ? (
            <div className="flex items-center gap-2 rounded-lg bg-warning/10 p-3 text-sm text-warning">
              <span className="size-2 rounded-full bg-current" aria-hidden />
              {selectedDocument.attention.label}
            </div>
          ) : null}

          {hasConnections ? (
            <section
              className="flex flex-col gap-3"
              aria-labelledby="document-links-title"
            >
              <h3
                id="document-links-title"
                className="text-xs font-medium tracking-wide text-muted-foreground uppercase"
              >
                Connected to
              </h3>
              <div className="flex flex-wrap gap-2">
                {selectedDocument.areas.map((area) => (
                  <Badge key={area} variant="outline">
                    <Link2Icon />
                    {area}
                  </Badge>
                ))}
                {selectedDocument.people.map((person) => (
                  <Badge key={person} variant="secondary">
                    {person}
                  </Badge>
                ))}
              </div>
            </section>
          ) : null}

          <DocumentFileDetails document={selectedDocument} />
        </div>

        <SheetFooter className="border-t bg-muted/30 sm:flex-row">
          <DocumentRelationshipsDialog document={selectedDocument} />
          <Button
            type="button"
            variant="outline"
            disabled={isOpeningFile}
            onClick={() => void openFile("attachment")}
          >
            <DownloadIcon data-icon="inline-start" />
            Download file
          </Button>
          <Button
            type="button"
            disabled={isOpeningFile}
            onClick={() => void openFile("inline")}
          >
            <ExternalLinkIcon data-icon="inline-start" />
            Open file
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
