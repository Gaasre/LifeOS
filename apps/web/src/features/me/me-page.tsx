import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  BadgeCheckIcon,
  BellRingIcon,
  BookmarkIcon,
  BookUserIcon,
  CakeIcon,
  CalendarClockIcon,
  CalendarDaysIcon,
  CarFrontIcon,
  CommandIcon,
  FileBadgeIcon,
  FileTextIcon,
  Globe2Icon,
  HeartIcon,
  HeartPulseIcon,
  IdCardIcon,
  LanguagesIcon,
  LandmarkIcon,
  MapPinIcon,
  PencilIcon,
  PlusIcon,
  Repeat2Icon,
  ShieldCheckIcon,
  SparklesIcon,
  StampIcon,
  TagIcon,
  UserRoundIcon,
  type LucideIcon,
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
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@lifeos/ui/components/command";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@lifeos/ui/components/empty";
import { Kbd } from "@lifeos/ui/components/kbd";
import { Separator } from "@lifeos/ui/components/separator";
import { Skeleton } from "@lifeos/ui/components/skeleton";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@lifeos/ui/components/tabs";
import { cn } from "@lifeos/ui/lib/utils";

import { AppHeader } from "@/components/app-header";
import {
  usefulFactFields,
  type UsefulFactField,
} from "@/features/me/me-config";
import {
  OfficialRecordDialog,
  PersonalDateDialog,
  PersonFactDialog,
  PersonProfileDialog,
  RemovePersonItemButton,
} from "@/features/me/me-dialogs";
import { rpcClient } from "@/lib/rpc-client";

const tabItems = [
  {
    value: "overview",
    label: "Overview",
    shortLabel: "Overview",
    icon: UserRoundIcon,
  },
  {
    value: "official",
    label: "IDs & records",
    shortLabel: "IDs",
    icon: IdCardIcon,
  },
  {
    value: "facts",
    label: "Useful facts",
    shortLabel: "Facts",
    icon: SparklesIcon,
  },
  {
    value: "dates",
    label: "Dates",
    shortLabel: "Dates",
    icon: CalendarDaysIcon,
  },
] as const;

type MeTab = (typeof tabItems)[number]["value"];
type MeEditor = "profile" | "record" | "fact" | "date";
type UsefulFactKey = UsefulFactField["key"];

const factGroups = [
  {
    id: "fit",
    title: "Fit & style",
    description: "The sizing details that make shopping simpler.",
    image: "/images/me/fit-shelf-v4.png",
    imagePosition: "object-center",
    keys: [
      "height",
      "ring_size",
      "clothing_size",
      "shoe_size",
      "style_preferences",
    ] satisfies UsefulFactKey[],
  },
  {
    id: "travel",
    title: "Travel defaults",
    description: "The choices you make before every trip.",
    image: "/images/me/travel-shelf-v4.png",
    imagePosition: "object-center",
    keys: [
      "home_airport",
      "preferred_currency",
      "travel_preferences",
    ] satisfies UsefulFactKey[],
  },
  {
    id: "everyday",
    title: "Food & language",
    description: "Preferences that help everyday plans feel personal.",
    image: "/images/me/everyday-shelf-v3.png",
    imagePosition: "object-center",
    keys: ["food_restrictions", "preferred_language"] satisfies UsefulFactKey[],
  },
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

function formatDateParts(value: string) {
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) {
    return { month: "Date", day: "—", year: value };
  }

  return {
    month: new Intl.DateTimeFormat(undefined, {
      month: "short",
      timeZone: "UTC",
    }).format(date),
    day: new Intl.DateTimeFormat(undefined, {
      day: "numeric",
      timeZone: "UTC",
    }).format(date),
    year: new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      timeZone: "UTC",
    }).format(date),
  };
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
    <div className="mt-6 flex flex-col gap-6">
      <Skeleton className="h-14 w-full rounded-none" />
      <Skeleton className="h-[46rem] rounded-2xl" />
    </div>
  );
}

function SectionHeading({
  id,
  icon: Icon,
  title,
  description,
  action,
}: {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex min-w-0 items-start gap-3">
        <Badge
          variant="secondary"
          className="mt-0.5 size-10 rounded-xl p-0"
          aria-hidden="true"
        >
          <Icon />
        </Badge>
        <div className="min-w-0">
          <h2 id={id} className="font-heading text-3xl">
            {title}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
      {action}
    </div>
  );
}

