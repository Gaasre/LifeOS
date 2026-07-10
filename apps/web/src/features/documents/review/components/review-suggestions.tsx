import {
  CalendarClockIcon,
  CheckCheckIcon,
  CheckIcon,
  HomeIcon,
  XIcon,
} from "lucide-react";

import { Badge } from "@lifeos/ui/components/badge";
import { Button } from "@lifeos/ui/components/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@lifeos/ui/components/card";

import type { ReviewSuggestion } from "@/features/documents/review/types";

type ReviewSuggestionsProps = {
  suggestions: ReviewSuggestion[];
  acceptedIds: string[];
  onAccept: (suggestion: ReviewSuggestion) => void;
  onAcceptAll: () => void;
  onDismiss: (suggestion: ReviewSuggestion) => void;
};

export function ReviewSuggestions({
  suggestions,
  acceptedIds,
  onAccept,
  onAcceptAll,
  onDismiss,
}: ReviewSuggestionsProps) {
  if (suggestions.length === 0) {
    return null;
  }

  const allAccepted = suggestions.every((suggestion) =>
    acceptedIds.includes(suggestion.id),
  );

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Suggested by LifeOS</CardTitle>
        <CardDescription className="text-xs">
          Optional next steps. Nothing happens without your say-so.
        </CardDescription>
        <CardAction>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={onAcceptAll}
            disabled={allAccepted}
          >
            {allAccepted ? (
              <CheckIcon data-icon="inline-start" />
            ) : (
              <CheckCheckIcon data-icon="inline-start" />
            )}
            {allAccepted ? "All accepted" : "Accept all"}
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col divide-y divide-border/60">
        {suggestions.map((suggestion) => {
          const Icon =
            suggestion.kind === "connection" ? HomeIcon : CalendarClockIcon;
          const accepted = acceptedIds.includes(suggestion.id);

          return (
            <div
              key={suggestion.id}
              className="flex min-w-0 items-center gap-3 py-2.5 first:pt-0 last:pb-0"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <Icon className="size-4" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2 text-sm font-medium">
                  {suggestion.title}
                  {accepted ? (
                    <Badge
                      variant="outline"
                      className="border-success/25 text-success"
                    >
                      <CheckIcon />
                      Added
                    </Badge>
                  ) : null}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {suggestion.description}
                </span>
              </span>
              {!accepted ? (
                <span className="flex shrink-0 items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => onDismiss(suggestion)}
                    aria-label={`Dismiss ${suggestion.title}`}
                  >
                    <XIcon />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onAccept(suggestion)}
                    aria-label={`Add ${suggestion.title}`}
                  >
                    Add
                  </Button>
                </span>
              ) : null}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
