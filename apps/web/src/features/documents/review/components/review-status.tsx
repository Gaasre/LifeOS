import { CheckCircle2Icon, CircleAlertIcon, CircleDotIcon } from "lucide-react";

import { cn } from "@lifeos/ui/lib/utils";

import type { ReviewFieldStatus } from "@/features/documents/review/types";

const statusConfig = {
  extracted: {
    label: "Extracted",
    icon: CircleDotIcon,
    className: "text-muted-foreground",
  },
  "needs-review": {
    label: "Needs review",
    icon: CircleAlertIcon,
    className: "text-warning",
  },
  verified: {
    label: "Verified",
    icon: CheckCircle2Icon,
    className: "text-success",
  },
} as const;

type ReviewStatusProps = {
  status: ReviewFieldStatus;
  className?: string;
};

export function ReviewStatus({ status, className }: ReviewStatusProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[0.68rem] font-medium tracking-[0.02em]",
        config.className,
        className,
      )}
    >
      <Icon className="size-3" aria-hidden />
      {config.label}
    </span>
  );
}