function OverviewHero({
  dashboard,
  onEdit,
}: {
  dashboard: PersonDashboard;
  onEdit: () => void;
}) {
  const { profile } = dashboard;

  return (
    <header
      className="relative isolate min-h-[17rem] overflow-hidden border-b border-border/70 bg-card/20 sm:min-h-[14rem]"
      aria-labelledby="person-name"
    >
      <img
        src="/images/me/profile-horizon-v1.jpg"
        alt=""
        className="absolute inset-y-0 right-[4%] h-full w-auto max-w-none object-contain opacity-45 sm:opacity-70"
        aria-hidden="true"
      />
      <div className="relative z-10 flex min-h-[17rem] flex-col justify-center gap-5 px-6 py-8 sm:min-h-[14rem] sm:flex-row sm:items-center sm:justify-start sm:gap-9 sm:px-8 lg:px-9">
        <Avatar className="size-24 shrink-0 rounded-2xl border border-money-accent/70 bg-background/80 ring-1 ring-money-accent/15 sm:size-32">
          <AvatarImage
            src={profile.avatarUrl ?? undefined}
            alt={profile.preferredName}
            className="rounded-2xl object-cover"
          />
          <AvatarFallback className="rounded-2xl bg-background/70 font-heading text-4xl text-money-accent sm:text-5xl">
            {initials(profile.preferredName)}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 max-w-xl">
          <h1
            id="person-name"
            className="text-balance font-heading text-[clamp(2.25rem,4vw,3rem)] leading-[1.02] font-medium tracking-[-0.025em]"
          >
            {profile.preferredName}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-foreground/65 sm:text-base">
            Your personal details, ready when you need them.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-4 border-money-accent/45 bg-background/55 hover:bg-money-accent/10"
            onClick={onEdit}
          >
            <PencilIcon
              className="text-money-accent"
              data-icon="inline-start"
            />
            Edit profile
          </Button>
        </div>
      </div>
    </header>
  );
}

function formatTimelineDate(value: string) {
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function ProfileDetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string | null | undefined;
}) {
  const hasValue = Boolean(value?.trim());

  return (
    <div className="grid min-h-14 grid-cols-[1.75rem_minmax(0,1fr)_auto] items-center gap-3 py-2.5">
      <Icon className="size-[1.15rem] text-foreground/85" aria-hidden="true" />
      <dt className="min-w-0 truncate text-sm text-muted-foreground sm:text-base">
        {label}
      </dt>
      <dd
        className={cn(
          "max-w-64 truncate text-right text-sm font-medium sm:text-base",
          !hasValue && "text-money-accent",
        )}
        title={hasValue ? (value ?? undefined) : undefined}
      >
        {hasValue ? value : "Add"}
      </dd>
    </div>
  );
}

const overviewQuickFacts = [
  { key: "shoe_size", label: "Shoes" },
  { key: "clothing_size", label: "Clothing" },
  { key: "ring_size", label: "Ring size" },
  { key: "preferred_currency", label: "Currency" },
  { key: "home_airport", label: "Home airport" },
  { key: "food_restrictions", label: "Food restrictions" },
] satisfies Array<{ key: UsefulFactKey; label: string }>;

function QuickReferenceRow({
  item,
  fact,
  personId,
  onChanged,
}: {
  item: (typeof overviewQuickFacts)[number];
  fact: PersonFact | undefined;
  personId: string;
  onChanged: () => Promise<void>;
}) {
  const preset = usefulFactFields.find((field) => field.key === item.key);
  if (!preset) return null;
  const Icon = preset.icon;

  return (
    <div className="grid min-h-14 grid-cols-[1.75rem_minmax(0,1fr)_auto] items-center gap-3 py-2.5">
      <Icon className="size-[1.15rem] text-foreground/85" aria-hidden="true" />
      <span className="min-w-0 truncate text-sm text-muted-foreground sm:text-base">
        {item.label}
      </span>
      <PersonFactDialog
        personId={personId}
        {...(fact ? { fact } : {})}
        preset={preset}
        onChanged={onChanged}
        trigger={
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              "h-9 max-w-64 justify-end px-2 text-sm font-medium sm:text-base",
              !fact && "text-money-accent hover:text-money-accent",
            )}
            title={fact ? `Edit ${preset.label}` : `Add ${preset.label}`}
          >
            <span className="truncate">{fact?.value ?? "Add"}</span>
          </Button>
        }
      />
    </div>
  );
}

