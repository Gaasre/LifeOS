import {
  DownloadIcon,
  ExternalLinkIcon,
  FileImageIcon,
  FileTextIcon,
  Link2Icon,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@lifeos/ui/components/badge";
import { Button } from "@lifeos/ui/components/button";
import { Separator } from "@lifeos/ui/components/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@lifeos/ui/components/sheet";

import type { LifeDocument } from "@/features/documents/types";

type DocumentDetailSheetProps = {
  document: LifeDocument | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function formatDate(value?: string) {
  if (!value) return "Not set";
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function DocumentDetailSheet({
  document,
  open,
  onOpenChange,
}: DocumentDetailSheetProps) {
  if (!document) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader className="pr-10">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {document.mediaType === "PDF" ? (
              <FileTextIcon />
            ) : (
              <FileImageIcon />
            )}
            {document.kind} · {document.mediaType}
          </div>
          <SheetTitle className="text-xl">{document.title}</SheetTitle>
          <SheetDescription>{document.issuer}</SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-6 px-4 pb-4">
          <div className="overflow-hidden rounded-lg bg-muted ring-1 ring-foreground/10">
            <img
              src={document.preview}
              alt={`Full preview of ${document.title}`}
              width={1086}
              height={1448}
              className="mx-auto h-auto max-h-[58vh] w-full object-contain object-top"
            />
          </div>

          {document.attention ? (
            <div className="flex items-center gap-2 rounded-lg bg-warning/10 p-3 text-sm text-warning">
              <span className="size-2 rounded-full bg-current" aria-hidden />
              {document.attention.label}
            </div>
          ) : null}

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
              {document.areas.map((area) => (
                <Badge key={area} variant="outline">
                  <Link2Icon />
                  {area}
                </Badge>
              ))}
              {document.people.map((person) => (
                <Badge key={person} variant="secondary">
                  {person}
                </Badge>
              ))}
            </div>
          </section>

          <Separator />

          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
            <div className="flex min-w-0 flex-col gap-1">
              <dt className="text-xs text-muted-foreground">Issued</dt>
              <dd className="truncate">{formatDate(document.issuedAt)}</dd>
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <dt className="text-xs text-muted-foreground">Expires</dt>
              <dd className="truncate">{formatDate(document.expiresAt)}</dd>
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <dt className="text-xs text-muted-foreground">File</dt>
              <dd className="truncate">{document.filename}</dd>
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <dt className="text-xs text-muted-foreground">Size</dt>
              <dd>{document.sizeMb.toFixed(1)} MB</dd>
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <dt className="text-xs text-muted-foreground">Source</dt>
              <dd>{document.source}</dd>
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <dt className="text-xs text-muted-foreground">Privacy</dt>
              <dd>{document.sensitivity}</dd>
            </div>
          </dl>
        </div>

        <SheetFooter className="border-t bg-muted/30 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            onClick={() => toast.success(`${document.title} is ready offline.`)}
          >
            <DownloadIcon data-icon="inline-start" />
            Make available offline
          </Button>
          <Button
            type="button"
            onClick={() =>
              toast(`Opening ${document.title} in the full viewer.`)
            }
          >
            <ExternalLinkIcon data-icon="inline-start" />
            Open full viewer
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
