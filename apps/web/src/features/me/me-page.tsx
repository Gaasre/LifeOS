import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  CalendarClockIcon,
  FileTextIcon,
  IdCardIcon,
  PencilIcon,
  PlusIcon,
  UserRoundIcon,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";

import type {
  OfficialRecord,
  PersonalDate,
  PersonDashboard,
  PersonFact,
} from "@lifeos/rpc";
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
  CardAction,
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@lifeos/ui/components/tabs";

import { AppHeader } from "@/components/app-header";
import { usefulFactFields } from "@/features/me/me-config";
import {
  OfficialRecordDialog,
  PersonalDateDialog,
  PersonFactDialog,
  PersonProfileDialog,
  RemovePersonItemButton,
} from "@/features/me/me-dialogs";
import { rpcClient } from "@/lib/rpc-client";

const tabItems = [
  { value: "overview", label: "Overview" },
  { value: "official", label: "Official information" },
  { value: "facts", label: "Useful personal facts" },
  { value: "dates", label: "Important dates" },
] as const;

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "P"
  );
}

function formatDate(value: string | null) {
  if (!value) return "Not added";
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function normalizeLabel(value: string) {
  return value.trim().toLocaleLowerCase();
}

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function nextAnnualOccurrence(value: string, today: string) {
  const currentYear = Number(today.slice(0, 4));
  const monthAndDay = value.slice(5);
  const thisYear = `${currentYear}-${monthAndDay}`;
  return thisYear >= today ? thisYear : `${currentYear + 1}-${monthAndDay}`;
}

function daysFromToday(value: string, today: string) {
  const targetTime = new Date(`${value}T00:00:00Z`).getTime();
  const todayTime = new Date(`${today}T00:00:00Z`).getTime();
  return Math.round((targetTime - todayTime) / 86_400_000);
}

function PersonLoading() {
  return (
    <div className="mt-12 flex flex-col gap-8">
      <Skeleton className="h-48 rounded-2xl" />
      <Skeleton className="h-10 w-full rounded-xl" />
      <Skeleton className="h-96 rounded-2xl" />
    </div>
  );
}

function PersonHero({ dashboard }: { dashboard: PersonDashboard }) {
  const { profile } = dashboard;
  return (
    <section className="rounded-2xl border bg-card/25 p-6 sm:p-8">
      <div className="flex min-w-0 items-center gap-5">
        <Avatar className="size-20 sm:size-24">
          <AvatarImage
            src={profile.avatarUrl ?? undefined}
            alt={profile.preferredName}
          />
          <AvatarFallback className="text-xl">
            {initials(profile.preferredName)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate font-heading text-4xl tracking-tight sm:text-5xl">
              {profile.preferredName}
            </h1>
            {profile.isCurrentUser ? (
              <Badge variant="secondary">You</Badge>
            ) : null}
          </div>
          {profile.legalName && profile.legalName !== profile.preferredName ? (
            <p className="mt-1 text-sm text-foreground/80">
              {profile.legalName}
            </p>
          ) : null}
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
            Personal information about this person that you may need again.
          </p>
        </div>
      </div>
    </section>
  );
}

function SectionHeading({
  id,
  title,
  description,
  action,
}: {
  id: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h2 id={id} className="font-heading text-3xl">
          {title}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
      {action}
    </div>
  );
}

function OverviewSection({
  dashboard,
  onChanged,
}: {
  dashboard: PersonDashboard;
  onChanged: () => Promise<void>;
}) {
  const { profile } = dashboard;
  const details = [
    { label: "Full legal name", value: profile.legalName },
    { label: "Preferred name", value: profile.preferredName },
    { label: "Date of birth", value: formatDate(profile.birthday) },
    { label: "Place of birth", value: profile.placeOfBirth },
    { label: "Nationality", value: profile.nationality },
    { label: "Current city", value: profile.currentCity },
    {
      label: "Current address",
      value: profile.currentAddress,
      wide: true,
    },
    { label: "Marital status", value: profile.maritalStatus },
    {
      label: "Languages",
      value: profile.languages.length > 0 ? profile.languages.join(", ") : null,
    },
  ];

  return (
    <section aria-labelledby="overview-title" className="flex flex-col gap-5">
      <SectionHeading
        id="overview-title"
        title="Overview"
        description="The compact identity summary used most often in forms, applications, and everyday admin."
      />
      <Card className="bg-card/30">
        <CardHeader className="border-b">
          <CardTitle>Personal summary</CardTitle>
          <CardDescription>
            Identity facts only. Account settings and module-specific data stay
            elsewhere.
          </CardDescription>
          <CardAction>
            <PersonProfileDialog profile={profile} onChanged={onChanged} />
          </CardAction>
        </CardHeader>
        <CardContent>
          <dl className="grid sm:grid-cols-2">
            {details.map((detail) => (
              <div
                key={detail.label}
                className={`border-b py-4 last:border-b-0 sm:odd:pr-6 sm:even:pl-6 ${detail.wide ? "sm:col-span-2 sm:px-0" : ""}`}
              >
                <dt className="text-xs text-muted-foreground">
                  {detail.label}
                </dt>
                <dd
                  className={`mt-1.5 text-sm leading-relaxed ${detail.value ? "text-foreground" : "text-muted-foreground"}`}
                >
                  {detail.value || "Not added"}
                </dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>
    </section>
  );
}

function recordStatusLabel(record: OfficialRecord) {
  if (record.status === "needs_review") return "Needs review";
  if (record.status === "expired") return "Expired";
  return "Current";
}

function OfficialRecordCard({
  dashboard,
  record,
  onChanged,
}: {
  dashboard: PersonDashboard;
  record: OfficialRecord;
  onChanged: () => Promise<void>;
}) {
  const sourceDocument = dashboard.sourceDocuments.find(
    (document) => document.id === record.sourceDocumentId,
  );
  const details = [
    ["Identifier", record.identifier],
    ["Issuing authority", record.issuingAuthority],
    ["Country", record.country],
    ["Issue date", record.issueDate ? formatDate(record.issueDate) : null],
    ["Expiry date", record.expiryDate ? formatDate(record.expiryDate) : null],
  ].filter((entry): entry is [string, string] => Boolean(entry[1]));

  return (
    <Card className="bg-card/30">
      <CardHeader className="border-b">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="text-lg">{record.recordType}</CardTitle>
          <Badge
            variant={record.status === "expired" ? "destructive" : "outline"}
          >
            {recordStatusLabel(record)}
          </Badge>
        </div>
        <CardDescription>
          {record.identifier ?? "No identifier added"}
        </CardDescription>
        <CardAction className="flex items-center gap-1">
          <OfficialRecordDialog
            personId={dashboard.profile.id}
            record={record}
            sourceDocuments={dashboard.sourceDocuments}
            onChanged={onChanged}
            trigger={
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Edit ${record.recordType}`}
              >
                <PencilIcon />
              </Button>
            }
          />
          <RemovePersonItemButton
            personId={dashboard.profile.id}
            item={{ type: "record", id: record.id }}
            title={record.recordType}
            onChanged={onChanged}
          />
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {details.length > 0 ? (
          <dl className="grid gap-4 sm:grid-cols-2">
            {details.map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="mt-1 text-sm leading-relaxed">{value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
        {sourceDocument ? (
          <div className="border-t pt-4">
            <p className="text-xs text-muted-foreground">Source document</p>
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="mt-1 -ml-2 max-w-full justify-start"
            >
              <Link to={`/documents?document=${sourceDocument.id}`}>
                <FileTextIcon data-icon="inline-start" />
                <span className="truncate">{sourceDocument.title}</span>
              </Link>
            </Button>
          </div>
        ) : record.sourceDocumentId ? (
          <p className="border-t pt-4 text-xs text-muted-foreground">
            The linked source document is unavailable.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function OfficialInformationSection({
  dashboard,
  onChanged,
}: {
  dashboard: PersonDashboard;
  onChanged: () => Promise<void>;
}) {
  return (
    <section aria-labelledby="official-title" className="flex flex-col gap-5">
      <SectionHeading
        id="official-title"
        title="Official information"
        description="Structured identifiers and validity details. Original PDFs and images remain in Documents and are linked only as sources."
        action={
          <OfficialRecordDialog
            personId={dashboard.profile.id}
            sourceDocuments={dashboard.sourceDocuments}
            onChanged={onChanged}
          />
        }
      />
      {dashboard.officialRecords.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {dashboard.officialRecords.map((record) => (
            <OfficialRecordCard
              key={record.id}
              dashboard={dashboard}
              record={record}
              onChanged={onChanged}
            />
          ))}
        </div>
      ) : (
        <Empty className="min-h-64 rounded-2xl border bg-card/20">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <IdCardIcon />
            </EmptyMedia>
            <EmptyTitle>No official information yet</EmptyTitle>
            <EmptyDescription>
              Add a passport, national ID, permit, tax identifier, insurance
              number, registration, or licence when it becomes useful.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <OfficialRecordDialog
              personId={dashboard.profile.id}
              sourceDocuments={dashboard.sourceDocuments}
              onChanged={onChanged}
            />
          </EmptyContent>
        </Empty>
      )}
    </section>
  );
}

function findUsefulFacts(facts: PersonFact[]) {
  const used = new Set<string>();
  const presetFacts = new Map<string, PersonFact>();

  for (const field of usefulFactFields) {
    const fact =
      facts.find((candidate) => candidate.key === field.key) ??
      facts.find(
        (candidate) =>
          !used.has(candidate.id) &&
          normalizeLabel(candidate.label) === normalizeLabel(field.label),
      );
    if (fact) {
      used.add(fact.id);
      presetFacts.set(field.key, fact);
    }
  }

  return {
    presetFacts,
    customFacts: facts.filter((fact) => !used.has(fact.id)),
  };
}

function UsefulFactsSection({
  dashboard,
  onChanged,
}: {
  dashboard: PersonDashboard;
  onChanged: () => Promise<void>;
}) {
  const { presetFacts, customFacts } = findUsefulFacts(dashboard.facts);

  return (
    <section aria-labelledby="facts-title" className="flex flex-col gap-5">
      <SectionHeading
        id="facts-title"
        title="Useful personal facts"
        description="Stable details used in forms, shopping, travel, planning, and trusted AI context."
        action={
          <PersonFactDialog
            personId={dashboard.profile.id}
            onChanged={onChanged}
          />
        }
      />
      <Card className="bg-card/30">
        <CardHeader className="border-b">
          <CardTitle>Common facts</CardTitle>
          <CardDescription>
            Fill only what is genuinely useful for this person.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            {usefulFactFields.map((field) => {
              const fact = presetFacts.get(field.key);
              return (
                <div
                  key={field.key}
                  className="grid min-h-16 grid-cols-[minmax(8rem,0.45fr)_1fr_auto] items-center gap-4 py-3"
                >
                  <p className="text-sm text-muted-foreground">{field.label}</p>
                  <p
                    className={`min-w-0 whitespace-pre-wrap text-sm leading-relaxed ${fact ? "text-foreground" : "text-muted-foreground"}`}
                  >
                    {fact?.value ?? "Not added"}
                  </p>
                  <PersonFactDialog
                    personId={dashboard.profile.id}
                    {...(fact ? { fact } : {})}
                    preset={field}
                    onChanged={onChanged}
                    trigger={
                      fact ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Edit ${field.label}`}
                        >
                          <PencilIcon />
                        </Button>
                      ) : (
                        <Button type="button" variant="ghost" size="sm">
                          <PlusIcon data-icon="inline-start" />
                          Add
                        </Button>
                      )
                    }
                  />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {customFacts.length > 0 ? (
        <Card className="bg-card/30">
          <CardHeader className="border-b">
            <CardTitle>Custom facts</CardTitle>
            <CardDescription>
              Personal fields that do not fit the common list.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {customFacts.map((fact) => (
                <div
                  key={fact.id}
                  className="grid min-h-16 grid-cols-[minmax(8rem,0.45fr)_1fr_auto] items-center gap-4 py-3"
                >
                  <p className="text-sm text-muted-foreground">{fact.label}</p>
                  <p className="min-w-0 whitespace-pre-wrap text-sm leading-relaxed">
                    {fact.value}
                  </p>
                  <div className="flex items-center gap-1">
                    <PersonFactDialog
                      personId={dashboard.profile.id}
                      fact={fact}
                      onChanged={onChanged}
                      trigger={
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Edit ${fact.label}`}
                        >
                          <PencilIcon />
                        </Button>
                      }
                    />
                    <RemovePersonItemButton
                      personId={dashboard.profile.id}
                      item={{ type: "fact", id: fact.id }}
                      title={fact.label}
                      onChanged={onChanged}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </section>
  );
}

type ImportantDateItem = {
  id: string;
  label: string;
  date: string;
  nextDate: string;
  source: string;
  annually: boolean;
  kind: "birthday" | "official" | "custom";
  customDate?: PersonalDate;
  recordStatus?: OfficialRecord["status"];
};

function buildImportantDates(dashboard: PersonDashboard) {
  const today = localDateKey();
  const items: ImportantDateItem[] = [];

  if (dashboard.profile.birthday) {
    items.push({
      id: "birthday",
      label: "Birthday",
      date: dashboard.profile.birthday,
      nextDate: nextAnnualOccurrence(dashboard.profile.birthday, today),
      source: "Overview",
      annually: true,
      kind: "birthday",
    });
  }

  for (const record of dashboard.officialRecords) {
    if (!record.expiryDate) continue;
    items.push({
      id: `record-${record.id}`,
      label: `${record.recordType} expiry`,
      date: record.expiryDate,
      nextDate: record.expiryDate,
      source: "Official information",
      annually: false,
      kind: "official",
      recordStatus: record.status,
    });
  }

  for (const date of dashboard.personalDates) {
    items.push({
      id: `custom-${date.id}`,
      label: date.label,
      date: date.occursOn,
      nextDate: date.recursAnnually
        ? nextAnnualOccurrence(date.occursOn, today)
        : date.occursOn,
      source: "Personal renewal",
      annually: date.recursAnnually,
      kind: "custom",
      customDate: date,
    });
  }

  return items.sort((left, right) =>
    left.nextDate.localeCompare(right.nextDate),
  );
}

function dateAttentionLabel(item: ImportantDateItem) {
  const today = localDateKey();
  const days = daysFromToday(item.nextDate, today);
  if (item.recordStatus === "expired") return "Expired";
  if (item.recordStatus === "needs_review") return "Needs review";
  if (days < 0) return item.kind === "official" ? "Expired" : "Passed";
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days <= 180) return `In ${days} days`;
  return null;
}

function ImportantDatesSection({
  dashboard,
  onChanged,
}: {
  dashboard: PersonDashboard;
  onChanged: () => Promise<void>;
}) {
  const dates = buildImportantDates(dashboard);

  return (
    <section aria-labelledby="dates-title" className="flex flex-col gap-5">
      <SectionHeading
        id="dates-title"
        title="Important dates"
        description="Birthdays, expiry dates, and personal renewals that may need attention. Dates already owned by the overview or official records appear automatically."
        action={
          <PersonalDateDialog
            personId={dashboard.profile.id}
            onChanged={onChanged}
          />
        }
      />
      {dates.length > 0 ? (
        <Card className="bg-card/30">
          <CardContent>
            <div className="divide-y">
              {dates.map((item) => {
                const attention = dateAttentionLabel(item);
                return (
                  <div
                    key={item.id}
                    className="grid min-h-20 gap-3 py-4 sm:grid-cols-[1fr_auto_auto] sm:items-center"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{item.label}</p>
                        {attention ? (
                          <Badge
                            variant={
                              attention === "Expired" || attention === "Passed"
                                ? "destructive"
                                : "outline"
                            }
                          >
                            {attention}
                          </Badge>
                        ) : null}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {item.source}
                        {item.annually ? " · repeats every year" : ""}
                      </p>
                    </div>
                    <p className="text-sm tabular-nums">
                      {formatDate(item.nextDate)}
                    </p>
                    {item.customDate ? (
                      <div className="flex items-center gap-1 sm:justify-self-end">
                        <PersonalDateDialog
                          personId={dashboard.profile.id}
                          date={item.customDate}
                          onChanged={onChanged}
                          trigger={
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`Edit ${item.label}`}
                            >
                              <PencilIcon />
                            </Button>
                          }
                        />
                        <RemovePersonItemButton
                          personId={dashboard.profile.id}
                          item={{ type: "date", id: item.customDate.id }}
                          title={item.label}
                          onChanged={onChanged}
                        />
                      </div>
                    ) : (
                      <span
                        className="hidden w-16 sm:block"
                        aria-hidden="true"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Empty className="min-h-64 rounded-2xl border bg-card/20">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CalendarClockIcon />
            </EmptyMedia>
            <EmptyTitle>No important dates yet</EmptyTitle>
            <EmptyDescription>
              Add a birthday, an official expiry date, or a personal renewal
              when there is something worth remembering.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <PersonalDateDialog
              personId={dashboard.profile.id}
              onChanged={onChanged}
            />
          </EmptyContent>
        </Empty>
      )}
    </section>
  );
}

export function MePage() {
  const { personId } = useParams<{ personId: string }>();
  const [dashboard, setDashboard] = useState<PersonDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setDashboard(
        await rpcClient.me.bootstrap({
          ...(personId ? { personId } : {}),
        }),
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "This personal profile could not be opened.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [personId]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  return (
    <main className="dark min-h-screen overflow-x-hidden bg-background text-foreground">
      <div className="mx-auto w-full max-w-[92rem] px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
        <AppHeader section="Profile" />

        {isLoading ? <PersonLoading /> : null}

        {!isLoading && error ? (
          <Alert variant="destructive" className="mt-12">
            <AlertTitle>This personal profile is unavailable</AlertTitle>
            <AlertDescription className="flex flex-col items-start gap-3">
              {error}
              <Button
                type="button"
                variant="outline"
                onClick={() => void loadDashboard()}
              >
                Try again
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}

        {!isLoading && !error && !dashboard ? (
          <Empty className="mt-12 min-h-[28rem] rounded-2xl border bg-card/20">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <UserRoundIcon />
              </EmptyMedia>
              <EmptyTitle>Create or join your Family first</EmptyTitle>
              <EmptyDescription>
                Personal spaces are household perspectives, so LifeOS needs a
                household before it can resolve a person.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button asChild>
                <Link to="/family">Open Family</Link>
              </Button>
            </EmptyContent>
          </Empty>
        ) : null}

        {!isLoading && dashboard ? (
          <div className="mt-10 flex flex-col gap-6 lg:mt-14">
            <PersonHero dashboard={dashboard} />

            <Tabs defaultValue="overview" className="min-w-0">
              <TabsList
                variant="line"
                className="max-w-full justify-start overflow-x-auto"
              >
                {tabItems.map((item) => (
                  <TabsTrigger key={item.value} value={item.value}>
                    {item.label}
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value="overview" className="pt-7">
                <OverviewSection
                  dashboard={dashboard}
                  onChanged={loadDashboard}
                />
              </TabsContent>

              <TabsContent value="official" className="pt-7">
                <OfficialInformationSection
                  dashboard={dashboard}
                  onChanged={loadDashboard}
                />
              </TabsContent>

              <TabsContent value="facts" className="pt-7">
                <UsefulFactsSection
                  dashboard={dashboard}
                  onChanged={loadDashboard}
                />
              </TabsContent>

              <TabsContent value="dates" className="pt-7">
                <ImportantDatesSection
                  dashboard={dashboard}
                  onChanged={loadDashboard}
                />
              </TabsContent>
            </Tabs>
          </div>
        ) : null}
      </div>
    </main>
  );
}