function OverviewNextUp({
  dashboard,
  onChanged,
  onAdd,
}: {
  dashboard: PersonDashboard;
  onChanged: () => Promise<void>;
  onAdd: () => void;
}) {
  const item = buildImportantDates(dashboard)[0];
  const DateIcon = item ? dateVisual(item).icon : CalendarDaysIcon;
  const attention = item ? dateAttentionLabel(item) : null;

  const itemSummary = item ? (
    <div className="grid min-w-0 flex-1 gap-1 sm:grid-cols-[minmax(8rem,1fr)_minmax(7rem,0.8fr)_minmax(6rem,0.7fr)] sm:items-center sm:gap-5">
      <div className="flex min-w-0 items-center gap-3">
        <DateIcon className="size-4 shrink-0 text-money-accent" />
        <span className="truncate font-medium">{item.label}</span>
      </div>
      <time
        dateTime={item.nextDate}
        className="truncate text-sm text-foreground/85 sm:text-base"
      >
        {formatTimelineDate(item.nextDate)}
      </time>
      <span className="truncate text-sm text-muted-foreground sm:text-base">
        {attention ?? (item.annually ? "Every year" : item.source)}
      </span>
    </div>
  ) : (
    <div className="min-w-0 flex-1">
      <p className="font-medium">No dates yet</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Add birthdays, expiries, and reminders when they become useful.
      </p>
    </div>
  );

  return (
    <div className="grid min-h-28 gap-5 border-t border-border/70 px-6 py-5 sm:px-8 md:grid-cols-[minmax(12rem,0.8fr)_minmax(0,2fr)_auto] md:items-center lg:px-9">
      <div className="flex min-w-0 items-center gap-4">
        <Badge
          variant="outline"
          className="size-10 shrink-0 rounded-lg border-money-accent/55 bg-background/40 p-0 text-money-accent"
          aria-hidden="true"
        >
          <CalendarDaysIcon />
        </Badge>
        <div className="min-w-0">
          <h3 className="font-heading text-lg">Next up</h3>
          <p className="mt-0.5 truncate text-xs text-muted-foreground sm:text-sm">
            Keep your details up to date.
          </p>
        </div>
      </div>

      {item?.customDate ? (
        <PersonalDateDialog
          personId={dashboard.profile.id}
          date={item.customDate}
          onChanged={onChanged}
          trigger={
            <Button
              type="button"
              variant="ghost"
              className="h-auto min-w-0 justify-start px-0 py-2 text-left hover:bg-transparent"
              aria-label={`Edit ${item.label}`}
            >
              {itemSummary}
            </Button>
          }
        />
      ) : (
        <div className="flex min-w-0">{itemSummary}</div>
      )}

      <Button
        type="button"
        variant="ghost"
        className="justify-self-start text-money-accent hover:text-money-accent md:justify-self-end"
        onClick={onAdd}
      >
        <PlusIcon data-icon="inline-start" />
        Add date
      </Button>
    </div>
  );
}

function OverviewSection({
  dashboard,
  onEdit,
  onChanged,
  onAddDate,
}: {
  dashboard: PersonDashboard;
  onEdit: () => void;
  onChanged: () => Promise<void>;
  onAddDate: () => void;
}) {
  const { presetFacts } = findUsefulFacts(dashboard.facts);
  const { profile } = dashboard;
  const aboutRows = [
    { icon: IdCardIcon, label: "Legal name", value: profile.legalName },
    {
      icon: UserRoundIcon,
      label: "Preferred name",
      value: profile.preferredName,
    },
    { icon: MapPinIcon, label: "Home base", value: profile.currentCity },
    {
      icon: LanguagesIcon,
      label: "Languages",
      value:
        profile.languages.length > 0 ? profile.languages.join(" · ") : null,
    },
    {
      icon: CakeIcon,
      label: "Birthday",
      value: profile.birthday ? formatDate(profile.birthday) : null,
    },
  ] satisfies Array<{
    icon: LucideIcon;
    label: string;
    value: string | null | undefined;
  }>;

  return (
    <section
      aria-labelledby="overview-title"
      className="my-5 w-full overflow-hidden rounded-2xl border border-border/70 bg-card/15 shadow-[0_24px_80px_-64px_rgb(0_0_0_/_0.95)]"
    >
      <h2 id="overview-title" className="sr-only">
        Overview
      </h2>

      <OverviewHero dashboard={dashboard} onEdit={onEdit} />

      <div className="grid gap-10 px-6 py-7 sm:px-8 md:grid-cols-2 md:gap-14 lg:px-9 lg:py-8 xl:gap-20">
        <div className="min-w-0">
          <div className="mb-3 flex items-center gap-3">
            <UserRoundIcon className="size-5" aria-hidden="true" />
            <h3 className="font-heading text-xl">About you</h3>
          </div>
          <dl className="divide-y divide-border/70">
            {aboutRows.map((row) => (
              <ProfileDetailRow key={row.label} {...row} />
            ))}
          </dl>
        </div>

        <div className="min-w-0">
          <div className="mb-3 flex items-center gap-3">
            <BookmarkIcon className="size-5" aria-hidden="true" />
            <h3 className="font-heading text-xl">Quick reference</h3>
          </div>
          <div className="divide-y divide-border/70">
            {overviewQuickFacts.map((item) => (
              <QuickReferenceRow
                key={item.key}
                item={item}
                fact={presetFacts.get(item.key)}
                personId={profile.id}
                onChanged={onChanged}
              />
            ))}
          </div>
        </div>
      </div>

      <OverviewNextUp
        dashboard={dashboard}
        onChanged={onChanged}
        onAdd={onAddDate}
      />
    </section>
  );
}

