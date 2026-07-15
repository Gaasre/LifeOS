import { useCallback, useEffect, useState } from "react";
import { HeartHandshakeIcon } from "lucide-react";
import { MotionConfig } from "motion/react";

import type { FamilyDashboard } from "@lifeos/rpc";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@lifeos/ui/components/alert";
import { Button } from "@lifeos/ui/components/button";
import { Skeleton } from "@lifeos/ui/components/skeleton";

import { AppHeader } from "@/components/app-header";
import { FamilyDashboardView } from "@/features/family/family-dashboard";
import {
  CreateFamilyDialog,
  InviteFamilyDialog,
} from "@/features/family/family-dialogs";
import { authClient } from "@/lib/auth-client";
import { rpcClient } from "@/lib/rpc-client";

function FamilyLoading() {
  return (
    <div className="mt-10 flex flex-col gap-5 lg:mt-14">
      <div className="mb-2 space-y-3">
        <Skeleton className="h-3 w-40 rounded-full" />
        <Skeleton className="h-12 w-72 max-w-full rounded-xl" />
        <Skeleton className="h-5 w-[34rem] max-w-full rounded-lg" />
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(22rem,0.8fr)]">
        <Skeleton className="min-h-[29rem] rounded-2xl" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="min-h-72 rounded-2xl lg:min-h-[29rem]" />
          <Skeleton className="min-h-72 rounded-2xl lg:min-h-[29rem]" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Skeleton className="h-36 rounded-2xl" />
        <Skeleton className="h-36 rounded-2xl" />
        <Skeleton className="h-36 rounded-2xl" />
      </div>
    </div>
  );
}

function FamilyEmptyState({
  onCreated,
}: {
  onCreated: (organizationId: string) => Promise<void>;
}) {
  return (
    <section className="relative isolate mt-10 min-h-[32rem] overflow-hidden rounded-2xl border border-white/8 bg-card/25 lg:mt-14">
      <img
        src="/images/family/week-hero-v2.jpg"
        alt=""
        aria-hidden
        className="absolute inset-0 size-full object-cover object-center opacity-65 grayscale brightness-[0.55]"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-background via-background/88 to-background/10" />
      <div className="relative z-10 flex min-h-[32rem] max-w-xl flex-col items-start justify-end p-6 sm:p-10">
        <span className="mb-6 grid size-12 place-items-center rounded-full border border-family-accent/30 bg-family-accent/12 text-family-accent">
          <HeartHandshakeIcon className="size-5" />
        </span>
        <h1 className="font-heading text-4xl tracking-tight sm:text-5xl">
          Start your Family
        </h1>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          Create one household for both of you. LifeOS will turn the information
          you already manage into a shared rhythm of people, dates, plans, and
          things that need attention.
        </p>
        <div className="mt-7">
          <CreateFamilyDialog
            onCreated={onCreated}
            trigger={<Button type="button">Create Family</Button>}
          />
        </div>
      </div>
    </section>
  );
}

export function FamilyPage() {
  const { data: session } = authClient.useSession();
  const organizations = authClient.useListOrganizations();
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<
    string | undefined
  >();
  const [dashboard, setDashboard] = useState<FamilyDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);

  const activeOrganizationId = (
    session?.session as { activeOrganizationId?: string | null } | undefined
  )?.activeOrganizationId;

  useEffect(() => {
    if (organizations.isPending) return;
    const available = organizations.data ?? [];
    const preferred =
      activeOrganizationId &&
      available.some((item) => item.id === activeOrganizationId)
        ? activeOrganizationId
        : available[0]?.id;
    setSelectedOrganizationId(preferred);
  }, [activeOrganizationId, organizations.data, organizations.isPending]);

  const loadDashboard = useCallback(async (organizationId?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      setDashboard(await rpcClient.family.bootstrap({ organizationId }));
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Your Family view could not be opened.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (organizations.isPending) return;
    void loadDashboard(selectedOrganizationId);
  }, [loadDashboard, organizations.isPending, selectedOrganizationId]);

  const handleCreated = useCallback(
    async (organizationId: string) => {
      setSelectedOrganizationId(organizationId);
      await organizations.refetch();
      await loadDashboard(organizationId);
    },
    [loadDashboard, organizations],
  );

  return (
    <MotionConfig reducedMotion="user">
      <main className="dark min-h-screen overflow-x-hidden bg-background text-foreground">
        <div className="mx-auto w-full max-w-[92rem] px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
          <AppHeader section="Family" />

          {organizations.isPending || isLoading ? <FamilyLoading /> : null}

          {!organizations.isPending && !isLoading && error ? (
            <Alert variant="destructive" className="mt-12">
              <AlertTitle>Your Family view is out of reach</AlertTitle>
              <AlertDescription className="flex flex-col items-start gap-3">
                {error}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void loadDashboard(selectedOrganizationId)}
                >
                  Try again
                </Button>
              </AlertDescription>
            </Alert>
          ) : null}

          {!organizations.isPending && !isLoading && !error && !dashboard ? (
            <FamilyEmptyState onCreated={handleCreated} />
          ) : null}

          {!isLoading && dashboard ? (
            <>
              <FamilyDashboardView
                dashboard={dashboard}
                onInvite={() => setInviteOpen(true)}
              />
              <InviteFamilyDialog
                organizationId={dashboard.family.id}
                disabled={dashboard.people.length >= 2}
                open={inviteOpen}
                onOpenChange={setInviteOpen}
              />
            </>
          ) : null}
        </div>
      </main>
    </MotionConfig>
  );
}
