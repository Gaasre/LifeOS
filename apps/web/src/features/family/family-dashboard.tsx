import {
  useEffect,
  useMemo,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import {
  ArrowRightIcon,
  CalendarDaysIcon,
  CalendarHeartIcon,
  CheckCircle2Icon,
  CircleDollarSignIcon,
  CommandIcon,
  FileClockIcon,
  FileTextIcon,
  FolderKanbanIcon,
  HeartHandshakeIcon,
  MailPlusIcon,
  ShieldAlertIcon,
  UsersRoundIcon,
} from "lucide-react";
import {
  AnimatePresence,
  motion,
  type Transition,
  type Variants,
} from "motion/react";
import { Link } from "react-router-dom";

import type {
  FamilyDashboard,
  FamilyMoment,
  FamilyProjectSummary,
  PersonSummary,
} from "@lifeos/rpc";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@lifeos/ui/components/avatar";
import { Badge } from "@lifeos/ui/components/badge";
import { Button } from "@lifeos/ui/components/button";
import { Kbd } from "@lifeos/ui/components/kbd";
import { Progress } from "@lifeos/ui/components/progress";
import { cn } from "@lifeos/ui/lib/utils";

import { FamilyActions } from "@/features/family/family-actions";

const MotionLink = motion.create(Link);

const familyEase = [0.22, 1, 0.36, 1] as const;
const familySpring: Transition = {
  type: "spring",
  stiffness: 310,
  damping: 28,
  mass: 0.78,
};

const pageVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.28, ease: familyEase },
  },
};

const sectionVariants: Variants = {
  hidden: {},
  visible: {
    transition: { delayChildren: 0.04, staggerChildren: 0.065 },
  },
};

const riseVariants: Variants = {
  hidden: { opacity: 0, y: 14, scale: 0.992 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.42, ease: familyEase },
  },
};

type Chapter = "attention" | "upcoming" | "together";

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

function shiftDateKey(value: string, days: number) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function dateFromKey(value: string) {
  return new Date(`${value}T12:00:00`);
}

function formatDate(value: string | null, options?: { weekday?: boolean }) {
  if (!value) return "Review now";
  return new Intl.DateTimeFormat(undefined, {
    weekday: options?.weekday ? "short" : undefined,
    day: "numeric",
    month: "short",
  }).format(dateFromKey(value));
}

function formatMoney(amountMinor: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amountMinor / 100);
  } catch {
    return `${(amountMinor / 100).toFixed(0)} ${currency}`;
  }
}

