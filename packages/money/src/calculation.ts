import type {
  FinancialGoalRecord,
  MoneyAccountRecord,
  MoneyEntryRecord,
  MoneyFrequency,
  RecurringMoneyItemRecord,
  SafeToSpendCalculation,
  SafeToSpendWarning,
  UpcomingMoneyMovement,
} from "./types";

const dayInMilliseconds = 86_400_000;
const maximumProjectedOccurrences = 240;

function parseDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function formatDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

export function addDays(value: string, days: number) {
  const date = parseDate(value);
  date.setUTCDate(date.getUTCDate() + days);
  return formatDate(date);
}

function addCalendarMonths(value: string, months: number) {
  const date = parseDate(value);
  const day = date.getUTCDate();
  const targetMonth = date.getUTCMonth() + months;
  const firstOfTargetMonth = new Date(
    Date.UTC(date.getUTCFullYear(), targetMonth, 1),
  );
  const lastDayOfTargetMonth = new Date(
    Date.UTC(
      firstOfTargetMonth.getUTCFullYear(),
      firstOfTargetMonth.getUTCMonth() + 1,
      0,
    ),
  ).getUTCDate();
  firstOfTargetMonth.setUTCDate(Math.min(day, lastDayOfTargetMonth));
  return formatDate(firstOfTargetMonth);
}

export function addFrequency(value: string, frequency: MoneyFrequency) {
  switch (frequency) {
    case "weekly":
      return addDays(value, 7);
    case "monthly":
      return addCalendarMonths(value, 1);
    case "quarterly":
      return addCalendarMonths(value, 3);
    case "yearly":
      return addCalendarMonths(value, 12);
  }
}

function isRecurringActive(item: RecurringMoneyItemRecord) {
  return item.state === "active";
}

export function expandRecurringItem(
  item: RecurringMoneyItemRecord,
  startsOn: string,
  endsOn: string,
): UpcomingMoneyMovement[] {
  if (!isRecurringActive(item)) return [];

  const movements: UpcomingMoneyMovement[] = [];
  let occursOn = item.nextOccurrence;
  let iterations = 0;

  while (occursOn < startsOn && iterations < maximumProjectedOccurrences) {
    occursOn = addFrequency(occursOn, item.frequency);
    iterations += 1;
  }

  while (occursOn <= endsOn && iterations < maximumProjectedOccurrences) {
    if (
      (!item.startDate || occursOn >= item.startDate) &&
      (!item.endDate || occursOn <= item.endDate)
    ) {
      movements.push({
        id: `${item.id}:${occursOn}`,
        recurringItemId: item.id,
        title: item.title,
        amountMinor: item.amountMinor,
        currency: item.currency,
        direction: item.direction,
        group: item.group,
        occursOn,
        isVariable: item.isVariable,
      });
    }

    if (item.endDate && occursOn >= item.endDate) break;
    occursOn = addFrequency(occursOn, item.frequency);
    iterations += 1;
  }

  return movements;
}

export function listUpcomingMovements(
  recurring: RecurringMoneyItemRecord[],
  startsOn: string,
  days = 90,
  limit = 8,
) {
  const endsOn = addDays(startsOn, days);
  return recurring
    .flatMap((item) => expandRecurringItem(item, startsOn, endsOn))
    .sort((left, right) =>
      left.occursOn === right.occursOn
        ? left.title.localeCompare(right.title)
        : left.occursOn.localeCompare(right.occursOn),
    )
    .slice(0, limit);
}

function ageInDays(updatedAt: string, asOf: string) {
  return Math.max(
    0,
    Math.floor(
      (parseDate(asOf).getTime() - new Date(updatedAt).getTime()) /
        dayInMilliseconds,
    ),
  );
}

