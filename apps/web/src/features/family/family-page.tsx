import { useCallback, useEffect, useState } from "react";
import {
  CalendarClockIcon,
  FileTextIcon,
  HeartHandshakeIcon,
  UsersRoundIcon,
} from "lucide-react";
import { Link } from "react-router-dom";

import type { FamilyDashboard } from "@lifeos/rpc";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@lifeos/ui/components/alert";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@lifeos/ui/components/avatar";
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
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@lifeos/ui/components/empty";
import { Skeleton } from "@lifeos/ui/components/skeleton";

import { AppHeader } from "@/components/app-header";
import {
  CreateFamilyDialog,
  InviteFamilyDialog,
} from "@/features/family/family-dialogs";
import { authClient } from "@/lib/auth-client";
import { rpcClient } from "@/lib/rpc-client";

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "F"
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function FamilyLoading() {
  return (
    <div className="mt-12 flex flex-col gap-8">
      <Skeleton className="h-44 rounded-2xl" />
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
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
    <Empty className="mt-12 min-h-[28rem] rounded-2xl border bg-card/20">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <HeartHandshakeIcon />
        </EmptyMedia>
        <EmptyTitle>Start your Family</EmptyTitle>
        <EmptyDescription>
          Create one household for you and your partner. Everything you add
          stays available to both of you; person and Family spaces only change
          what is in focus.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <CreateFamilyDialog
          onCreated={onCreated}
          trigger={<Button type="button">Create Family</Button>}
        />
      </EmptyContent>
    </Empty>
  );
}

function PeopleSection({ dashboard }: { dashboard: FamilyDashboard }) {
  return (
    <Card className="bg-card/35">
      <CardHeader>
        <CardTitle>People</CardTitle>
        <CardDescription>
          These are person views, not separate accounts or private folders.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        {dashboard.people.map((person) => (
          <Button
            key={person.id}
            asChild
            variant="outline"
            className="h-auto justify-start px-4 py-3"
          >
            <Link to={`/people/${person.id}`}>
              <Avatar className="size-10">
                <AvatarImage
                  src={person.avatarUrl ?? undefined}
                  alt={person.preferredName}
                />
                <AvatarFallback>
                  {initials(person.preferredName)}
                </AvatarFallback>
              </Avatar>
              <span className="flex min-w-0 flex-col items-start">
                <span className="truncate font-medium">
                  {person.preferredName}
                </span>
                <span className="text-xs text-muted-foreground">
                  {person.isCurrentUser ? "Your person view" : "Person view"}
                </span>
              </span>
            </Link>
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}

function RecentDocuments({ dashboard }: { dashboard: FamilyDashboard }) {
  return (
    <Card className="bg-card/35">
      <CardHeader>
        <CardTitle>Recent documents</CardTitle>
        <CardDescription>
          One canonical vault, shown here through the combined Family view.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {dashboard.recentDocuments.length > 0 ? (
          <div className="flex flex-col gap-3">
            {dashboard.recentDocuments.map((document) => (
              <Button
                key={document.id}
                asChild
                variant="ghost"
                className="h-auto justify-start px-3 py-3"
              >
                <Link to={`/documents?document=${document.id}`}>
                  <FileTextIcon data-icon="inline-start" />
                  <span className="flex min-w-0 flex-1 flex-col items-start gap-1">
                    <span className="truncate font-medium">
                      {document.title}
                    </span>
                    <span className="flex flex-wrap gap-1.5">
                      <Badge variant="secondary">{document.kind}</Badge>
                      {document.people.map((person) => (
                        <Badge key={person} variant="outline">
                          {person}
                        </Badge>
                      ))}
                      {document.modules.map((module) => (
                        <Badge key={module} variant="outline">
                          {module}
                        </Badge>
                      ))}
                    </span>
                  </span>
                </Link>
              </Button>
            ))}
          </div>
        ) : (
          <Empty className="min-h-52 bg-muted/10">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <FileTextIcon />
              </EmptyMedia>
              <EmptyTitle>No documents yet</EmptyTitle>
              <EmptyDescription>
                Documents added to the household appear here automatically.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button asChild variant="outline">
                <Link to="/documents">Open Documents</Link>
              </Button>
            </EmptyContent>
          </Empty>
        )}
      </CardContent>
    </Card>
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
    <main className="dark min-h-screen overflow-x-hidden bg-background text-foreground">
      <div className="mx-auto w-full max-w-[92rem] px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
        <AppHeader section="Overview" />

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
          <div className="mt-10 flex flex-col gap-6 lg:mt-14">
            <section className="overflow-hidden rounded-2xl border bg-card/30">
              <div className="grid min-h-48 gap-6 p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-end">
                <div className="max-w-2xl">
                  <p className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
                    Computed household perspective
                  </p>
                  <h1 className="mt-2 font-heading text-4xl tracking-tight sm:text-5xl">
                    {dashboard.family.name}
                  </h1>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
                    Everything related to either person, both people, or the
                    household comes together here automatically.
                  </p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    <Badge variant="secondary">
                      <UsersRoundIcon data-icon="inline-start" />
                      {dashboard.summary.people} people
                    </Badge>
                    <Badge variant="secondary">
                      <FileTextIcon data-icon="inline-start" />
                      {dashboard.summary.documents}{" "}
                      {dashboard.summary.documents === 1
                        ? "document"
                        : "documents"}
                    </Badge>
                    {dashboard.summary.needsAttention > 0 ? (
                      <Badge variant="outline">
                        <CalendarClockIcon data-icon="inline-start" />
                        {dashboard.summary.needsAttention} need attention
                      </Badge>
                    ) : null}
                  </div>
                </div>
                <InviteFamilyDialog
                  organizationId={dashboard.family.id}
                  disabled={dashboard.people.length >= 2}
                />
              </div>
            </section>

            <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
              <PeopleSection dashboard={dashboard} />
              <RecentDocuments dashboard={dashboard} />
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