function humanize(value: string) {
  const text = value.replaceAll("_", " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function momentDetail(moment: FamilyMoment) {
  const detail = moment.detail ? humanize(moment.detail) : null;
  if (moment.amountMinor !== null && moment.currency) {
    const money = formatMoney(moment.amountMinor, moment.currency);
    return detail ? `${detail} · ${money}` : money;
  }
  return detail;
}

function momentImage(moment: FamilyMoment) {
  if (moment.kind === "project") return "/images/family/together-v2.jpg";
  if (
    moment.kind === "money" ||
    moment.kind === "birthday" ||
    moment.kind === "personal_date"
  ) {
    return "/images/family/coming-up-v2.jpg";
  }
  return "/images/family/needs-us-v2.jpg";
}

function projectImage(project: FamilyProjectSummary) {
  if (project.coverImage) return project.coverImage;
  return "/images/family/together-v2.jpg";
}

function momentHref(moment: FamilyMoment, viewerPersonId: string) {
  switch (moment.destination) {
    case "documents":
      return moment.targetId
        ? `/documents?document=${moment.targetId}`
        : "/documents";
    case "me":
      return moment.targetId && moment.targetId !== viewerPersonId
        ? `/people/${moment.targetId}`
        : "/me";
    case "projects":
      return "/projects";
    case "money":
      return "/money";
  }
}

function MomentIcon({ moment }: { moment: FamilyMoment }) {
  const Icon =
    moment.kind === "money"
      ? CircleDollarSignIcon
      : moment.kind === "project"
        ? FolderKanbanIcon
        : moment.kind === "birthday" || moment.kind === "personal_date"
          ? CalendarHeartIcon
          : moment.kind === "official_record"
            ? ShieldAlertIcon
            : FileTextIcon;
  return <Icon aria-hidden />;
}

type HeroRow = {
  id: string;
  eyebrow: string;
  title: string;
  detail: string;
  href: string;
};

function HeroPanel({ dashboard }: { dashboard: FamilyDashboard }) {
  const primaryAttention = dashboard.attention[0];
  const primaryProject = dashboard.sharedProjects[0];
  const primaryUpcoming = dashboard.upcoming.find(
    (moment) => moment.id !== primaryAttention?.id,
  );
  const rows: HeroRow[] = [
    primaryAttention
      ? {
          id: primaryAttention.id,
          eyebrow: "Needs us",
          title: primaryAttention.title,
          detail: `${formatDate(primaryAttention.occursOn)}${momentDetail(primaryAttention) ? ` · ${momentDetail(primaryAttention)}` : ""}`,
          href: momentHref(primaryAttention, dashboard.viewer.personId),
        }
      : {
          id: "attention-clear",
          eyebrow: "Needs us",
          title: "Nothing needs attention",
          detail: `${dashboard.summary.documents} household files checked`,
          href: "/documents",
        },
    primaryUpcoming
      ? {
          id: primaryUpcoming.id,
          eyebrow: "Coming up",
          title: primaryUpcoming.title,
          detail: `${formatDate(primaryUpcoming.occursOn, { weekday: true })}${primaryUpcoming.people.length ? ` · ${primaryUpcoming.people.join(" & ")}` : ""}`,
          href: momentHref(primaryUpcoming, dashboard.viewer.personId),
        }
      : {
          id: "upcoming-clear",
          eyebrow: "Coming up",
          title: "The next 14 days are open",
          detail: "Personal dates and household events will appear here",
          href: "/me",
        },
    primaryProject
      ? {
          id: primaryProject.id,
          eyebrow: "Together",
          title: primaryProject.title,
          detail: primaryProject.nextStep
            ? `Next · ${primaryProject.nextStep.title}`
            : primaryProject.outcome,
          href: "/projects",
        }
      : {
          id: "project-clear",
          eyebrow: "Together",
          title: "Room for your next shared plan",
          detail: "Household projects will stay visible here",
          href: "/projects",
        },
  ];

  return (
    <motion.article
      className="group/hero relative isolate min-h-[29rem] overflow-hidden rounded-2xl border border-white/8 bg-card/30 shadow-[0_28px_80px_-52px_rgb(0_0_0_/_0.95)]"
      variants={riseVariants}
      whileHover={{ y: -3 }}
      transition={familySpring}
    >
      <img
        src="/images/family/week-hero-v2.jpg"
        alt=""
        aria-hidden
        className="absolute inset-0 size-full object-cover object-center opacity-70 grayscale brightness-[0.58] saturate-50 transition-[filter,opacity] duration-700 ease-out group-hover/hero:opacity-95 group-hover/hero:grayscale-0 group-hover/hero:brightness-[0.82] group-hover/hero:saturate-100"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-background via-background/88 to-background/5" />
      <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-transparent to-background/28" />
      <div className="relative z-10 flex min-h-[29rem] max-w-2xl flex-col justify-between p-6 sm:p-8 lg:p-10">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="border border-family-accent/35 bg-family-accent/14 text-family-accent">
            <CalendarDaysIcon data-icon="inline-start" />
            This week
          </Badge>
          <span className="text-xs text-muted-foreground">
            A living view of your household
          </span>
        </div>

        <div>
          <h2 className="max-w-xl font-heading text-3xl leading-tight tracking-tight sm:text-4xl">
            What matters, before it becomes a scramble.
          </h2>
          <div className="mt-6 grid gap-2.5">
            {rows.map((row) => (
              <Link
                key={row.id}
                to={row.href}
                className="group/row grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-white/7 bg-background/52 px-3.5 py-3 backdrop-blur-md transition-colors hover:border-family-accent/30 hover:bg-background/72 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-family-accent/30"
              >
                <span className="size-1.5 rounded-full bg-family-accent shadow-[0_0_0.75rem_var(--family-accent)]" />
                <span className="min-w-0">
                  <span className="block text-[0.68rem] font-medium tracking-[0.14em] text-family-accent uppercase">
                    {row.eyebrow}
                  </span>
                  <span className="block truncate text-sm font-medium sm:text-base">
                    {row.title}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {row.detail}
                  </span>
                </span>
                <ArrowRightIcon className="size-4 text-muted-foreground transition-transform group-hover/row:translate-x-1 group-hover/row:text-foreground" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </motion.article>
  );
}

function PersonCard({
  person,
  index,
  nextMoment,
  viewerPersonId,
}: {
  person: PersonSummary;
  index: number;
  nextMoment: FamilyMoment | undefined;
  viewerPersonId: string;
}) {
  const href = person.id === viewerPersonId ? "/me" : `/people/${person.id}`;
  const art =
    index % 2 === 0
      ? "/images/family/person-a-v2.jpg"
      : "/images/family/person-b-v2.jpg";

  return (
    <MotionLink
      to={href}
      className="group/person relative isolate min-h-56 overflow-hidden rounded-2xl border border-white/8 bg-card/35 outline-none sm:min-h-72 lg:min-h-[29rem]"
      variants={riseVariants}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.99 }}
      transition={familySpring}
    >
      <img
        src={person.avatarUrl ?? art}
        alt=""
        aria-hidden
        className={cn(
          "absolute inset-0 size-full object-cover opacity-55 grayscale brightness-[0.58] saturate-0 transition-[filter,opacity] duration-700 ease-out group-hover/person:opacity-90 group-hover/person:grayscale-0 group-hover/person:brightness-[0.86] group-hover/person:saturate-100 group-focus-visible/person:opacity-90 group-focus-visible/person:grayscale-0 group-focus-visible/person:brightness-[0.86] group-focus-visible/person:saturate-100",
          person.avatarUrl
            ? "object-center"
            : index % 2 === 0
              ? "object-[55%_center]"
              : "object-center",
        )}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/18 to-background/15" />
      <div className="absolute inset-0 ring-1 ring-inset ring-white/5 transition group-focus-visible/person:ring-3 group-focus-visible/person:ring-family-accent/45" />
      <div className="relative z-10 flex min-h-[inherit] flex-col justify-between p-4 sm:p-5">
        <Badge className="border border-white/10 bg-background/50 text-foreground backdrop-blur-md">
          {person.isCurrentUser ? "You" : "Family"}
        </Badge>
        <div>
          <Avatar className="mb-3 size-11 border border-white/15 shadow-lg">
            <AvatarImage
              src={person.avatarUrl ?? undefined}
              alt={person.preferredName}
            />
            <AvatarFallback>{initials(person.preferredName)}</AvatarFallback>
          </Avatar>
          <h3 className="text-xl leading-none font-medium">
            {person.preferredName}
          </h3>
          <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground sm:text-sm">
            {nextMoment
              ? `${nextMoment.tone === "attention" ? "Needs attention" : "Next"} · ${nextMoment.title}${nextMoment.occursOn ? `, ${formatDate(nextMoment.occursOn)}` : ""}`
              : "No loose ends in the next 14 days"}
          </p>
        </div>
      </div>
    </MotionLink>
  );
}

function InviteCard({ onInvite }: { onInvite: () => void }) {
  return (
    <motion.button
      type="button"
      onClick={onInvite}
      className="group/invite relative isolate min-h-56 overflow-hidden rounded-2xl border border-dashed border-white/12 bg-card/25 text-left outline-none sm:min-h-72 lg:min-h-[29rem]"
      variants={riseVariants}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.99 }}
      transition={familySpring}
    >
      <img
        src="/images/family/invite-v2.jpg"
        alt=""
        aria-hidden
        className="absolute inset-0 size-full object-cover opacity-20 grayscale brightness-50 transition-[filter,opacity] duration-700 group-hover/invite:opacity-50 group-hover/invite:grayscale-0"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-background/20" />
      <div className="relative z-10 flex min-h-[inherit] flex-col justify-between p-5">
        <span className="grid size-10 place-items-center rounded-full border border-family-accent/30 bg-family-accent/12 text-family-accent">
          <MailPlusIcon className="size-5" />
        </span>
        <span>
          <span className="block text-xl font-medium">
            Bring your person in
          </span>
          <span className="mt-2 block text-sm leading-relaxed text-muted-foreground">
            One shared household, with both of your person views intact.
          </span>
        </span>
      </div>
    </motion.button>
  );
}