export function calculateSafeToSpend(input: {
  asOf: string;
  currency: string;
  safetyBufferMinor: number;
  accounts: MoneyAccountRecord[];
  recurring: RecurringMoneyItemRecord[];
  goals: FinancialGoalRecord[];
  staleAfterDays?: number;
}): SafeToSpendCalculation {
  const staleAfterDays = input.staleAfterDays ?? 7;
  const warnings: SafeToSpendWarning[] = [];
  const currency = input.currency.toUpperCase();
  const includedAccounts = input.accounts.filter(
    (account) =>
      !account.archived &&
      account.includeInAvailableBalance &&
      account.currency === currency,
  );

  if (includedAccounts.length === 0) {
    warnings.push({
      code: "no_accounts",
      message: "Add an included account before relying on this amount.",
      entityId: null,
    });
  }

  for (const account of includedAccounts) {
    const daysOld = ageInDays(account.lastUpdatedAt, input.asOf);
    if (daysOld > staleAfterDays) {
      warnings.push({
        code: "stale_balance",
        message: `${account.name} was last updated ${daysOld} days ago.`,
        entityId: account.id,
      });
    }
  }

  const excludedCurrencyItems = [
    ...input.accounts.filter(
      (account) =>
        !account.archived &&
        account.includeInAvailableBalance &&
        account.currency !== currency,
    ),
    ...input.recurring.filter(
      (item) => isRecurringActive(item) && item.currency !== currency,
    ),
  ];
  if (excludedCurrencyItems.length > 0) {
    warnings.push({
      code: "currency_excluded",
      message: `${excludedCurrencyItems.length} item${excludedCurrencyItems.length === 1 ? " is" : "s are"} excluded because ${currency} is the household currency.`,
      entityId: null,
    });
  }

  const incomeCandidates = input.recurring
    .filter(
      (item) =>
        isRecurringActive(item) &&
        item.direction === "income" &&
        item.currency === currency,
    )
    .flatMap((item) =>
      expandRecurringItem(item, input.asOf, addDays(input.asOf, 366)),
    )
    .sort((left, right) => left.occursOn.localeCompare(right.occursOn));
  const nextIncome = incomeCandidates[0] ?? null;
  const periodEnd = nextIncome?.occursOn ?? addDays(input.asOf, 30);

  if (!nextIncome) {
    warnings.push({
      code: "missing_income",
      message:
        "No upcoming income is scheduled, so the calculation covers 30 days.",
      entityId: null,
    });
  }

  const commitmentBreakdown = input.recurring
    .filter(
      (item) =>
        isRecurringActive(item) &&
        item.direction === "expense" &&
        item.currency === currency,
    )
    .flatMap((item) => expandRecurringItem(item, input.asOf, periodEnd))
    .sort((left, right) => left.occursOn.localeCompare(right.occursOn));

  if (commitmentBreakdown.some((movement) => movement.isVariable)) {
    warnings.push({
      code: "variable_commitment",
      message: "Variable commitments use their latest planned amounts.",
      entityId: null,
    });
  }

  const essentialPaymentsMinor = commitmentBreakdown
    .filter((movement) => movement.group === "essential")
    .reduce((total, movement) => total + movement.amountMinor, 0);
  const subscriptionsMinor = commitmentBreakdown
    .filter((movement) => movement.group === "subscription")
    .reduce((total, movement) => total + movement.amountMinor, 0);
  const plannedSavingsMinor = commitmentBreakdown
    .filter((movement) => movement.group === "savings")
    .reduce((total, movement) => total + movement.amountMinor, 0);
  const committedPaymentsMinor = essentialPaymentsMinor + subscriptionsMinor;

  const includedAccountIds = new Set(
    includedAccounts.map((account) => account.id),
  );
  const reservedGoalBreakdown = input.goals
    .filter(
      (goal) =>
        goal.status === "active" &&
        goal.excludeFromSafeToSpend &&
        goal.currency === currency &&
        (!goal.relatedAccountId ||
          includedAccountIds.has(goal.relatedAccountId)),
    )
    .map((goal) => ({
      goalId: goal.id,
      title: goal.title,
      amountMinor: goal.currentAmountMinor,
    }));
  const reservedGoalMoneyMinor = reservedGoalBreakdown.reduce(
    (total, goal) => total + goal.amountMinor,
    0,
  );
  const availableBalanceMinor = includedAccounts.reduce(
    (total, account) => total + account.balanceMinor,
    0,
  );
  const safetyBufferMinor = Math.max(0, input.safetyBufferMinor);
  const safeToSpendMinor =
    availableBalanceMinor -
    committedPaymentsMinor -
    plannedSavingsMinor -
    reservedGoalMoneyMinor -
    safetyBufferMinor;

  return {
    currency,
    asOf: input.asOf,
    periodStart: input.asOf,
    periodEnd,
    nextIncome,
    availableBalanceMinor,
    upcomingIncomeMinor: nextIncome?.amountMinor ?? 0,
    essentialPaymentsMinor,
    subscriptionsMinor,
    committedPaymentsMinor,
    plannedSavingsMinor,
    reservedGoalMoneyMinor,
    safetyBufferMinor,
    safeToSpendMinor,
    accountBreakdown: includedAccounts.map((account) => ({
      accountId: account.id,
      title: account.name,
      amountMinor: account.balanceMinor,
      lastUpdatedAt: account.lastUpdatedAt,
    })),
    commitmentBreakdown,
    reservedGoalBreakdown,
    warnings,
  };
}