function recordStatusLabel(record: OfficialRecord) {
  if (record.status === "needs_review") return "Needs review";
  if (record.status === "expired") return "Expired";
  return "Current";
}

function recordStatusIcon(record: OfficialRecord) {
  if (record.status === "needs_review") return BellRingIcon;
  if (record.status === "expired") return CalendarClockIcon;
  return BadgeCheckIcon;
}

function recordTypeIcon(recordType: string): LucideIcon {
  const type = recordType.toLocaleLowerCase();
  if (type.includes("passport")) return BookUserIcon;
  if (type.includes("driver") || type.includes("licence")) return CarFrontIcon;
  if (type.includes("health") || type.includes("insurance")) {
    return HeartPulseIcon;
  }
  if (type.includes("tax")) return LandmarkIcon;
  if (type.includes("residence") || type.includes("consular")) {
    return StampIcon;
  }
  if (type.includes("social security")) return ShieldCheckIcon;
  if (type.includes("id")) return IdCardIcon;
  return FileBadgeIcon;
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
  const RecordIcon = recordTypeIcon(record.recordType);
  const StatusIcon = recordStatusIcon(record);

  return (
    <Card className="min-h-80 bg-card/45">
      <CardHeader className="relative isolate min-h-32 justify-end overflow-hidden pt-14">
        <img
          src="/images/documents.jpg"
          alt=""
          className="absolute inset-0 size-full object-cover object-[70%_center] opacity-70"
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/85 to-card/20" />
        <div className="relative flex min-w-0 items-center gap-3">
          <Badge
            variant="secondary"
            className="size-11 rounded-xl p-0 backdrop-blur-md"
            aria-hidden="true"
          >
            <RecordIcon />
          </Badge>
          <div className="min-w-0">
            <CardTitle className="truncate text-xl">
              {record.recordType}
            </CardTitle>
            <CardDescription className="truncate">
              {record.title !== record.recordType
                ? record.title
                : "Official record"}
            </CardDescription>
          </div>
        </div>
        <CardAction className="relative flex items-center gap-1">
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

      <CardContent className="flex flex-1 flex-col gap-5">
        <div className="flex flex-wrap gap-2">
          <Badge
            variant={record.status === "expired" ? "destructive" : "outline"}
          >
            <StatusIcon data-icon="inline-start" />
            {recordStatusLabel(record)}
          </Badge>
          {record.country ? (
            <Badge variant="outline">
              <Globe2Icon data-icon="inline-start" />
              {record.country}
            </Badge>
          ) : null}
          {record.issuingAuthority ? (
            <Badge variant="outline">
              <LandmarkIcon data-icon="inline-start" />
              {record.issuingAuthority}
            </Badge>
          ) : null}
        </div>

        <div className="rounded-xl border bg-background/25 p-4">
          <p className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
            Document number
          </p>
          <p
            className={cn(
              "mt-2 break-all font-mono text-lg leading-relaxed",
              !record.identifier && "text-muted-foreground",
            )}
          >
            {record.identifier ?? "No identifier added"}
          </p>
        </div>

        {record.issueDate || record.expiryDate ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {record.issueDate ? (
              <div className="flex items-center gap-3 rounded-xl bg-muted/45 p-3">
                <CalendarDaysIcon
                  className="size-5 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                <div>
                  <p className="text-xs text-muted-foreground">Issued</p>
                  <p className="mt-0.5 font-medium tabular-nums">
                    {formatDate(record.issueDate)}
                  </p>
                </div>
              </div>
            ) : null}
            {record.expiryDate ? (
              <div className="flex items-center gap-3 rounded-xl bg-muted/45 p-3">
                <CalendarClockIcon
                  className="size-5 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                <div>
                  <p className="text-xs text-muted-foreground">Expires</p>
                  <p className="mt-0.5 font-medium tabular-nums">
                    {formatDate(record.expiryDate)}
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {sourceDocument || record.sourceDocumentId ? <Separator /> : null}

        {sourceDocument ? (
          <div className="mt-auto">
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
          <p className="text-xs text-muted-foreground">
            The linked source document is unavailable.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ImageEmptyState({
  image,
  imagePosition = "object-center",
  icon: Icon,
  title,
  description,
  action,
}: {
  image: string;
  imagePosition?: string;
  icon: LucideIcon;
  title: string;
  description: string;
  action: ReactNode;
}) {
  return (
    <Empty className="relative isolate min-h-72 overflow-hidden rounded-2xl border bg-card/20">
      <img
        src={image}
        alt=""
        className={cn(
          "absolute inset-0 size-full object-cover opacity-65",
          imagePosition,
        )}
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-card/98 via-card/90 to-card/35" />
      <EmptyHeader className="relative">
        <EmptyMedia variant="icon">
          <Icon />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent className="relative">{action}</EmptyContent>
    </Empty>
  );
}

function OfficialInformationSection({
  dashboard,
  onChanged,
  onAdd,
}: {
  dashboard: PersonDashboard;
  onChanged: () => Promise<void>;
  onAdd: () => void;
}) {
  return (
    <section aria-labelledby="official-title" className="flex flex-col gap-6">
      <SectionHeading
        id="official-title"
        icon={IdCardIcon}
        title="IDs & official records"
        description="The documents and identifiers worth finding quickly. Original files remain in Documents."
        action={
          <Button type="button" variant="outline" size="sm" onClick={onAdd}>
            <PlusIcon data-icon="inline-start" />
            Add record
          </Button>
        }
      />
      {dashboard.officialRecords.length > 0 ? (
        <div className="grid gap-4 xl:grid-cols-2">
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
        <ImageEmptyState
          image="/images/documents.jpg"
          imagePosition="object-[72%_center]"
          icon={IdCardIcon}
          title="No official records yet"
          description="Add a passport, national ID, permit, tax identifier, insurance number, or licence when it becomes useful."
          action={
            <Button type="button" onClick={onAdd}>
              <PlusIcon data-icon="inline-start" />
              Add first record
            </Button>
          }
        />
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

function FactGroupCard({
  group,
  presetFacts,
  personId,
  onChanged,
}: {
  group: (typeof factGroups)[number];
  presetFacts: Map<string, PersonFact>;
  personId: string;
  onChanged: () => Promise<void>;
}) {
  const fields = usefulFactFields.filter((field) =>
    (group.keys as readonly UsefulFactKey[]).includes(field.key),
  );
  const saved = fields.flatMap((field) => {
    const fact = presetFacts.get(field.key);
    return fact ? [{ field, fact }] : [];
  });
  const missing = fields.filter((field) => !presetFacts.has(field.key));

  return (
    <Card size="sm" className="self-start bg-card/40">
      <img
        src={group.image}
        alt=""
        className={cn(
          "aspect-[15/4] w-full object-cover opacity-90",
          group.imagePosition,
        )}
        aria-hidden="true"
      />
      <CardHeader>
        <CardTitle className="text-lg group-data-[size=sm]/card:text-base">
          {group.title}
        </CardTitle>
        <CardDescription className="text-xs leading-relaxed">
          {group.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {saved.length > 0 ? (
          <div className="flex flex-col gap-4">
            {saved.map(({ field, fact }) => {
              const Icon = field.icon;
              return (
                <div key={field.key} className="flex items-start gap-3">
                  <Badge
                    variant="secondary"
                    className="size-9 rounded-xl p-0"
                    aria-hidden="true"
                  >
                    <Icon />
                  </Badge>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground">
                      {field.label}
                    </p>
                    <p className="mt-1 leading-relaxed font-medium whitespace-pre-wrap">
                      {fact.value}
                    </p>
                  </div>
                  <PersonFactDialog
                    personId={personId}
                    fact={fact}
                    preset={field}
                    onChanged={onChanged}
                    trigger={
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Edit ${field.label}`}
                      >
                        <PencilIcon />
                      </Button>
                    }
                  />
                </div>
              );
            })}
          </div>
        ) : null}

        {missing.length > 0 ? (
          <div className="flex flex-col gap-2">
            {saved.length > 0 ? <Separator /> : null}
            <p className="text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
              Quick add
            </p>
            <div className="flex flex-wrap gap-2">
              {missing.map((field) => {
                const Icon = field.icon;
                return (
                  <PersonFactDialog
                    key={field.key}
                    personId={personId}
                    preset={field}
                    onChanged={onChanged}
                    trigger={
                      <Button type="button" variant="outline" size="sm">
                        <Icon data-icon="inline-start" />
                        {field.label}
                      </Button>
                    }
                  />
                );
              })}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function CustomFactCard({
  fact,
  personId,
  onChanged,
}: {
  fact: PersonFact;
  personId: string;
  onChanged: () => Promise<void>;
}) {
  return (
    <Card size="sm" className="min-h-32 bg-card/40">
      <CardHeader>
        <Badge
          variant="secondary"
          className="mb-2 size-9 rounded-xl p-0"
          aria-hidden="true"
        >
          <TagIcon />
        </Badge>
        <CardTitle>{fact.label}</CardTitle>
        <CardAction className="flex items-center gap-1">
          <PersonFactDialog
            personId={personId}
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
            personId={personId}
            item={{ type: "fact", id: fact.id }}
            title={fact.label}
            onChanged={onChanged}
          />
        </CardAction>
      </CardHeader>
      <CardContent className="mt-auto">
        <p className="text-base leading-relaxed font-medium whitespace-pre-wrap">
          {fact.value}
        </p>
      </CardContent>
    </Card>
  );
}

function UsefulFactsSection({
  dashboard,
  onChanged,
  onAdd,
}: {
  dashboard: PersonDashboard;
  onChanged: () => Promise<void>;
  onAdd: () => void;
}) {
  const { presetFacts, customFacts } = findUsefulFacts(dashboard.facts);

  return (
    <section aria-labelledby="facts-title" className="flex flex-col gap-6">
      <SectionHeading
        id="facts-title"
        icon={SparklesIcon}
        title="The small things that make life easier"
        description="Useful details grouped by the moment they matter, with quick add choices instead of ten empty cards."
        action={
          <Button type="button" variant="outline" size="sm" onClick={onAdd}>
            <PlusIcon data-icon="inline-start" />
            Add custom fact
          </Button>
        }
      />

      <div className="grid grid-cols-[minmax(0,22rem)] justify-center gap-4 sm:grid-cols-[repeat(2,minmax(0,22rem))] lg:grid-cols-[repeat(3,minmax(0,22rem))]">
        {factGroups.map((group) => (
          <FactGroupCard
            key={group.id}
            group={group}
            presetFacts={presetFacts}
            personId={dashboard.profile.id}
            onChanged={onChanged}
          />
        ))}
      </div>

      {customFacts.length > 0 ? (
        <div className="flex flex-col gap-4">
          <div>
            <h3 className="font-heading text-xl">
              {dashboard.profile.isCurrentUser
                ? "Your own shortcuts"
                : "Personal shortcuts"}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Details that do not belong to a standard group.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {customFacts.map((fact) => (
              <CustomFactCard
                key={fact.id}
                fact={fact}
                personId={dashboard.profile.id}
                onChanged={onChanged}
              />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

type ImportantDateItem = {
  id: string;
  label: string;
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
      nextDate: date.recursAnnually
        ? nextAnnualOccurrence(date.occursOn, today)
        : date.occursOn,
      source: "Personal reminder",
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

function dateVisual(item: ImportantDateItem): {
  icon: LucideIcon;
  label: string;
  image: string;
  imagePosition: string;
} {
  if (item.kind === "birthday") {
    return {
      icon: CakeIcon,
      label: "Birthday",
      image: "/images/memories.jpg",
      imagePosition: "object-[65%_center]",
    };
  }
  if (item.kind === "official") {
    return {
      icon: IdCardIcon,
      label: "Official expiry",
      image: "/images/documents.jpg",
      imagePosition: "object-[70%_center]",
    };
  }
  return {
    icon: BellRingIcon,
    label: "Personal reminder",
    image: "/images/me/editorial-cover-v3.jpg",
    imagePosition: "object-[70%_center]",
  };
}

function ImportantDateCard({
  dashboard,
  item,
  onChanged,
}: {
  dashboard: PersonDashboard;
  item: ImportantDateItem;
  onChanged: () => Promise<void>;
}) {
  const attention = dateAttentionLabel(item);
  const parts = formatDateParts(item.nextDate);
  const visual = dateVisual(item);
  const DateIcon = visual.icon;

  return (
    <Card className="min-h-56 bg-card/45">
      <CardHeader className="relative isolate min-h-36 justify-end overflow-hidden pt-16">
        <img
          src={visual.image}
          alt=""
          className={cn(
            "absolute inset-0 size-full object-cover opacity-70",
            visual.imagePosition,
          )}
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/80 to-card/10" />
        <div className="relative flex min-w-0 items-center gap-4">
          <time
            dateTime={item.nextDate}
            className="flex size-16 shrink-0 flex-col items-center justify-center rounded-xl border bg-background/70 text-center backdrop-blur-md"
          >
            <span className="text-[0.65rem] leading-none font-medium tracking-[0.14em] text-muted-foreground uppercase">
              {parts.month}
            </span>
            <span className="mt-1 font-heading text-2xl leading-none">
              {parts.day}
            </span>
          </time>
          <div className="min-w-0">
            <CardTitle className="text-lg">{item.label}</CardTitle>
            <CardDescription className="mt-1">
              {parts.year} · {item.source}
            </CardDescription>
          </div>
        </div>
        {item.customDate ? (
          <CardAction className="relative flex items-center gap-1">
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
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent className="mt-auto flex flex-wrap gap-2">
        <Badge variant="secondary">
          <DateIcon data-icon="inline-start" />
          {visual.label}
        </Badge>
        {item.annually ? (
          <Badge variant="outline">
            <Repeat2Icon data-icon="inline-start" />
            Every year
          </Badge>
        ) : null}
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
      </CardContent>
    </Card>
  );
}

function ImportantDatesSection({
  dashboard,
  onChanged,
  onAdd,
}: {
  dashboard: PersonDashboard;
  onChanged: () => Promise<void>;
  onAdd: () => void;
}) {
  const dates = buildImportantDates(dashboard);

  return (
    <section aria-labelledby="dates-title" className="flex flex-col gap-6">
      <SectionHeading
        id="dates-title"
        icon={CalendarDaysIcon}
        title="Important dates"
        description="Birthdays, expiries, and personal reminders ordered by what comes next."
        action={
          <Button type="button" variant="outline" size="sm" onClick={onAdd}>
            <PlusIcon data-icon="inline-start" />
            Add date
          </Button>
        }
      />
      {dates.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {dates.map((item) => (
            <ImportantDateCard
              key={item.id}
              dashboard={dashboard}
              item={item}
              onChanged={onChanged}
            />
          ))}
        </div>
      ) : (
        <ImageEmptyState
          image="/images/memories.jpg"
          imagePosition="object-[65%_center]"
          icon={CalendarClockIcon}
          title="No important dates yet"
          description="Add a personal reminder, or let birthdays and official expiries appear here automatically."
          action={
            <Button type="button" onClick={onAdd}>
              <PlusIcon data-icon="inline-start" />
              Add first date
            </Button>
          }
        />
      )}
    </section>
  );
}

function MeCommandPalette({
  open,
  onOpenChange,
  onEdit,
  onNavigate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (editor: MeEditor) => void;
  onNavigate: (tab: MeTab) => void;
}) {
  function run(action: () => void) {
    onOpenChange(false);
    window.requestAnimationFrame(action);
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Profile actions"
      description="Edit this profile, add information, or move to a section."
      className="sm:max-w-lg"
      showCloseButton
    >
      <Command>
        <CommandInput placeholder="Find a profile action…" />
        <CommandList>
          <CommandEmpty>No matching profile action.</CommandEmpty>
          <CommandGroup heading="Profile">
            <CommandItem onSelect={() => run(() => onEdit("profile"))}>
              <PencilIcon />
              Edit profile
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Add">
            <CommandItem onSelect={() => run(() => onEdit("record"))}>
              <IdCardIcon />
              Official record
            </CommandItem>
            <CommandItem onSelect={() => run(() => onEdit("fact"))}>
              <SparklesIcon />
              Useful fact
            </CommandItem>
            <CommandItem onSelect={() => run(() => onEdit("date"))}>
              <CalendarDaysIcon />
              Important date
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Go to">
            {tabItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <CommandItem
                  key={item.value}
                  onSelect={() => run(() => onNavigate(item.value))}
                >
                  <Icon />
                  {item.label}
                  <CommandShortcut>{index + 1}</CommandShortcut>
                </CommandItem>
              );
            })}
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  );
}

export function MePage() {
  const { personId } = useParams<{ personId: string }>();
  const [dashboard, setDashboard] = useState<PersonDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<MeTab>("overview");
  const [editor, setEditor] = useState<MeEditor | null>(null);
  const [commandOpen, setCommandOpen] = useState(false);

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

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen((open) => !open);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  function navigateToTab(tab: MeTab) {
    setActiveTab(tab);
    window.requestAnimationFrame(() => {
      document.getElementById("me-content")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }

  return (
    <main className="dark min-h-screen overflow-x-hidden bg-background text-foreground">
      <div className="mx-auto w-full max-w-[92rem] px-4 py-6 sm:px-6 lg:px-8 lg:py-6">
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
          <div className="mt-5 flex flex-col lg:mt-6">
            <Tabs
              value={activeTab}
              onValueChange={(value) => setActiveTab(value as MeTab)}
              className="min-w-0"
            >
              <div className="border-b border-border/70">
                <TabsList
                  variant="line"
                  className="grid w-full grid-cols-4 gap-0 p-0 group-data-horizontal/tabs:h-14 sm:flex sm:w-fit sm:justify-start sm:gap-8"
                >
                  {tabItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <TabsTrigger
                        key={item.value}
                        value={item.value}
                        className="h-14 min-w-0 overflow-hidden px-1 text-[0.68rem] font-normal group-data-horizontal/tabs:after:bottom-0 sm:flex-none sm:px-0 sm:text-sm"
                      >
                        <Icon data-icon="inline-start" />
                        <span className="truncate sm:hidden">
                          {item.shortLabel}
                        </span>
                        <span className="hidden sm:inline">{item.label}</span>
                      </TabsTrigger>
                    );
                  })}
                </TabsList>
              </div>

              <div id="me-content" className="scroll-mt-6">
                <TabsContent value="overview">
                  <OverviewSection
                    dashboard={dashboard}
                    onEdit={() => setEditor("profile")}
                    onChanged={loadDashboard}
                    onAddDate={() => setEditor("date")}
                  />
                </TabsContent>

                <TabsContent value="official" className="pt-8">
                  <OfficialInformationSection
                    dashboard={dashboard}
                    onChanged={loadDashboard}
                    onAdd={() => setEditor("record")}
                  />
                </TabsContent>

                <TabsContent value="facts" className="pt-8">
                  <UsefulFactsSection
                    dashboard={dashboard}
                    onChanged={loadDashboard}
                    onAdd={() => setEditor("fact")}
                  />
                </TabsContent>

                <TabsContent value="dates" className="pt-8">
                  <ImportantDatesSection
                    dashboard={dashboard}
                    onChanged={loadDashboard}
                    onAdd={() => setEditor("date")}
                  />
                </TabsContent>
              </div>
            </Tabs>
          </div>
        ) : null}
      </div>

      {!isLoading && !error && dashboard ? (
        <>
          <div className="fixed right-4 bottom-4 z-40 sm:right-6 sm:bottom-6">
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="rounded-full border-money-accent/30 bg-card/90 shadow-lg backdrop-blur-md"
              onClick={() => setCommandOpen(true)}
            >
              <CommandIcon data-icon="inline-start" />
              Actions
              <Kbd className="ml-1 hidden sm:inline-flex">⌘ K</Kbd>
            </Button>
          </div>

          <MeCommandPalette
            open={commandOpen}
            onOpenChange={setCommandOpen}
            onEdit={setEditor}
            onNavigate={navigateToTab}
          />

          {editor === "profile" ? (
            <PersonProfileDialog
              profile={dashboard.profile}
              onChanged={loadDashboard}
              open
              onOpenChange={(open) => setEditor(open ? "profile" : null)}
              hideTrigger
            />
          ) : null}
          {editor === "record" ? (
            <OfficialRecordDialog
              personId={dashboard.profile.id}
              sourceDocuments={dashboard.sourceDocuments}
              onChanged={loadDashboard}
              open
              onOpenChange={(open) => setEditor(open ? "record" : null)}
              hideTrigger
            />
          ) : null}
          {editor === "fact" ? (
            <PersonFactDialog
              personId={dashboard.profile.id}
              onChanged={loadDashboard}
              open
              onOpenChange={(open) => setEditor(open ? "fact" : null)}
              hideTrigger
            />
          ) : null}
          {editor === "date" ? (
            <PersonalDateDialog
              personId={dashboard.profile.id}
              onChanged={loadDashboard}
              open
              onOpenChange={(open) => setEditor(open ? "date" : null)}
              hideTrigger
            />
          ) : null}
        </>
      ) : null}
    </main>
  );
}
