import type { ComponentProps } from "react";

import { cn } from "@lifeos/ui/lib/utils";

export function ModulePageContainer({
  className,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      data-slot="module-page-container"
      className={cn(
        "mx-auto w-full max-w-[92rem] px-4 py-6 sm:px-6 lg:px-10 lg:py-10",
        className,
      )}
      {...props}
    />
  );
}

export function ModulePageContent({
  className,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      data-slot="module-page-content"
      className={cn("mt-12 min-w-0 lg:mt-18 lg:pl-32", className)}
      {...props}
    />
  );
}
