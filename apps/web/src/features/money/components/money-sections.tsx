import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArchiveIcon,
  ArrowDownLeftIcon,
  ArrowUpRightIcon,
  CalendarDaysIcon,
  CircleDollarSignIcon,
  CirclePauseIcon,
  CirclePlayIcon,
  FileTextIcon,
  LandmarkIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PiggyBankIcon,
  PlusIcon,
  ReceiptTextIcon,
  RotateCcwIcon,
  SearchIcon,
  ShieldCheckIcon,
  SparklesIcon,
  TargetIcon,
  WalletCardsIcon,
} from "lucide-react";
import { toast } from "sonner";

import type {
  FinancialGoalRecord,
  MoneyDashboard,
  MoneyEntryRecord,
  MoneyRecurringGroup,
  RecurringMoneyItemRecord,
} from "@lifeos/rpc";
import { Badge } from "@lifeos/ui/components/badge";
import { Button } from "@lifeos/ui/components/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@lifeos/ui/components/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@lifeos/ui/components/dropdown-menu";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@lifeos/ui/components/empty";
import { Input } from "@lifeos/ui/components/input";
import { Progress } from "@lifeos/ui/components/progress";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@lifeos/ui/components/select";

import {
  formatCompactMoney,
  formatLongDate,
  formatMoney,
  formatShortDate,
  freshnessLabel,
  ownerLabel,
  titleCase,
} from "@/features/money/money-format";
import { moneyQueryKey } from "@/features/money/hooks/use-money";
import type { MoneyEditorTarget } from "@/features/money/money-types";
import { rpcClient } from "@/lib/rpc-client";

type SectionsProps = {
  dashboard: MoneyDashboard;
  onEdit: (target: MoneyEditorTarget) => void;
};

function SectionHeading({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="font-heading text-2xl font-normal tracking-tight">
          {title}
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          {description}
        </p>
      </div>
      {action}
    </div>
  );
}

