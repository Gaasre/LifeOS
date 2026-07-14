import { useState } from "react";

import {
  ArrowUpRightIcon,
  ChevronDownIcon,
  CircleAlertIcon,
} from "lucide-react";

import { Badge } from "@lifeos/ui/components/badge";
import { Button } from "@lifeos/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@lifeos/ui/components/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@lifeos/ui/components/collapsible";
import { cn } from "@lifeos/ui/lib/utils";

import { DocumentFilePreview } from "@/features/documents/components/document-file-preview";
import type { LifeDocument } from "@/features/documents/types";

type AttentionPanelProps = {
  documents: LifeDocument[];
  onOpen: (document: LifeDocument) => void;
};

export function AttentionPanel({ documents, onOpen }: AttentionPanelProps) {
  const [open, setOpen] = useState(false);

  if (documents.length === 0) return null;

  return (
    <section aria-labelledby="attention-title">
      <Collapsible open={open} onOpenChange={setOpen}>
        <Card
          size="sm"
          className="gap-0 overflow-hidden bg-card/70 py-0 ring-warning/15"
        >
          <CardHeader className="flex min-h-14 flex-row items-center gap-3 px-3 py-3 sm:px-4">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-warning/10 text-warning">
              <CircleAlertIcon aria-hidden />
            </span>

            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <CardTitle id="attention-title">Needs attention</CardTitle>
              <CardDescription className="hidden truncate text-xs sm:block">
                Dates, renewals, and details waiting for you
              </CardDescription>
            </div>

            <Badge variant="outline">{documents.length} open</Badge>

            <CollapsibleTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label={
                  open ? "Hide attention items" : "Show attention items"
                }
              >
                {open ? "Hide" : "Show"}
                <ChevronDownIcon
                  data-icon="inline-end"
                  className={cn(
                    "transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
                    open && "rotate-180",
                  )}
                />
              </Button>
            </CollapsibleTrigger>
          </CardHeader>

          <CollapsibleContent className="data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0">
            <CardContent className="border-t border-warning/10 p-2">
              <div className="grid gap-1 lg:grid-cols-3">
                {documents.map((document, index) => (
                  <Button
                    key={document.id}
                    type="button"
                    variant="ghost"
                    className="document-compact-enter h-auto min-w-0 justify-start px-2 py-2 text-left hover:bg-warning/[0.055]"
                    style={{ animationDelay: `${index * 45}ms` }}
                    onClick={() => onOpen(document)}
                  >
                    <DocumentFilePreview
                      document={document}
                      alt=""
                      className="h-10 w-8 shrink-0 rounded-sm ring-1 ring-foreground/10"
                    />
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="truncate font-medium">
                        {document.title}
                      </span>
                      <span className="truncate text-xs text-warning">
                        {document.attention?.label}
                      </span>
                    </span>
                    <ArrowUpRightIcon data-icon="inline-end" />
                  </Button>
                ))}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </section>
  );
}