function PeoplePanel({
  dashboard,
  onInvite,
}: {
  dashboard: FamilyDashboard;
  onInvite: () => void;
}) {
  const moments = [...dashboard.attention, ...dashboard.upcoming];

  return (
    <motion.div
      className="grid min-w-0 grid-cols-2 gap-3 sm:gap-4"
      variants={sectionVariants}
    >
      {dashboard.people.slice(0, 2).map((person, index) => (
        <PersonCard
          key={person.id}
          person={person}
          index={index}
          viewerPersonId={dashboard.viewer.personId}
          nextMoment={moments.find((moment) =>
            moment.personIds.includes(person.id),
          )}
        />
      ))}
      {dashboard.people.length < 2 ? <InviteCard onInvite={onInvite} /> : null}
    </motion.div>
  );
}

const chapters = [
  {
    id: "attention" as const,
    label: "Needs us",
    description: "What can’t wait",
    image: "/images/family/needs-us-v2.jpg",
    icon: ShieldAlertIcon,
  },
  {
    id: "upcoming" as const,
    label: "Coming up",
    description: "The next 14 days",
    image: "/images/family/coming-up-v2.jpg",
    icon: CalendarDaysIcon,
  },
  {
    id: "together" as const,
    label: "Together",
    description: "Plans you share",
    image: "/images/family/together-v2.jpg",
    icon: UsersRoundIcon,
  },
] as const;

