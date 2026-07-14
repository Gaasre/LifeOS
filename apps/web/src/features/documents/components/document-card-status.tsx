import { CardFooter } from "@lifeos/ui/components/card";
import { cn } from "@lifeos/ui/lib/utils";

import type { LifeDocument } from "@/features/documents/types";

const attentionTone = {
  warning: "text-warning",
  destructive: "text-destructive",
  info: "text-info",
} as const;

type DocumentCardStatusProps = {
  document: LifeDocument;
};

export function DocumentCardStatus({ document }: DocumentCardStatusProps) {
  const relationshipLabel =
    document.people.length > 0
      ? `For ${document.people.join(" + ")}`
      : "For Family";
  const creatorMatchesSoleRelatedPerson =
    document.people.length === 1 &&
    document.addedBy?.name.localeCompare(document.people[0] ?? "", undefined, {
      sensitivity: "base",
    }) === 0;
  const addedLabel =
    document.addedBy && !creatorMatchesSoleRelatedPerson
      ? `Added by ${document.addedBy.name}`
      : `Added ${new Date(document.addedAt).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        })}`;

  return (
    <CardFooter className="h-11 min-h-11 justify-between gap-3 border-t border-foreground/10 bg-muted/20 px-4 py-0">
      {document.attention ? (
        <span
          className={cn(
            "flex min-w-0 items-center gap-2 text-[0.8125rem] font-medium",
            attentionTone[document.attention.tone],
          )}
        >
          <span
            className="size-1.5 shrink-0 rounded-full bg-current"
            aria-hidden
          />
          <span className="truncate">{document.attention.label}</span>
        </span>
      ) : (
        <span className="truncate text-[0.8125rem] text-muted-foreground">
          {relationshipLabel}
        </span>
      )}
      <span className="truncate text-xs text-muted-foreground">
        {addedLabel}
      </span>
    </CardFooter>
  );
}
