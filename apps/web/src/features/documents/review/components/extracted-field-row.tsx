import { CheckIcon, PencilIcon, ScanSearchIcon, XIcon } from "lucide-react";

import { Button } from "@lifeos/ui/components/button";
import { Input } from "@lifeos/ui/components/input";
import { Textarea } from "@lifeos/ui/components/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lifeos/ui/components/tooltip";
import { cn } from "@lifeos/ui/lib/utils";

import { ReviewStatus } from "@/features/documents/review/components/review-status";
import type {
  ReviewField,
  ReviewFieldStatus,
} from "@/features/documents/review/types";

type ExtractedFieldRowProps = {
  field: ReviewField;
  value: string;
  status: ReviewFieldStatus;
  selected: boolean;
  editing: boolean;
  draftValue: string;
  compact?: boolean;
  onSelect: () => void;
  onBeginEdit: () => void;
  onDraftValueChange: (value: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onVerify: () => void;
};

export function ExtractedFieldRow({
  field,
  value,
  status,
  selected,
  editing,
  draftValue,
  compact = false,
  onSelect,
  onBeginEdit,
  onDraftValueChange,
  onSaveEdit,
  onCancelEdit,
  onVerify,
}: ExtractedFieldRowProps) {
  const Editor = field.multiline ? Textarea : Input;

  return (
    <div
      className={cn(
        "group/field min-w-0 rounded-lg border border-transparent transition-colors",
        compact ? "p-2.5" : "px-3 py-2",
        selected && "border-warning/35 bg-warning/6",
        !selected && "hover:bg-muted/35",
      )}
    >
      <div className="flex min-w-0 items-start justify-between gap-3">
        <button
          type="button"
          className={cn(
            "min-w-0 flex-1 rounded-sm text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
            !compact &&
              "sm:grid sm:grid-cols-[minmax(6.75rem,0.72fr)_minmax(0,1.28fr)] sm:items-center sm:gap-3",
          )}
          onClick={onSelect}
        >
          <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="text-xs text-muted-foreground">{field.label}</span>
            <ReviewStatus
              status={status}
              className={cn(!compact && "sm:hidden")}
            />
          </span>
          {!editing ? (
            <span
              className={cn(
                "mt-1 block text-sm leading-snug font-medium text-foreground sm:mt-0",
                field.multiline ? "line-clamp-2" : "truncate",
              )}
            >
              {value}
            </span>
          ) : null}
        </button>

        {!editing ? (
          <div className="flex shrink-0 items-center gap-1.5">
            {!compact ? (
              <ReviewStatus
                status={status}
                className="hidden min-w-18 justify-end sm:inline-flex"
              />
            ) : null}
            <div className="flex items-center gap-0.5 opacity-100 transition-opacity sm:opacity-55 sm:group-hover/field:opacity-100 sm:group-focus-within/field:opacity-100">
              {status !== "verified" && !compact ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      onClick={onVerify}
                      aria-label={`Verify ${field.label}`}
                    >
                      <CheckIcon />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Mark verified</TooltipContent>
                </Tooltip>
              ) : null}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={onSelect}
                    aria-label={`Show evidence for ${field.label}`}
                  >
                    <ScanSearchIcon />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Show source evidence</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={onBeginEdit}
                    aria-label={`Edit ${field.label}`}
                  >
                    <PencilIcon />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Edit value</TooltipContent>
              </Tooltip>
            </div>
          </div>
        ) : null}
      </div>

      {editing ? (
        <div className="mt-2 flex flex-col gap-2">
          <Editor
            value={draftValue}
            onChange={(event) => onDraftValueChange(event.target.value)}
            className={cn(field.multiline && "min-h-20 resize-none")}
            aria-label={`Edit ${field.label}`}
            autoFocus
          />
          <div className="flex items-center justify-end gap-1.5">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={onCancelEdit}
            >
              <XIcon data-icon="inline-start" />
              Cancel
            </Button>
            <Button type="button" size="sm" onClick={onSaveEdit}>
              <CheckIcon data-icon="inline-start" />
              Save
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
