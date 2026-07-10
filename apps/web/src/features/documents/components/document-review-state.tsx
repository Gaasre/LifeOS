import { CheckCircle2Icon, CircleDotDashedIcon } from "lucide-react";

import { cn } from "@lifeos/ui/lib/utils";

import type { DocumentReview } from "@/features/documents/types";

const reviewStateConfig = {
  ready: {
    label: "Review extracted details",
    className: "text-info",
  },
  "in-progress": {
    label: "Review in progress",
    className: "text-info",
  },
  reviewed: {
    label: "Review complete",
    className: "text-success",
  },
} as const;

type DocumentReviewStateProps = {
  review: DocumentReview;
  className?: string;
};

export function DocumentReviewState({
  review,
  className,
}: DocumentReviewStateProps) {
  const config = reviewStateConfig[review.state];

  return (
    <span
      className={cn(
        "flex min-w-0 items-center gap-2 text-xs font-medium",
        config.className,
        className,
      )}
    >
      {review.state === "ready" ? (
        <span
          className="size-1.5 shrink-0 rounded-full bg-current"
          aria-hidden
        />
      ) : review.state === "in-progress" ? (
        <CircleDotDashedIcon className="size-3.5 shrink-0" aria-hidden />
      ) : (
        <CheckCircle2Icon className="size-3.5 shrink-0" aria-hidden />
      )}
      <span className="truncate">{config.label}</span>
    </span>
  );
}
