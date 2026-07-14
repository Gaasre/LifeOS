import {
  ArrowDownLeftIcon,
  ArrowRightIcon,
  ArrowUpRightIcon,
  CalendarClockIcon,
  CircleAlertIcon,
  CircleCheckIcon,
  LandmarkIcon,
  PiggyBankIcon,
  ReceiptTextIcon,
  Settings2Icon,
  ShieldCheckIcon,
  TargetIcon,
} from "lucide-react";

import type { MoneyDashboard } from "@lifeos/rpc";
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
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@lifeos/ui/components/empty";
import { Progress } from "@lifeos/ui/components/progress";

import {
  formatCompactMoney,
  formatMoney,
  formatShortDate,
  freshnessLabel,
  ownerLabel,
} from "@/features/money/money-format";

type OverviewProps = {
  dashboard: MoneyDashboard;
  onNavigate: (section: string) => void;
  onOpenAccount: () => void;
  onOpenCalculation: () => void;
  onOpenRecurring: () => void;
  onOpenSettings: () => void;
};

function SummaryMetric({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="min-w-0 border-l border-white/10 pl-3 first:border-l-0 first:pl-0 sm:pl-5">
      <p className="text-xs text-white/55">{label}</p>
      <p
        className={
          accent
            ? "mt-1 truncate text-base text-money-accent sm:text-lg"
            : "mt-1 truncate text-base text-white/90 sm:text-lg"
        }
      >
        {value}
      </p>
    </div>
  );
}

