import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";

import { Button } from "@lifeos/ui/components/button";
import { Spinner } from "@lifeos/ui/components/spinner";

import { LifeOsMark } from "@/components/lifeos-mark";
import { authClient } from "@/lib/auth-client";
import { PerspectiveProvider } from "@/features/perspectives/perspective-context";
import { AssistantRoot } from "@/features/assistant/assistant-root";

function SessionLoading() {
  return (
    <main
      className="dark flex min-h-dvh items-center justify-center bg-background text-foreground"
      aria-label="Opening LifeOS"
      aria-busy="true"
    >
      <div className="animate-in flex items-center gap-4 text-muted-foreground fade-in-0 duration-200 motion-reduce:animate-none">
        <LifeOsMark />
        <span className="text-lg tracking-[0.08em]">LifeOS</span>
        <Spinner className="ml-2 size-4" aria-hidden />
      </div>
    </main>
  );
}

function SessionUnavailable({ onRetry }: { onRetry: () => void }) {
  return (
    <main className="dark flex min-h-dvh items-center justify-center bg-background px-6 text-foreground">
      <div className="flex max-w-sm flex-col items-center gap-5 text-center">
        <LifeOsMark />
        <div className="space-y-2">
          <h1 className="text-xl font-medium">LifeOS is out of reach.</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Check that the API and database are running, then try once more.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={onRetry}>
          Try again
        </Button>
      </div>
    </main>
  );
}

export function ProtectedRoute() {
  const location = useLocation();
  const { data: session, error, isPending, refetch } = authClient.useSession();

  if (isPending) {
    return <SessionLoading />;
  }

  if (error) {
    return <SessionUnavailable onRetry={() => void refetch()} />;
  }

  if (!session) {
    const from = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to="/login" replace state={{ from }} />;
  }

  return (
    <PerspectiveProvider>
      <AssistantRoot />
      <Outlet />
    </PerspectiveProvider>
  );
}

export function PublicOnlyRoute() {
  const location = useLocation();
  const { data: session, isPending } = authClient.useSession();
  const [hasResolvedInitialSession, setHasResolvedInitialSession] =
    useState(!isPending);

  useEffect(() => {
    if (!isPending) {
      setHasResolvedInitialSession(true);
    }
  }, [isPending]);

  if (isPending && !hasResolvedInitialSession) {
    return <SessionLoading />;
  }

  if (session) {
    const from =
      typeof location.state?.from === "string" &&
      location.state.from.startsWith("/")
        ? location.state.from
        : "/";

    return <Navigate to={from} replace />;
  }

  return <Outlet />;
}