export function monthlyEquivalent(
  amountMinor: number,
  frequency: MoneyFrequency,
) {
  switch (frequency) {
    case "weekly":
      return Math.round((amountMinor * 52) / 12);
    case "monthly":
      return amountMinor;
    case "quarterly":
      return Math.round(amountMinor / 3);
    case "yearly":
      return Math.round(amountMinor / 12);
  }
}

export function calculateMonthlyFlow(input: {
  asOf: string;
  currency: string;
  recurring: RecurringMoneyItemRecord[];
  activity: MoneyEntryRecord[];
}) {
  const monthPrefix = input.asOf.slice(0, 7);
  let incomeMinor = 0;
  let fixedCommitmentsMinor = 0;
  let savingsMinor = 0;

  for (const item of input.recurring) {
    if (!isRecurringActive(item) || item.currency !== input.currency) continue;
    const monthlyAmount = monthlyEquivalent(item.amountMinor, item.frequency);
    if (item.direction === "income") incomeMinor += monthlyAmount;
    else if (item.group === "savings") savingsMinor += monthlyAmount;
    else fixedCommitmentsMinor += monthlyAmount;
  }

  const flexibleSpendingMinor = input.activity
    .filter(
      (entry) =>
        entry.direction === "expense" &&
        entry.currency === input.currency &&
        entry.occurredAt.startsWith(monthPrefix) &&
        entry.recurringItemId === null &&
        !entry.category?.toLowerCase().includes("saving"),
    )
    .reduce((total, entry) => total + entry.amountMinor, 0);

  return {
    incomeMinor,
    fixedCommitmentsMinor,
    flexibleSpendingMinor,
    savingsMinor,
  };
}

export function calculateSavedThisMonth(input: {
  asOf: string;
  currency: string;
  activity: MoneyEntryRecord[];
  recurring: RecurringMoneyItemRecord[];
}) {
  const monthPrefix = input.asOf.slice(0, 7);
  const savingsRecurringIds = new Set(
    input.recurring
      .filter((item) => item.group === "savings")
      .map((item) => item.id),
  );

  return input.activity
    .filter(
      (entry) =>
        entry.direction === "expense" &&
        entry.currency === input.currency &&
        entry.occurredAt.startsWith(monthPrefix) &&
        ((entry.recurringItemId !== null &&
          savingsRecurringIds.has(entry.recurringItemId)) ||
          entry.category?.toLowerCase().includes("saving")),
    )
    .reduce((total, entry) => total + entry.amountMinor, 0);
}