function ChapterNav({
  chapter,
  onChapterChange,
  dashboard,
}: {
  chapter: Chapter;
  onChapterChange: (chapter: Chapter) => void;
  dashboard: FamilyDashboard;
}) {
  const counts: Record<Chapter, number> = {
    attention: dashboard.attention.length,
    upcoming: dashboard.upcoming.length,
    together: dashboard.sharedProjects.length,
  };

  function handleKeyDown(
    event: ReactKeyboardEvent<HTMLButtonElement>,
    selected: Chapter,
  ) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const index = chapters.findIndex((item) => item.id === selected);
    const offset = event.key === "ArrowRight" ? 1 : -1;
    const next = chapters[(index + offset + chapters.length) % chapters.length];
    if (!next) return;
    onChapterChange(next.id);
    requestAnimationFrame(() =>
      document.getElementById(`family-tab-${next.id}`)?.focus(),
    );
  }

  return (
    <motion.div
      role="tablist"
      aria-label="Family view"
      className="grid gap-3 sm:grid-cols-3 sm:gap-4"
      variants={sectionVariants}
    >
      {chapters.map((item) => {
        const selected = chapter === item.id;
        const Icon = item.icon;
        return (
          <motion.button
            key={item.id}
            id={`family-tab-${item.id}`}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls="family-chapter-panel"
            onClick={() => onChapterChange(item.id)}
            onKeyDown={(event) => handleKeyDown(event, item.id)}
            className={cn(
              "group/chapter relative isolate min-h-32 overflow-hidden rounded-2xl border bg-card/25 text-left outline-none transition-[border-color,box-shadow] sm:min-h-36",
              selected
                ? "border-family-accent/65 shadow-[0_0_0_1px_color-mix(in_oklch,var(--family-accent),transparent_55%),0_18px_55px_-38px_var(--family-accent)]"
                : "border-white/8 hover:border-white/16",
            )}
            variants={riseVariants}
            whileHover={{ y: -3 }}
            whileTap={{ scale: 0.985 }}
            transition={familySpring}
          >
            <img
              src={item.image}
              alt=""
              aria-hidden
              className={cn(
                "absolute inset-0 size-full object-cover opacity-35 grayscale brightness-[0.48] saturate-0 transition-[filter,opacity] duration-700 group-hover/chapter:opacity-70 group-hover/chapter:grayscale-0 group-hover/chapter:brightness-[0.72] group-hover/chapter:saturate-100",
                selected &&
                  "opacity-65 grayscale-0 brightness-[0.65] saturate-100",
              )}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-background via-background/76 to-background/18" />
            <div className="relative z-10 flex min-h-[inherit] items-end justify-between gap-4 p-5">
              <span>
                <Icon
                  className={cn(
                    "mb-4 size-6 text-muted-foreground",
                    selected && "text-family-accent",
                  )}
                  strokeWidth={1.6}
                />
                <span className="block text-xl font-medium">{item.label}</span>
                <span className="mt-1 block text-xs text-muted-foreground sm:text-sm">
                  {item.description}
                </span>
              </span>
              <span
                className={cn(
                  "grid size-8 shrink-0 place-items-center rounded-full border border-white/10 bg-background/45 text-xs font-medium backdrop-blur-md",
                  selected && "border-family-accent/35 text-family-accent",
                )}
              >
                {counts[item.id]}
              </span>
            </div>
          </motion.button>
        );
      })}
    </motion.div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-5 flex flex-col gap-1.5 sm:mb-6">
      <p className="text-[0.68rem] font-medium tracking-[0.16em] text-family-accent uppercase">
        {eyebrow}
      </p>
      <h2 className="font-heading text-2xl tracking-tight sm:text-3xl">
        {title}
      </h2>
      <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

function VisualEmpty({
  image,
  icon: Icon,
  title,
  description,
  href,
  linkLabel,
}: {
  image: string;
  icon: typeof HeartHandshakeIcon;
  title: string;
  description: string;
  href: string;
  linkLabel: string;
}) {
  return (
    <div className="relative isolate min-h-72 overflow-hidden rounded-2xl border border-white/8 bg-card/25">
      <img
        src={image}
        alt=""
        aria-hidden
        className="absolute inset-0 size-full object-cover opacity-25 grayscale brightness-50"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-background/45" />
      <div className="relative z-10 flex min-h-72 max-w-xl flex-col items-start justify-end p-6 sm:p-8">
        <span className="mb-5 grid size-11 place-items-center rounded-full border border-family-accent/30 bg-family-accent/12 text-family-accent">
          <Icon className="size-5" />
        </span>
        <h3 className="text-xl font-medium">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
        <Link
          to={href}
          className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-family-accent outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-family-accent/30"
        >
          {linkLabel}
          <ArrowRightIcon className="size-4" />
        </Link>
      </div>
    </div>
  );
}

type CalendarLane = {
  id: string;
  label: string;
  person?: PersonSummary;
};

function laneForMoment(moment: FamilyMoment, lanes: CalendarLane[]) {
  if (moment.personIds.length === 1) {
    const personLane = lanes.find(
      (lane) => lane.person?.id === moment.personIds[0],
    );
    if (personLane) return personLane.id;
  }
  return "together";
}

function CalendarMomentTile({
  moment,
  dayIndex,
  track,
  dayCount,
  viewerPersonId,
}: {
  moment: FamilyMoment;
  dayIndex: number;
  track: number;
  dayCount: number;
  viewerPersonId: string;
}) {
  const style = {
    left: `calc(${(dayIndex / dayCount) * 100}% + 0.25rem)`,
    width: `calc(${100 / dayCount}% - 0.5rem)`,
    top: `${10 + (track % 3) * 40}px`,
  };

  return (
    <MotionLink
      to={momentHref(moment, viewerPersonId)}
      style={style}
      title={`${moment.title} · ${formatDate(moment.occursOn)}`}
      className="group/event absolute z-10 flex h-8.5 min-w-0 items-center gap-2 overflow-hidden rounded-lg border border-white/10 bg-background/80 px-2.5 text-xs shadow-lg outline-none backdrop-blur-md transition-colors hover:border-family-accent/45 hover:bg-background focus-visible:ring-3 focus-visible:ring-family-accent/35"
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.985 }}
      transition={familySpring}
    >
      <img
        src={momentImage(moment)}
        alt=""
        aria-hidden
        className="absolute inset-0 size-full object-cover opacity-15 grayscale transition group-hover/event:opacity-30 group-hover/event:grayscale-0"
      />
      <span
        className={cn(
          "relative z-10 size-1.5 shrink-0 rounded-full",
          moment.tone === "attention" ? "bg-warning" : "bg-family-accent",
        )}
      />
      <span className="relative z-10 truncate font-medium">{moment.title}</span>
    </MotionLink>
  );
}