function MonthlyFlow({ dashboard }: { dashboard: MoneyDashboard }) {
  const { monthlyFlow, settings } = dashboard;
  const segments = [
    {
      label: "Income",
      value: monthlyFlow.incomeMinor,
      className: "bg-money-accent",
    },
    {
      label: "Committed",
      value: monthlyFlow.fixedCommitmentsMinor,
      className: "bg-white/55",
    },
    {
      label: "Flexible",
      value: monthlyFlow.flexibleSpendingMinor,
      className: "bg-white/30",
    },
    {
      label: "Savings",
      value: monthlyFlow.savingsMinor,
      className: "bg-emerald-300/55",
    },
  ];
  const total = Math.max(
    1,
    segments.reduce((sum, segment) => sum + segment.value, 0),
  );

  return (
    <div className="border-t border-white/10 pt-4">
      <div className="mb-3 flex items-center justify-between gap-4">
        <p className="text-xs font-medium tracking-wide text-white/70 uppercase">
          This month
        </p>
        <p className="text-xs text-white/45">Flow, not a budget</p>
      </div>
      <div
        className="flex h-1.5 overflow-hidden rounded-full bg-white/8"
        role="img"
        aria-label={segments
          .map(
            (segment) =>
              `${segment.label} ${formatMoney(segment.value, settings.currency)}`,
          )
          .join(", ")}
      >
        {segments.map((segment) => (
          <span
            key={segment.label}
            className={segment.className}
            style={{ width: `${(segment.value / total) * 100}%` }}
          />
        ))}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-x-5 gap-y-2 sm:grid-cols-4">
        {segments.map((segment) => (
          <div
            key={segment.label}
            className="flex items-center justify-between gap-2 sm:block"
          >
            <span className="text-xs text-white/45">{segment.label}</span>
            <span className="text-xs text-white/80 sm:mt-0.5 sm:block">
              {formatCompactMoney(segment.value, settings.currency)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function UpcomingPanel({ dashboard }: { dashboard: MoneyDashboard }) {
  const movements = dashboard.upcoming.slice(0, 5);

  return (
    <Card className="min-h-full bg-card/65 backdrop-blur-sm">
      <CardHeader className="border-b border-border/70 pb-4">
        <CardTitle className="flex items-center gap-2 font-sans font-normal">
          <CalendarClockIcon className="size-4 text-money-accent" />
          Coming up
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Before the next income window closes
        </p>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col pt-1">
        {movements.length === 0 ? (
          <Empty className="min-h-64 border-0 px-2">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <CalendarClockIcon />
              </EmptyMedia>
              <EmptyTitle>No upcoming payments yet</EmptyTitle>
              <EmptyDescription>
                Add recurring items to make this view useful.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="divide-y divide-border/70">
            {movements.map((movement) => {
              const DirectionIcon =
                movement.direction === "income"
                  ? ArrowDownLeftIcon
                  : ArrowUpRightIcon;
              return (
                <div
                  key={movement.id}
                  className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 py-3.5"
                >
                  <span className="flex size-8 items-center justify-center rounded-lg bg-muted/70 text-muted-foreground">
                    <DirectionIcon className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm text-foreground/90">
                      {movement.title}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatShortDate(movement.occursOn)}
                      {movement.isVariable ? " · estimate" : ""}
                    </p>
                  </div>
                  <p
                    className={
                      movement.direction === "income"
                        ? "text-sm tabular-nums text-emerald-300/90"
                        : "text-sm tabular-nums text-foreground"
                    }
                  >
                    {movement.direction === "income" ? "+" : "−"}
                    {formatMoney(movement.amountMinor, movement.currency)}
                  </p>
                </div>
              );
            })}
          </div>
        )}
        <div className="mt-auto border-t border-border/70 pt-4">
          <div className="flex items-start gap-2.5">
            {dashboard.status.tone === "calm" ? (
              <CircleCheckIcon className="mt-0.5 size-4 shrink-0 text-emerald-300/80" />
            ) : (
              <CircleAlertIcon className="mt-0.5 size-4 shrink-0 text-warning" />
            )}
            <p className="text-xs leading-relaxed text-muted-foreground">
              {dashboard.status.message}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AccountsPreview({
  dashboard,
  onNavigate,
  onOpenAccount,
}: Pick<OverviewProps, "dashboard" | "onNavigate" | "onOpenAccount">) {
  const accounts = dashboard.accounts
    .filter((account) => !account.archived)
    .slice(0, 3);

  return (
    <Card className="bg-card/55">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-sans font-normal">
          <LandmarkIcon className="size-4 text-money-accent" />
          Accounts
        </CardTitle>
        <CardAction>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate("accounts")}
          >
            View all <ArrowRightIcon data-icon="inline-end" />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {accounts.length === 0 ? (
          <Empty className="min-h-40 border border-dashed border-border/80">
            <EmptyHeader>
              <EmptyTitle>No accounts added</EmptyTitle>
              <EmptyDescription>
                Add the accounts you want included in your available balance.
              </EmptyDescription>
            </EmptyHeader>
            <Button size="sm" variant="outline" onClick={onOpenAccount}>
              Add account
            </Button>
          </Empty>
        ) : (
          <div className="space-y-1">
            {accounts.map((account) => (
              <button
                key={account.id}
                type="button"
                onClick={() => onNavigate("accounts")}
                className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg px-2 py-2.5 text-left transition-colors hover:bg-muted/55 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm">{account.name}</span>
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                    {ownerLabel(account.people)} ·{" "}
                    {freshnessLabel(account.lastUpdatedAt)}
                  </span>
                </span>
                <span className="text-sm tabular-nums">
                  {formatMoney(account.balanceMinor, account.currency)}
                </span>
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RecurringPreview({
  dashboard,
  onNavigate,
  onOpenRecurring,
}: Pick<OverviewProps, "dashboard" | "onNavigate" | "onOpenRecurring">) {
  const recurring = dashboard.recurring
    .filter((item) => item.state === "active")
    .slice(0, 4);

  return (
    <Card className="bg-card/55">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-sans font-normal">
          <ReceiptTextIcon className="size-4 text-money-accent" />
          Recurring
        </CardTitle>
        <CardAction>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate("recurring")}
          >
            Manage <ArrowRightIcon data-icon="inline-end" />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {recurring.length === 0 ? (
          <Empty className="min-h-40 border border-dashed border-border/80">
            <EmptyHeader>
              <EmptyTitle>No recurring items yet</EmptyTitle>
              <EmptyDescription>
                Add income, bills, subscriptions, or savings transfers.
              </EmptyDescription>
            </EmptyHeader>
            <Button size="sm" variant="outline" onClick={onOpenRecurring}>
              Add recurring item
            </Button>
          </Empty>
        ) : (
          <div className="divide-y divide-border/60">
            {recurring.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate("recurring")}
                className="grid w-full grid-cols-[minmax(0,1fr)_auto] gap-3 py-2.5 text-left focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm">{item.title}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {formatShortDate(item.nextOccurrence)} · {item.frequency}
                  </span>
                </span>
                <span className="text-sm tabular-nums">
                  {item.direction === "income" ? "+" : "−"}
                  {formatMoney(item.amountMinor, item.currency)}
                </span>
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function GoalsPreview({
  dashboard,
  onNavigate,
}: Pick<OverviewProps, "dashboard" | "onNavigate">) {
  const goals = dashboard.goals
    .filter((goal) => goal.status === "active")
    .slice(0, 3);

  return (
    <Card className="bg-card/55">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-sans font-normal">
          <TargetIcon className="size-4 text-money-accent" />
          Goals
        </CardTitle>
        <CardAction>
          <Button variant="ghost" size="sm" onClick={() => onNavigate("goals")}>
            View all <ArrowRightIcon data-icon="inline-end" />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {goals.length === 0 ? (
          <Empty className="min-h-40 border border-dashed border-border/80">
            <EmptyHeader>
              <EmptyTitle>No financial goals yet</EmptyTitle>
              <EmptyDescription>
                Add a goal when you want to plan for something important.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="space-y-4">
            {goals.map((goal) => {
              const progress = Math.min(
                100,
                Math.round(
                  (goal.currentAmountMinor / goal.targetAmountMinor) * 100,
                ),
              );
              return (
                <button
                  key={goal.id}
                  type="button"
                  onClick={() => onNavigate("goals")}
                  className="block w-full text-left focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  <span className="mb-2 flex items-center justify-between gap-3">
                    <span className="truncate text-sm">{goal.title}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {progress}%
                    </span>
                  </span>
                  <Progress
                    value={progress}
                    className="h-1.5 [&_[data-slot=progress-indicator]]:bg-money-accent"
                  />
                  <span className="mt-2 block text-xs text-muted-foreground">
                    {formatMoney(goal.currentAmountMinor, goal.currency)} of{" "}
                    {formatMoney(goal.targetAmountMinor, goal.currency)}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function MoneyOverview({
  dashboard,
  onNavigate,
  onOpenAccount,
  onOpenCalculation,
  onOpenRecurring,
  onOpenSettings,
}: OverviewProps) {
  const { calculation, settings, summary } = dashboard;
  const periodLabel = calculation.nextIncome
    ? `Until ${formatShortDate(calculation.periodEnd)}`
    : `Next 30 days · no income date set`;

  return (
    <div className="space-y-4">
      <section className="grid grid-cols-12 gap-4" aria-label="Money overview">
        <Card className="relative col-span-12 min-h-[28rem] overflow-hidden border-white/10 bg-[#121212] p-0 py-0 text-white ring-white/10 lg:col-span-8 lg:min-h-[30rem]">
          <img
            src="/images/money.jpg"
            alt=""
            className="absolute inset-0 size-full object-cover opacity-45 grayscale"
          />
          <div className="absolute inset-0 bg-[linear-gradient(100deg,rgba(8,8,8,.96)_4%,rgba(8,8,8,.77)_56%,rgba(8,8,8,.45)_100%)]" />
          <div className="relative flex min-h-[28rem] flex-col p-5 sm:p-7 lg:min-h-[30rem] lg:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-sm text-white/60">
                  <ShieldCheckIcon className="size-4 text-money-accent" />
                  Safe to spend
                </div>
                <p className="mt-2 text-xs tracking-wide text-white/42 uppercase">
                  {periodLabel}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-white/60 hover:bg-white/10 hover:text-white"
                onClick={onOpenSettings}
                aria-label="Money settings"
              >
                <Settings2Icon />
              </Button>
            </div>

            <div className="my-auto py-10">
              <p className="text-[clamp(3rem,9vw,6.1rem)] leading-none font-normal tracking-[-0.045em] text-white">
                {formatMoney(summary.safeToSpendMinor, settings.currency)}
              </p>
              <p className="mt-4 max-w-lg text-sm leading-relaxed text-white/58 sm:text-base">
                What remains after known payments, planned savings, reserved
                goal money, and your safety buffer.
              </p>
              <Button
                variant="outline"
                className="mt-6 border-white/20 bg-black/15 text-white hover:bg-white/10 hover:text-white"
                onClick={onOpenCalculation}
              >
                View calculation
                <ArrowRightIcon data-icon="inline-end" />
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-3 border-t border-white/10 pt-5">
              <SummaryMetric
                label="Available"
                value={formatCompactMoney(
                  summary.totalAvailableMinor,
                  settings.currency,
                )}
              />
              <SummaryMetric
                label="Committed"
                value={formatCompactMoney(
                  summary.committedBeforeNextIncomeMinor,
                  settings.currency,
                )}
              />
              <SummaryMetric
                label="Saved this month"
                value={formatCompactMoney(
                  summary.savedThisMonthMinor,
                  settings.currency,
                )}
                accent
              />
            </div>
            <div className="mt-5">
              <MonthlyFlow dashboard={dashboard} />
            </div>
          </div>
        </Card>
        <div className="col-span-12 lg:col-span-4">
          <UpcomingPanel dashboard={dashboard} />
        </div>
      </section>

      {calculation.warnings.length > 0 ? (
        <section
          className="flex flex-wrap items-center gap-2 rounded-xl border border-warning/15 bg-warning/5 px-4 py-3"
          aria-label="Calculation notes"
        >
          <CircleAlertIcon className="size-4 text-warning" />
          <span className="mr-1 text-xs font-medium text-foreground/85">
            Check the estimate
          </span>
          {calculation.warnings.slice(0, 3).map((warning) => (
            <Badge
              key={`${warning.code}-${warning.entityId ?? "general"}`}
              variant="outline"
            >
              {warning.message}
            </Badge>
          ))}
        </section>
      ) : null}

      <section
        className="grid grid-cols-1 gap-4 lg:grid-cols-3"
        aria-label="Money previews"
      >
        <AccountsPreview
          dashboard={dashboard}
          onNavigate={onNavigate}
          onOpenAccount={onOpenAccount}
        />
        <RecurringPreview
          dashboard={dashboard}
          onNavigate={onNavigate}
          onOpenRecurring={onOpenRecurring}
        />
        <GoalsPreview dashboard={dashboard} onNavigate={onNavigate} />
      </section>
    </div>
  );
}