function EntityActions({
  onEdit,
  onSecondary,
  secondaryLabel,
  secondaryIcon: SecondaryIcon,
}: {
  onEdit: () => void;
  onSecondary?: () => void;
  secondaryLabel?: string;
  secondaryIcon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="More actions">
          <MoreHorizontalIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={onEdit}>
          <PencilIcon /> Edit
        </DropdownMenuItem>
        {onSecondary && secondaryLabel && SecondaryIcon ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={onSecondary}>
              <SecondaryIcon /> {secondaryLabel}
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AccountsSection({ dashboard, onEdit }: SectionsProps) {
  const queryClient = useQueryClient();
  const [showArchived, setShowArchived] = useState(false);
  const accounts = dashboard.accounts.filter(
    (account) => showArchived || !account.archived,
  );

  async function toggleArchived(accountId: string, archived: boolean) {
    try {
      await rpcClient.money.setAccountArchived({ accountId, archived });
      await queryClient.invalidateQueries({ queryKey: moneyQueryKey });
      toast.success(archived ? "Account archived." : "Account restored.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "The account could not be updated.",
      );
    }
  }

  return (
    <section className="space-y-6" aria-labelledby="accounts-heading">
      <SectionHeading
        title="Accounts"
        description="The balances that feed your household’s available money. Update them when reality changes."
        action={
          <div className="flex items-center gap-2">
            {dashboard.accounts.some((account) => account.archived) ? (
              <Button
                variant="ghost"
                onClick={() => setShowArchived((value) => !value)}
              >
                {showArchived ? "Hide archived" : "Show archived"}
              </Button>
            ) : null}
            <Button onClick={() => onEdit({ kind: "account" })}>
              <PlusIcon data-icon="inline-start" /> Add account
            </Button>
          </div>
        }
      />

      {accounts.length === 0 ? (
        <Empty className="min-h-80 border border-dashed border-border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <LandmarkIcon />
            </EmptyMedia>
            <EmptyTitle>No accounts added</EmptyTitle>
            <EmptyDescription>
              Add the accounts you want included in your available balance.
            </EmptyDescription>
          </EmptyHeader>
          <Button onClick={() => onEdit({ kind: "account" })}>
            Add account
          </Button>
        </Empty>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {accounts.map((account) => (
            <Card
              key={account.id}
              className={account.archived ? "opacity-60" : "bg-card/60"}
            >
              <CardHeader>
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-money-accent/10 text-money-accent">
                    <WalletCardsIcon className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <CardTitle className="truncate font-sans font-normal">
                      {account.name}
                    </CardTitle>
                    <p className="truncate text-xs text-muted-foreground">
                      {account.institution ?? titleCase(account.type)}
                    </p>
                  </div>
                </div>
                <CardAction>
                  <EntityActions
                    onEdit={() => onEdit({ kind: "account", record: account })}
                    onSecondary={() =>
                      void toggleArchived(account.id, !account.archived)
                    }
                    secondaryLabel={account.archived ? "Restore" : "Archive"}
                    secondaryIcon={
                      account.archived ? RotateCcwIcon : ArchiveIcon
                    }
                  />
                </CardAction>
              </CardHeader>
              <CardContent>
                <p className="text-2xl tabular-nums">
                  {formatMoney(account.balanceMinor, account.currency)}
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Badge variant="outline">{ownerLabel(account.people)}</Badge>
                  <Badge
                    variant={
                      account.includeInAvailableBalance
                        ? "secondary"
                        : "outline"
                    }
                  >
                    {account.includeInAvailableBalance
                      ? "Included"
                      : "Excluded"}
                  </Badge>
                  {account.archived ? (
                    <Badge variant="outline">Archived</Badge>
                  ) : null}
                </div>
                <div className="mt-5 flex items-center justify-between gap-3 border-t pt-4 text-xs text-muted-foreground">
                  <span>{freshnessLabel(account.lastUpdatedAt)}</span>
                  {account.documents.length > 0 ? (
                    <span className="flex min-w-0 items-center gap-1">
                      <FileTextIcon className="size-3.5" /> Source linked
                    </span>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}

const recurringGroups: Array<{
  value: MoneyRecurringGroup;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    value: "income",
    label: "Income",
    description: "Pay, benefits, and regular inflows",
    icon: ArrowDownLeftIcon,
  },
  {
    value: "essential",
    label: "Essential commitments",
    description: "Known household obligations",
    icon: ShieldCheckIcon,
  },
  {
    value: "subscription",
    label: "Subscriptions",
    description: "Recurring services and memberships",
    icon: ReceiptTextIcon,
  },
  {
    value: "savings",
    label: "Planned savings",
    description: "Transfers you intend to protect",
    icon: PiggyBankIcon,
  },
];

function monthlyEquivalent(item: RecurringMoneyItemRecord) {
  const multiplier = {
    weekly: 52 / 12,
    monthly: 1,
    quarterly: 1 / 3,
    yearly: 1 / 12,
  }[item.frequency];
  return Math.round(item.amountMinor * multiplier);
}

export function RecurringSection({ dashboard, onEdit }: SectionsProps) {
  const queryClient = useQueryClient();

  async function setState(item: RecurringMoneyItemRecord) {
    const state = item.state === "active" ? "paused" : "active";
    try {
      await rpcClient.money.setRecurringState({ itemId: item.id, state });
      await queryClient.invalidateQueries({ queryKey: moneyQueryKey });
      toast.success(
        state === "paused"
          ? "Recurring item paused."
          : "Recurring item resumed.",
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "The recurring item could not be updated.",
      );
    }
  }

  return (
    <section className="space-y-6" aria-labelledby="recurring-heading">
      <SectionHeading
        title="Recurring"
        description="The repeatable money movements that make the safe-to-spend estimate dependable."
        action={
          <Button onClick={() => onEdit({ kind: "recurring" })}>
            <PlusIcon data-icon="inline-start" /> Add recurring item
          </Button>
        }
      />

      {dashboard.recurring.length === 0 ? (
        <Empty className="min-h-80 border border-dashed border-border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <RotateCcwIcon />
            </EmptyMedia>
            <EmptyTitle>No recurring items yet</EmptyTitle>
            <EmptyDescription>
              Add income, bills, subscriptions, or savings transfers.
            </EmptyDescription>
          </EmptyHeader>
          <Button onClick={() => onEdit({ kind: "recurring" })}>
            Add recurring item
          </Button>
        </Empty>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {recurringGroups.map((group) => {
            const GroupIcon = group.icon;
            const items = dashboard.recurring.filter(
              (item) => item.group === group.value,
            );
            const activeTotal = items
              .filter((item) => item.state === "active")
              .reduce((sum, item) => sum + monthlyEquivalent(item), 0);
            return (
              <Card key={group.value} className="bg-card/60">
                <CardHeader className="border-b pb-4">
                  <div className="flex items-center gap-3">
                    <span className="flex size-9 items-center justify-center rounded-lg bg-money-accent/10 text-money-accent">
                      <GroupIcon className="size-4" />
                    </span>
                    <div>
                      <CardTitle className="font-sans font-normal">
                        {group.label}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground">
                        {group.description}
                      </p>
                    </div>
                  </div>
                  <CardAction className="text-right">
                    <p className="text-sm tabular-nums">
                      {formatCompactMoney(
                        activeTotal,
                        dashboard.settings.currency,
                      )}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      monthly estimate
                    </p>
                  </CardAction>
                </CardHeader>
                <CardContent>
                  {items.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      Nothing in this group yet.
                    </p>
                  ) : (
                    <div className="divide-y divide-border/70">
                      {items.map((item) => (
                        <div
                          key={item.id}
                          className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 py-3"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="truncate text-sm">{item.title}</p>
                              {item.isVariable ? (
                                <Badge variant="outline">Estimate</Badge>
                              ) : null}
                              {item.state !== "active" ? (
                                <Badge variant="outline">
                                  {titleCase(item.state)}
                                </Badge>
                              ) : null}
                            </div>
                            <p className="mt-0.5 truncate text-xs text-muted-foreground">
                              Next {formatShortDate(item.nextOccurrence)} ·{" "}
                              {titleCase(item.frequency)} ·{" "}
                              {ownerLabel(item.people)}
                              {item.documents.length > 0
                                ? " · source linked"
                                : ""}
                            </p>
                          </div>
                          <p className="text-sm tabular-nums">
                            {item.direction === "income" ? "+" : "−"}
                            {formatMoney(item.amountMinor, item.currency)}
                          </p>
                          <EntityActions
                            onEdit={() =>
                              onEdit({ kind: "recurring", record: item })
                            }
                            onSecondary={() => void setState(item)}
                            secondaryLabel={
                              item.state === "active" ? "Pause" : "Resume"
                            }
                            secondaryIcon={
                              item.state === "active"
                                ? CirclePauseIcon
                                : CirclePlayIcon
                            }
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}

function activityMonth(value: string) {
  return value.slice(0, 7);
}

function ActivityRow({ entry }: { entry: MoneyEntryRecord }) {
  const DirectionIcon =
    entry.direction === "income" ? ArrowDownLeftIcon : ArrowUpRightIcon;
  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-border/70 px-1 py-3.5 last:border-b-0 sm:gap-4">
      <span
        className={
          entry.direction === "income"
            ? "flex size-9 items-center justify-center rounded-lg bg-emerald-400/10 text-emerald-300"
            : "flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground"
        }
      >
        <DirectionIcon className="size-4" />
      </span>
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <p className="truncate text-sm">{entry.title}</p>
          {entry.category ? (
            <Badge variant="outline" className="hidden sm:inline-flex">
              {entry.category}
            </Badge>
          ) : null}
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {entry.accountName} · {formatLongDate(entry.occurredAt)} ·{" "}
          {ownerLabel(entry.people)}
        </p>
      </div>
      <div className="text-right">
        <p
          className={
            entry.direction === "income"
              ? "text-sm tabular-nums text-emerald-300"
              : "text-sm tabular-nums"
          }
        >
          {entry.direction === "income" ? "+" : "−"}
          {formatMoney(entry.amountMinor, entry.currency)}
        </p>
        {entry.documents.length > 0 ? (
          <p className="mt-0.5 text-xs text-muted-foreground">
            Evidence linked
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function ActivitySection({ dashboard, onEdit }: SectionsProps) {
  const [query, setQuery] = useState("");
  const [month, setMonth] = useState("all");
  const [accountId, setAccountId] = useState("all");
  const [category, setCategory] = useState("all");
  const [direction, setDirection] = useState("all");
  const months = useMemo(
    () =>
      Array.from(
        new Set(
          dashboard.activity.map((entry) => activityMonth(entry.occurredAt)),
        ),
      )
        .sort()
        .reverse(),
    [dashboard.activity],
  );
  const categories = useMemo(
    () =>
      Array.from(
        new Set(
          dashboard.activity.flatMap((entry) =>
            entry.category ? [entry.category] : [],
          ),
        ),
      ).sort(),
    [dashboard.activity],
  );
  const filtered = dashboard.activity.filter((entry) => {
    const haystack =
      `${entry.title} ${entry.category ?? ""} ${entry.accountName}`.toLowerCase();
    return (
      haystack.includes(query.trim().toLowerCase()) &&
      (month === "all" || activityMonth(entry.occurredAt) === month) &&
      (accountId === "all" || entry.accountId === accountId) &&
      (category === "all" || entry.category === category) &&
      (direction === "all" || entry.direction === direction)
    );
  });

  return (
    <section className="space-y-6" aria-labelledby="activity-heading">
      <SectionHeading
        title="Activity"
        description="A calm record of what happened—not a full accounting ledger. Account balances remain the source of truth."
        action={
          <Button
            onClick={() => onEdit({ kind: "activity" })}
            disabled={
              dashboard.accounts.filter((account) => !account.archived)
                .length === 0
            }
          >
            <PlusIcon data-icon="inline-start" /> Add activity
          </Button>
        }
      />

      <Card className="bg-card/55">
        <CardHeader className="border-b pb-4">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-[minmax(14rem,1.6fr)_repeat(4,minmax(8rem,1fr))]">
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search activity"
                className="pl-8"
              />
            </div>
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">All months</SelectItem>
                  {months.map((value) => (
                    <SelectItem key={value} value={value}>
                      {new Intl.DateTimeFormat("en-GB", {
                        month: "long",
                        year: "numeric",
                      }).format(new Date(`${value}-01T00:00:00`))}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Account" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">All accounts</SelectItem>
                  {dashboard.accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">All categories</SelectItem>
                  {categories.map((value) => (
                    <SelectItem key={value} value={value}>
                      {value}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <Select value={direction} onValueChange={setDirection}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Direction" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">Income & expenses</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expenses</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {dashboard.activity.length === 0 ? (
            <Empty className="min-h-72 border-0">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <ReceiptTextIcon />
                </EmptyMedia>
                <EmptyTitle>No activity recorded</EmptyTitle>
                <EmptyDescription>
                  Add an entry when money comes in or goes out.
                </EmptyDescription>
              </EmptyHeader>
              {dashboard.accounts.length > 0 ? (
                <Button onClick={() => onEdit({ kind: "activity" })}>
                  Add activity
                </Button>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Add an account first.
                </p>
              )}
            </Empty>
          ) : filtered.length === 0 ? (
            <Empty className="min-h-64 border-0">
              <EmptyHeader>
                <EmptyTitle>No activity matches these filters</EmptyTitle>
                <EmptyDescription>
                  Try a broader month, account, or search.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div>
              {filtered.map((entry) => (
                <ActivityRow key={entry.id} entry={entry} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

function GoalCard({
  goal,
  onEdit,
}: {
  goal: FinancialGoalRecord;
  onEdit: () => void;
}) {
  const progress = Math.min(
    100,
    Math.round((goal.currentAmountMinor / goal.targetAmountMinor) * 100),
  );
  const remaining = Math.max(
    0,
    goal.targetAmountMinor - goal.currentAmountMinor,
  );
  return (
    <Card className="bg-card/60">
      <CardHeader>
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-money-accent/10 text-money-accent">
            <TargetIcon className="size-4" />
          </span>
          <div className="min-w-0">
            <CardTitle className="truncate font-sans font-normal">
              {goal.title}
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              {titleCase(goal.status)}
            </p>
          </div>
        </div>
        <CardAction>
          <EntityActions onEdit={onEdit} />
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between gap-4">
          <p className="text-2xl tabular-nums">
            {formatMoney(goal.currentAmountMinor, goal.currency)}
          </p>
          <p className="text-xs text-muted-foreground">{progress}%</p>
        </div>
        <Progress
          value={progress}
          className="mt-3 h-1.5 [&_[data-slot=progress-indicator]]:bg-money-accent"
        />
        <div className="mt-5 grid grid-cols-2 gap-3 border-t pt-4 text-xs">
          <div>
            <p className="text-muted-foreground">Still needed</p>
            <p className="mt-1 tabular-nums">
              {formatMoney(remaining, goal.currency)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Regular contribution</p>
            <p className="mt-1 tabular-nums">
              {formatMoney(goal.recurringContributionMinor, goal.currency)}
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {goal.targetDate ? (
            <Badge variant="outline">
              <CalendarDaysIcon /> {formatShortDate(goal.targetDate)}
            </Badge>
          ) : null}
          {goal.relatedAccountName ? (
            <Badge variant="outline">{goal.relatedAccountName}</Badge>
          ) : null}
          {goal.excludeFromSafeToSpend ? (
            <Badge variant="secondary">
              <ShieldCheckIcon /> Reserved
            </Badge>
          ) : null}
          {goal.relatedProjectId ? (
            <Badge variant="outline">Project linked</Badge>
          ) : null}
          {goal.documents.length > 0 ? (
            <Badge variant="outline">
              <FileTextIcon /> Source linked
            </Badge>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

export function GoalsSection({ dashboard, onEdit }: SectionsProps) {
  return (
    <section className="space-y-6" aria-labelledby="goals-heading">
      <SectionHeading
        title="Goals"
        description="Progress toward meaningful outcomes, with reserved money reflected clearly in safe-to-spend."
        action={
          <Button onClick={() => onEdit({ kind: "goal" })}>
            <PlusIcon data-icon="inline-start" /> Add goal
          </Button>
        }
      />
      {dashboard.goals.length === 0 ? (
        <Empty className="min-h-80 border border-dashed border-border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <TargetIcon />
            </EmptyMedia>
            <EmptyTitle>No financial goals yet</EmptyTitle>
            <EmptyDescription>
              Add a goal when you want to plan for something important.
            </EmptyDescription>
          </EmptyHeader>
          <Button onClick={() => onEdit({ kind: "goal" })}>Add goal</Button>
        </Empty>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {dashboard.goals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onEdit={() => onEdit({ kind: "goal", record: goal })}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export function DecisionsSection({ dashboard, onEdit }: SectionsProps) {
  return (
    <section className="space-y-6" aria-labelledby="decisions-heading">
      <SectionHeading
        title="Decisions"
        description="Compare options before acting. These scenarios never change real balances or commitments on their own."
        action={
          <Button onClick={() => onEdit({ kind: "decision" })}>
            <PlusIcon data-icon="inline-start" /> Add decision
          </Button>
        }
      />
      {dashboard.decisions.length === 0 ? (
        <Empty className="min-h-80 border border-dashed border-border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <SparklesIcon />
            </EmptyMedia>
            <EmptyTitle>No financial decisions yet</EmptyTitle>
            <EmptyDescription>
              Add one when you want to compare options before acting.
            </EmptyDescription>
          </EmptyHeader>
          <Button onClick={() => onEdit({ kind: "decision" })}>
            Add decision
          </Button>
        </Empty>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {dashboard.decisions.map((decision) => (
            <Card key={decision.id} className="bg-card/60">
              <CardHeader className="border-b pb-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <CardTitle className="truncate font-sans font-normal">
                      {decision.title}
                    </CardTitle>
                    <Badge variant="outline">
                      {titleCase(decision.status)}
                    </Badge>
                  </div>
                  {decision.description ? (
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {decision.description}
                    </p>
                  ) : null}
                  {decision.relatedProjectId ||
                  decision.documents.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {decision.relatedProjectId ? (
                        <Badge variant="outline">Project linked</Badge>
                      ) : null}
                      {decision.documents.length > 0 ? (
                        <Badge variant="outline">
                          <FileTextIcon /> Source linked
                        </Badge>
                      ) : null}
                    </div>
                  ) : null}
                </div>
                <CardAction>
                  <EntityActions
                    onEdit={() =>
                      onEdit({ kind: "decision", record: decision })
                    }
                  />
                </CardAction>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {decision.options.map((option) => (
                    <div
                      key={option.id}
                      className={
                        option.selected
                          ? "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-money-accent/30 bg-money-accent/5 p-3"
                          : "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-border/70 p-3"
                      }
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm">{option.title}</p>
                          {option.selected ? (
                            <Badge variant="secondary">Chosen</Badge>
                          ) : null}
                        </div>
                        {option.notes ? (
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            {option.notes}
                          </p>
                        ) : null}
                      </div>
                      <div className="text-right">
                        <p className="text-sm tabular-nums">
                          {option.monthlyImpactMinor > 0 ? "+" : ""}
                          {formatMoney(
                            option.monthlyImpactMinor,
                            option.currency,
                          )}{" "}
                          / mo
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {formatMoney(
                            option.upfrontCostMinor,
                            option.currency,
                          )}{" "}
                          upfront
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                  <CircleDollarSignIcon className="size-3.5" /> Scenario
                  only—confirm changes separately in Accounts or Recurring.
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