function FamilyCalendar({ dashboard }: { dashboard: FamilyDashboard }) {
  const days = useMemo(
    () =>
      Array.from({ length: 14 }, (_, index) =>
        shiftDateKey(dashboard.today, index),
      ),
    [dashboard.today],
  );
  const lanes = useMemo<CalendarLane[]>(
    () => [
      ...dashboard.people.slice(0, 2).map((person) => ({
        id: person.id,
        label: person.preferredName,
        person,
      })),
      { id: "together", label: "Together" },
    ],
    [dashboard.people],
  );

  const momentsByDate = useMemo(() => {
    const grouped = new Map<string, FamilyMoment[]>();
    for (const moment of dashboard.upcoming) {
      if (!moment.occursOn) continue;
      const moments = grouped.get(moment.occursOn) ?? [];
      moments.push(moment);
      grouped.set(moment.occursOn, moments);
    }
    return grouped;
  }, [dashboard.upcoming]);

  if (dashboard.upcoming.length === 0) {
    return (
      <VisualEmpty
        image="/images/family/week-hero-v2.jpg"
        icon={CalendarDaysIcon}
        title="A quiet two weeks"
        description="Nothing dated is coming up yet. Birthdays, personal dates, renewals, recurring household items, and project deadlines will land here automatically."
        href="/me"
        linkLabel="Add a personal date"
      />
    );
  }

  return (
    <>
      <div className="hidden overflow-hidden rounded-2xl border border-white/8 bg-card/20 lg:block">
        <div className="overflow-x-auto">
          <div className="min-w-[76rem]">
            <div className="grid grid-cols-[10rem_minmax(0,1fr)] border-b border-white/8 bg-background/30">
              <div className="flex items-end px-4 py-3 text-xs font-medium text-muted-foreground">
                People
              </div>
              <div
                className="grid"
                style={{
                  gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))`,
                }}
              >
                {days.map((day) => {
                  const date = dateFromKey(day);
                  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                  return (
                    <div
                      key={day}
                      className={cn(
                        "border-l border-white/6 px-1 py-3 text-center",
                        day === dashboard.today && "bg-family-accent/7",
                        isWeekend && "bg-white/[0.015]",
                      )}
                    >
                      <span className="block text-[0.65rem] tracking-wide text-muted-foreground uppercase">
                        {new Intl.DateTimeFormat(undefined, {
                          weekday: "narrow",
                        }).format(date)}
                      </span>
                      <span
                        className={cn(
                          "mx-auto mt-1 grid size-7 place-items-center rounded-full text-xs font-medium",
                          day === dashboard.today &&
                            "bg-family-accent text-background",
                        )}
                      >
                        {date.getDate()}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {lanes.map((lane) => {
              const laneMoments = dashboard.upcoming.filter(
                (moment) => laneForMoment(moment, lanes) === lane.id,
              );
              return (
                <div
                  key={lane.id}
                  className="grid grid-cols-[10rem_minmax(0,1fr)] border-b border-white/7 last:border-b-0"
                >
                  <div className="flex items-center gap-3 bg-background/18 px-4 py-4">
                    {lane.person ? (
                      <Avatar className="size-8 border border-white/10">
                        <AvatarImage
                          src={lane.person.avatarUrl ?? undefined}
                          alt={lane.person.preferredName}
                        />
                        <AvatarFallback>
                          {initials(lane.person.preferredName)}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <span className="grid size-8 place-items-center rounded-full border border-family-accent/25 bg-family-accent/10 text-family-accent">
                        <UsersRoundIcon className="size-4" />
                      </span>
                    )}
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">
                        {lane.label}
                      </span>
                      <span className="block text-[0.68rem] text-muted-foreground">
                        {lane.person?.isCurrentUser
                          ? "Your lane"
                          : "Family lane"}
                      </span>
                    </span>
                  </div>
                  <div className="relative min-h-[8.5rem] overflow-hidden">
                    <div
                      className="absolute inset-0 grid"
                      style={{
                        gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))`,
                      }}
                    >
                      {days.map((day) => (
                        <div
                          key={day}
                          className={cn(
                            "border-l border-white/6",
                            day === dashboard.today &&
                              "bg-family-accent/[0.035]",
                          )}
                        />
                      ))}
                    </div>
                    {laneMoments.map((moment, index) => {
                      const dayIndex = moment.occursOn
                        ? days.indexOf(moment.occursOn)
                        : -1;
                      if (dayIndex < 0) return null;
                      return (
                        <CalendarMomentTile
                          key={moment.id}
                          moment={moment}
                          dayIndex={dayIndex}
                          track={index}
                          dayCount={days.length}
                          viewerPersonId={dashboard.viewer.personId}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid gap-3 lg:hidden">
        {days.flatMap((day) => {
          const moments = momentsByDate.get(day) ?? [];
          if (moments.length === 0) return [];
          return [
            <div
              key={day}
              className="overflow-hidden rounded-2xl border border-white/8 bg-card/20"
            >
              <div className="flex items-center justify-between border-b border-white/7 px-4 py-3">
                <span className="text-sm font-medium">
                  {formatDate(day, { weekday: true })}
                </span>
                {day === dashboard.today ? (
                  <Badge className="bg-family-accent/12 text-family-accent">
                    Today
                  </Badge>
                ) : null}
              </div>
              <div className="grid gap-1 p-2">
                {moments.map((moment) => (
                  <Link
                    key={moment.id}
                    to={momentHref(moment, dashboard.viewer.personId)}
                    className="group/mobile-event flex items-center gap-3 rounded-xl px-3 py-2.5 outline-none hover:bg-muted/55 focus-visible:ring-3 focus-visible:ring-family-accent/30"
                  >
                    <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-lg border border-white/8 bg-muted/40 [&_svg]:size-4">
                      <MomentIcon moment={moment} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {moment.title}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {moment.people.length
                          ? moment.people.join(" & ")
                          : "Together"}
                        {momentDetail(moment)
                          ? ` · ${momentDetail(moment)}`
                          : ""}
                      </span>
                    </span>
                    <ArrowRightIcon className="size-4 text-muted-foreground transition-transform group-hover/mobile-event:translate-x-1" />
                  </Link>
                ))}
              </div>
            </div>,
          ];
        })}
      </div>
    </>
  );
}

function UpcomingPanel({ dashboard }: { dashboard: FamilyDashboard }) {
  return (
    <div>
      <SectionHeading
        eyebrow="Coming up"
        title="Our next 14 days"
        description="Three simple lanes keep personal moments personal and make shared household commitments impossible to miss."
      />
      <FamilyCalendar dashboard={dashboard} />
    </div>
  );
}

function AttentionPanel({ dashboard }: { dashboard: FamilyDashboard }) {
  return (
    <div>
      <SectionHeading
        eyebrow="Needs us"
        title="The loose ends worth closing"
        description="Records to review, expiring documents, and near-term household commitments—pulled together from across LifeOS."
      />
      {dashboard.attention.length === 0 ? (
        <VisualEmpty
          image="/images/family/needs-us-v2.jpg"
          icon={CheckCircle2Icon}
          title="Nothing is asking for you"
          description="There are no flagged records, expiring documents, or urgent shared steps right now. This chapter will light up when something changes."
          href="/documents"
          linkLabel="Browse the household vault"
        />
      ) : (
        <motion.div
          className="grid gap-4 lg:grid-cols-2"
          variants={sectionVariants}
          initial="hidden"
          animate="visible"
        >
          {dashboard.attention.map((moment) => (
            <MotionLink
              key={moment.id}
              to={momentHref(moment, dashboard.viewer.personId)}
              className="group/need grid min-h-44 overflow-hidden rounded-2xl border border-white/8 bg-card/25 outline-none sm:grid-cols-[10rem_minmax(0,1fr)]"
              variants={riseVariants}
              whileHover={{ y: -3 }}
              whileTap={{ scale: 0.992 }}
              transition={familySpring}
            >
              <span className="relative min-h-32 overflow-hidden sm:min-h-full">
                <img
                  src={momentImage(moment)}
                  alt=""
                  aria-hidden
                  className="absolute inset-0 size-full object-cover opacity-55 grayscale brightness-[0.58] transition-[filter,opacity] duration-700 group-hover/need:opacity-90 group-hover/need:grayscale-0 group-hover/need:brightness-[0.78]"
                />
                <span className="absolute inset-0 bg-gradient-to-t from-background/75 to-transparent sm:bg-gradient-to-r" />
                <span className="absolute top-3 left-3 grid size-9 place-items-center rounded-full border border-white/12 bg-background/65 text-warning backdrop-blur-md [&_svg]:size-4">
                  <MomentIcon moment={moment} />
                </span>
              </span>
              <span className="flex min-w-0 flex-col justify-between gap-5 p-5">
                <span>
                  <span className="flex flex-wrap items-center gap-2">
                    <Badge className="border border-warning/25 bg-warning/10 text-warning">
                      <FileClockIcon data-icon="inline-start" />
                      {formatDate(moment.occursOn)}
                    </Badge>
                    {moment.people.map((person) => (
                      <Badge key={person} variant="outline">
                        {person}
                      </Badge>
                    ))}
                  </span>
                  <span className="mt-4 block text-lg font-medium">
                    {moment.title}
                  </span>
                  {momentDetail(moment) ? (
                    <span className="mt-1.5 block text-sm text-muted-foreground">
                      {momentDetail(moment)}
                    </span>
                  ) : null}
                </span>
                <span className="flex items-center gap-1.5 text-xs font-medium text-family-accent">
                  Open where it lives
                  <ArrowRightIcon className="size-3.5 transition-transform group-hover/need:translate-x-1" />
                </span>
              </span>
            </MotionLink>
          ))}
        </motion.div>
      )}
    </div>
  );
}

function ProjectCard({ project }: { project: FamilyProjectSummary }) {
  const progress =
    project.totalSteps > 0
      ? Math.round((project.completedSteps / project.totalSteps) * 100)
      : 0;

  return (
    <MotionLink
      to="/projects"
      className="group/project relative isolate min-h-80 overflow-hidden rounded-2xl border border-white/8 bg-card/25 outline-none"
      variants={riseVariants}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.992 }}
      transition={familySpring}
    >
      <img
        src={projectImage(project)}
        alt=""
        aria-hidden
        className="absolute inset-0 size-full object-cover opacity-42 grayscale brightness-[0.5] saturate-0 transition-[filter,opacity] duration-700 group-hover/project:opacity-82 group-hover/project:grayscale-0 group-hover/project:brightness-[0.72] group-hover/project:saturate-100"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/62 to-background/10" />
      <div className="absolute inset-0 ring-1 ring-inset ring-white/5 group-focus-visible/project:ring-3 group-focus-visible/project:ring-family-accent/35" />
      <div className="relative z-10 flex min-h-80 flex-col justify-between p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <span className="grid size-10 place-items-center rounded-full border border-family-accent/25 bg-background/55 text-family-accent backdrop-blur-md">
            <FolderKanbanIcon className="size-5" />
          </span>
          <div className="flex -space-x-2">
            {project.people.slice(0, 2).map((person) => (
              <Avatar
                key={person.id}
                className="size-8 border-2 border-background"
              >
                <AvatarImage
                  src={person.avatarUrl ?? undefined}
                  alt={person.preferredName}
                />
                <AvatarFallback className="text-[0.65rem]">
                  {initials(person.preferredName)}
                </AvatarFallback>
              </Avatar>
            ))}
            {project.people.length === 0 ? (
              <span className="grid size-8 place-items-center rounded-full border-2 border-background bg-muted text-muted-foreground">
                <UsersRoundIcon className="size-3.5" />
              </span>
            ) : null}
          </div>
        </div>

        <div>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {project.modules.slice(0, 2).map((module) => (
              <Badge
                key={module}
                className="border border-white/10 bg-background/45 text-foreground backdrop-blur-md"
              >
                {humanize(module)}
              </Badge>
            ))}
          </div>
          <h3 className="text-2xl leading-tight font-medium">
            {project.title}
          </h3>
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {project.outcome}
          </p>
          <div className="mt-5 rounded-xl border border-white/8 bg-background/48 p-3.5 backdrop-blur-md">
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="min-w-0 truncate text-muted-foreground">
                {project.nextStep
                  ? `Next · ${project.nextStep.title}`
                  : project.totalSteps > 0
                    ? "Path complete"
                    : "Ready for a first step"}
              </span>
              <span className="shrink-0 font-medium text-family-accent">
                {progress}%
              </span>
            </div>
            <Progress
              value={progress}
              className="mt-3 bg-white/8 [&_[data-slot=progress-indicator]]:bg-family-accent"
            />
          </div>
        </div>
      </div>
    </MotionLink>
  );
}

