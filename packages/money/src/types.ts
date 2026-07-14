export type MoneyAccountType =
  "bank" | "savings" | "cash" | "investment" | "other";
export type MoneyDirection = "income" | "expense";
export type MoneyRecurringGroup =
  "income" | "essential" | "subscription" | "savings";
export type MoneyFrequency = "weekly" | "monthly" | "quarterly" | "yearly";
export type FinancialGoalStatus = "active" | "paused" | "completed";
export type FinancialDecisionStatus = "considering" | "decided" | "rejected";
export type RecurringMoneyState = "active" | "paused" | "ended";
export type MoneyDocumentRole = "source" | "receipt" | "statement" | "related";

export type MoneyPersonReference = {
  id: string;
  preferredName: string;
};

export type MoneyDocumentReference = {
  id: string;
  title: string;
  filename: string;
  kind: string;
  role: MoneyDocumentRole;
};

export type MoneyRelatedEntity = {
  id: string;
  type: string;
  title: string;
};

export type MoneyRelationships = {
  people: MoneyPersonReference[];
  documents: MoneyDocumentReference[];
  relatedEntities: MoneyRelatedEntity[];
};

export type MoneyAccountRecord = MoneyRelationships & {
  id: string;
  name: string;
  type: MoneyAccountType;
  institution: string | null;
  balanceMinor: number;
  currency: string;
  includeInAvailableBalance: boolean;
  lastUpdatedAt: string;
  archived: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RecurringMoneyItemRecord = MoneyRelationships & {
  id: string;
  title: string;
  amountMinor: number;
  currency: string;
  direction: MoneyDirection;
  group: MoneyRecurringGroup;
  frequency: MoneyFrequency;
  nextOccurrence: string;
  startDate: string | null;
  endDate: string | null;
  accountId: string | null;
  accountName: string | null;
  category: string | null;
  state: RecurringMoneyState;
  isVariable: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MoneyEntryRecord = MoneyRelationships & {
  id: string;
  title: string;
  amountMinor: number;
  currency: string;
  direction: MoneyDirection;
  occurredAt: string;
  accountId: string;
  accountName: string;
  recurringItemId: string | null;
  category: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type FinancialGoalRecord = MoneyRelationships & {
  id: string;
  title: string;
  targetAmountMinor: number;
  currentAmountMinor: number;
  currency: string;
  targetDate: string | null;
  recurringContributionMinor: number;
  relatedAccountId: string | null;
  relatedAccountName: string | null;
  relatedProjectId: string | null;
  excludeFromSafeToSpend: boolean;
  status: FinancialGoalStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type FinancialDecisionOption = {
  id: string;
  title: string;
  monthlyImpactMinor: number;
  upfrontCostMinor: number;
  annualImpactMinor: number;
  currency: string;
  notes: string | null;
  selected: boolean;
  position: number;
};

export type FinancialDecisionRecord = MoneyRelationships & {
  id: string;
  title: string;
  description: string | null;
  status: FinancialDecisionStatus;
  relatedProjectId: string | null;
  notes: string | null;
  options: FinancialDecisionOption[];
  createdAt: string;
  updatedAt: string;
};

export type UpcomingMoneyMovement = {
  id: string;
  recurringItemId: string;
  title: string;
  amountMinor: number;
  currency: string;
  direction: MoneyDirection;
  group: MoneyRecurringGroup;
  occursOn: string;
  isVariable: boolean;
};

export type SafeToSpendWarning = {
  code:
    | "no_accounts"
    | "stale_balance"
    | "missing_income"
    | "currency_excluded"
    | "variable_commitment";
  message: string;
  entityId: string | null;
};

export type SafeToSpendCalculation = {
  currency: string;
  asOf: string;
  periodStart: string;
  periodEnd: string;
  nextIncome: UpcomingMoneyMovement | null;
  availableBalanceMinor: number;
  upcomingIncomeMinor: number;
  essentialPaymentsMinor: number;
  subscriptionsMinor: number;
  committedPaymentsMinor: number;
  plannedSavingsMinor: number;
  reservedGoalMoneyMinor: number;
  safetyBufferMinor: number;
  safeToSpendMinor: number;
  accountBreakdown: Array<{
    accountId: string;
    title: string;
    amountMinor: number;
    lastUpdatedAt: string;
  }>;
  commitmentBreakdown: UpcomingMoneyMovement[];
  reservedGoalBreakdown: Array<{
    goalId: string;
    title: string;
    amountMinor: number;
  }>;
  warnings: SafeToSpendWarning[];
};

export type MoneySettingsRecord = {
  organizationId: string;
  currency: string;
  safetyBufferMinor: number;
  updatedAt: string | null;
};

export type MoneyDashboard = {
  settings: MoneySettingsRecord;
  summary: {
    totalAvailableMinor: number;
    committedBeforeNextIncomeMinor: number;
    safeToSpendMinor: number;
    savedThisMonthMinor: number;
  };
  monthlyFlow: {
    incomeMinor: number;
    fixedCommitmentsMinor: number;
    flexibleSpendingMinor: number;
    savingsMinor: number;
  };
  status: {
    message: string;
    tone: "calm" | "attention";
  };
  calculation: SafeToSpendCalculation;
  upcoming: UpcomingMoneyMovement[];
  accounts: MoneyAccountRecord[];
  recurring: RecurringMoneyItemRecord[];
  activity: MoneyEntryRecord[];
  goals: FinancialGoalRecord[];
  decisions: FinancialDecisionRecord[];
};

export type MoneyRelationshipsInput = {
  personIds: string[];
  relatedEntityIds: string[];
  sourceDocumentId: string | null;
  relatedDocumentIds: string[];
};
