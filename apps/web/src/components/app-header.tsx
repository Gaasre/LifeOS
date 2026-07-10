import { ChevronRightIcon } from "lucide-react";
import { Link } from "react-router-dom";

import { LifeOsMark } from "@/components/lifeos-mark";

type AppHeaderProps = {
  section?: string;
};

export function AppHeader({ section }: AppHeaderProps) {
  return (
    <header
      className="flex min-h-11 min-w-0 items-center gap-3"
      aria-label="LifeOS"
    >
      <Link
        to="/"
        className="flex shrink-0 items-center gap-4 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50 sm:gap-5"
        aria-label="LifeOS home"
      >
        <LifeOsMark />
        <span className="text-lg tracking-[0.08em] text-muted-foreground sm:text-xl">
          LifeOS
        </span>
      </Link>
      {section ? (
        <>
          <ChevronRightIcon
            className="size-4 shrink-0 text-muted-foreground/60"
            aria-hidden
          />
          <span className="truncate text-sm text-muted-foreground">
            {section}
          </span>
        </>
      ) : null}
    </header>
  );
}