function TogetherPanel({ dashboard }: { dashboard: FamilyDashboard }) {
  return (
    <div>
      <SectionHeading
        eyebrow="Together"
        title="The things we’re moving forward"
        description="Shared plans stay visual, with the next concrete step close enough to act on."
      />
      {dashboard.sharedProjects.length === 0 ? (
        <VisualEmpty
          image="/images/family/together-v2.jpg"
          icon={HeartHandshakeIcon}
          title="No shared project yet"
          description="When you start a household plan—moving, travel, paperwork, or anything else—it will become the third lane of your Family view."
          href="/projects"
          linkLabel="Start a shared project"
        />
      ) : (
        <motion.div
          className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
          variants={sectionVariants}
          initial="hidden"
          animate="visible"
        >
          {dashboard.sharedProjects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </motion.div>
      )}
    </div>
  );
}

export function FamilyDashboardView({
  dashboard,
  onInvite,
}: {
  dashboard: FamilyDashboard;
  onInvite: () => void;
}) {
  const [chapter, setChapter] = useState<Chapter>("upcoming");
  const [actionsOpen, setActionsOpen] = useState(false);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setActionsOpen((open) => !open);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      <motion.div
        className="pb-24"
        variants={pageVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.header className="mb-7 sm:mb-9" variants={riseVariants}>
          <p className="text-xs font-medium tracking-[0.17em] text-family-accent uppercase">
            Your household, in motion
          </p>
          <h1 className="mt-2 font-heading text-4xl leading-tight tracking-tight sm:text-5xl">
            {dashboard.family.name}
          </h1>
          <p className="mt-2 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Your people, plans, and next moments—together where they make sense.
          </p>
        </motion.header>

        <motion.section
          className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(22rem,0.8fr)]"
          aria-label="This week and your people"
          variants={sectionVariants}
        >
          <HeroPanel dashboard={dashboard} />
          <PeoplePanel dashboard={dashboard} onInvite={onInvite} />
        </motion.section>

        <motion.section
          className="mt-5 sm:mt-6"
          aria-label="Choose a Family chapter"
          variants={sectionVariants}
        >
          <ChapterNav
            chapter={chapter}
            onChapterChange={setChapter}
            dashboard={dashboard}
          />
        </motion.section>

        <AnimatePresence mode="wait" initial={false}>
          <motion.section
            key={chapter}
            id="family-chapter-panel"
            role="tabpanel"
            aria-labelledby={`family-tab-${chapter}`}
            className="mt-9 sm:mt-11"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -7 }}
            transition={{ duration: 0.28, ease: familyEase }}
          >
            {chapter === "attention" ? (
              <AttentionPanel dashboard={dashboard} />
            ) : chapter === "upcoming" ? (
              <UpcomingPanel dashboard={dashboard} />
            ) : (
              <TogetherPanel dashboard={dashboard} />
            )}
          </motion.section>
        </AnimatePresence>
      </motion.div>

      <motion.div
        className="fixed right-4 bottom-4 z-40 sm:right-6 sm:bottom-6"
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.97 }}
        transition={familySpring}
      >
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="rounded-full border-family-accent/25 bg-background/88 shadow-xl backdrop-blur-md"
          onClick={() => setActionsOpen(true)}
        >
          <CommandIcon data-icon="inline-start" />
          Actions
          <Kbd className="ml-1 hidden sm:inline-flex">⌘ K</Kbd>
        </Button>
      </motion.div>

      <FamilyActions
        open={actionsOpen}
        onOpenChange={setActionsOpen}
        canInvite={dashboard.people.length < 2}
        onInvite={onInvite}
        profileHref="/me"
      />
    </>
  );
}
