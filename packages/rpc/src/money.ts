import { oc } from "@orpc/contract";
import { z } from "zod";

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a YYYY-MM-DD date.");
const optionalDateSchema = dateSchema.nullable();
const currencySchema = z
  .string()
  .regex(/^[A-Z]{3}$/, "Use a three-letter currency code.");
const minorAmountSchema = z.number().int().nonnegative().max(2_000_000_000);
const positiveMinorAmountSchema = z
  .number()
  .int()
  .positive()
  .max(2_000_000_000);

export const moneyAccountTypeSchema = z.enum([
  "bank",
  "savings",
  "cash",
  "investment",
  "other",
]);
export const moneyDirectionSchema = z.enum(["income", "expense"]);
export const moneyRecurringGroupSchema = z.enum([
  "income",
  "essential",
  "subscription",
  "savings",
]);
export const moneyFrequencySchema = z.enum([
  "weekly",
  "monthly",
  "quarterly",
  "yearly",
]);
export const financialGoalStatusSchema = z.enum([
  "active",
  "paused",
  "completed",
]);
export const financialDecisionStatusSchema = z.enum([
  "considering",
  "decided",
  "rejected",
]);
export const recurringMoneyStateSchema = z.enum(["active", "paused", "ended"]);

export const moneyPersonReferenceSchema = z.object({
  id: z.string().uuid(),
  preferredName: z.string(),
});

export const moneyDocumentReferenceSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  filename: z.string(),
  kind: z.string(),
  role: z.enum(["source", "receipt", "statement", "related"]),
});

export const moneyRelatedEntitySchema = z.object({
  id: z.string().uuid(),
  type: z.string(),
  title: z.string(),
});

const moneyRelationshipsOutputSchema = z.object({
  people: z.array(moneyPersonReferenceSchema),
  documents: z.array(moneyDocumentReferenceSchema),
  relatedEntities: z.array(moneyRelatedEntitySchema),
});

export const moneyAccountRecordSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string(),
    type: moneyAccountTypeSchema,
    institution: z.string().nullable(),
    balanceMinor: z.number().int(),
    currency: currencySchema,
    includeInAvailableBalance: z.boolean(),
    lastUpdatedAt: z.string(),
    archived: z.boolean(),
    notes: z.string().nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .extend(moneyRelationshipsOutputSchema.shape);

export const recurringMoneyItemRecordSchema = z
  .object({
    id: z.string().uuid(),
    title: z.string(),
    amountMinor: positiveMinorAmountSchema,
    currency: currencySchema,
    direction: moneyDirectionSchema,
    group: moneyRecurringGroupSchema,
    frequency: moneyFrequencySchema,
    nextOccurrence: dateSchema,
    startDate: optionalDateSchema,
    endDate: optionalDateSchema,
    accountId: z.string().uuid().nullable(),
    accountName: z.string().nullable(),
    category: z.string().nullable(),
    state: recurringMoneyStateSchema,
    isVariable: z.boolean(),
    notes: z.string().nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .extend(moneyRelationshipsOutputSchema.shape);

export const moneyEntryRecordSchema = z
  .object({
    id: z.string().uuid(),
    title: z.string(),
    amountMinor: positiveMinorAmountSchema,
    currency: currencySchema,
    direction: moneyDirectionSchema,
    occurredAt: dateSchema,
    accountId: z.string().uuid(),
    accountName: z.string(),
    recurringItemId: z.string().uuid().nullable(),
    category: z.string().nullable(),
    notes: z.string().nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .extend(moneyRelationshipsOutputSchema.shape);

export const financialGoalRecordSchema = z
  .object({
    id: z.string().uuid(),
    title: z.string(),
    targetAmountMinor: positiveMinorAmountSchema,
    currentAmountMinor: minorAmountSchema,
    currency: currencySchema,
    targetDate: optionalDateSchema,
    recurringContributionMinor: minorAmountSchema,
    relatedAccountId: z.string().uuid().nullable(),
    relatedAccountName: z.string().nullable(),
    relatedProjectId: z.string().uuid().nullable(),
    excludeFromSafeToSpend: z.boolean(),
    status: financialGoalStatusSchema,
    notes: z.string().nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .extend(moneyRelationshipsOutputSchema.shape);

export const financialDecisionOptionSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  monthlyImpactMinor: z.number().int(),
  upfrontCostMinor: minorAmountSchema,
  annualImpactMinor: z.number().int(),
  currency: currencySchema,
  notes: z.string().nullable(),
  selected: z.boolean(),
  position: z.number().int().nonnegative(),
});

export const financialDecisionRecordSchema = z
  .object({
    id: z.string().uuid(),
    title: z.string(),
    description: z.string().nullable(),
    status: financialDecisionStatusSchema,
    relatedProjectId: z.string().uuid().nullable(),
    notes: z.string().nullable(),
    options: z.array(financialDecisionOptionSchema),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .extend(moneyRelationshipsOutputSchema.shape);

export const upcomingMoneyMovementSchema = z.object({
  id: z.string(),
  recurringItemId: z.string().uuid(),
  title: z.string(),
  amountMinor: positiveMinorAmountSchema,
  currency: currencySchema,
  direction: moneyDirectionSchema,
  group: moneyRecurringGroupSchema,
  occursOn: dateSchema,
  isVariable: z.boolean(),
});

export const safeToSpendWarningSchema = z.object({
  code: z.enum([
    "no_accounts",
    "stale_balance",
    "missing_income",
    "currency_excluded",
    "variable_commitment",
  ]),
  message: z.string(),
  entityId: z.string().uuid().nullable(),
});

export const safeToSpendCalculationSchema = z.object({
  currency: currencySchema,
  asOf: dateSchema,
  periodStart: dateSchema,
  periodEnd: dateSchema,
  nextIncome: upcomingMoneyMovementSchema.nullable(),
  availableBalanceMinor: z.number().int(),
  upcomingIncomeMinor: minorAmountSchema,
  essentialPaymentsMinor: minorAmountSchema,
  subscriptionsMinor: minorAmountSchema,
  committedPaymentsMinor: minorAmountSchema,
  plannedSavingsMinor: minorAmountSchema,
  reservedGoalMoneyMinor: minorAmountSchema,
  safetyBufferMinor: minorAmountSchema,
  safeToSpendMinor: z.number().int(),
  accountBreakdown: z.array(
    z.object({
      accountId: z.string().uuid(),
      title: z.string(),
      amountMinor: z.number().int(),
      lastUpdatedAt: z.string(),
    }),
  ),
  commitmentBreakdown: z.array(upcomingMoneyMovementSchema),
  reservedGoalBreakdown: z.array(
    z.object({
      goalId: z.string().uuid(),
      title: z.string(),
      amountMinor: minorAmountSchema,
    }),
  ),
  warnings: z.array(safeToSpendWarningSchema),
});

export const moneySettingsRecordSchema = z.object({
  organizationId: z.string(),
  currency: currencySchema,
  safetyBufferMinor: minorAmountSchema,
  updatedAt: z.string().nullable(),
});

export const moneyDashboardSchema = z.object({
  settings: moneySettingsRecordSchema,
  summary: z.object({
    totalAvailableMinor: z.number().int(),
    committedBeforeNextIncomeMinor: minorAmountSchema,
    safeToSpendMinor: z.number().int(),
    savedThisMonthMinor: minorAmountSchema,
  }),
  monthlyFlow: z.object({
    incomeMinor: minorAmountSchema,
    fixedCommitmentsMinor: minorAmountSchema,
    flexibleSpendingMinor: minorAmountSchema,
    savingsMinor: minorAmountSchema,
  }),
  status: z.object({
    message: z.string(),
    tone: z.enum(["calm", "attention"]),
  }),
  calculation: safeToSpendCalculationSchema,
  upcoming: z.array(upcomingMoneyMovementSchema),
  accounts: z.array(moneyAccountRecordSchema),
  recurring: z.array(recurringMoneyItemRecordSchema),
  activity: z.array(moneyEntryRecordSchema),
  goals: z.array(financialGoalRecordSchema),
  decisions: z.array(financialDecisionRecordSchema),
});

const relationshipInputSchema = z.object({
  personIds: z.array(z.string().uuid()).max(10),
  relatedEntityIds: z.array(z.string().uuid()).max(30),
  sourceDocumentId: z.string().uuid().nullable(),
  relatedDocumentIds: z.array(z.string().uuid()).max(20),
});

const nullableText = (maximum: number) =>
  z.string().trim().max(maximum).nullable();

const accountInputSchema = relationshipInputSchema.extend({
  name: z.string().trim().min(1).max(120),
  type: moneyAccountTypeSchema,
  institution: nullableText(120),
  balanceMinor: z.number().int().min(-2_000_000_000).max(2_000_000_000),
  currency: currencySchema,
  includeInAvailableBalance: z.boolean(),
  notes: nullableText(800),
});

const recurringInputSchema = relationshipInputSchema
  .extend({
    title: z.string().trim().min(1).max(160),
    amountMinor: positiveMinorAmountSchema,
    currency: currencySchema,
    direction: moneyDirectionSchema,
    group: moneyRecurringGroupSchema,
    frequency: moneyFrequencySchema,
    nextOccurrence: dateSchema,
    startDate: optionalDateSchema,
    endDate: optionalDateSchema,
    accountId: z.string().uuid().nullable(),
    category: nullableText(80),
    isVariable: z.boolean(),
    notes: nullableText(800),
  })
  .superRefine((value, context) => {
    if (
      (value.group === "income" && value.direction !== "income") ||
      (value.group !== "income" && value.direction !== "expense")
    ) {
      context.addIssue({
        code: "custom",
        path: ["direction"],
        message: "Income groups must be income; other groups must be expenses.",
      });
    }
    if (value.startDate && value.endDate && value.endDate < value.startDate) {
      context.addIssue({
        code: "custom",
        path: ["endDate"],
        message: "The end date must not be before the start date.",
      });
    }
  });

const goalInputSchema = relationshipInputSchema.extend({
  title: z.string().trim().min(1).max(160),
  targetAmountMinor: positiveMinorAmountSchema,
  currentAmountMinor: minorAmountSchema,
  currency: currencySchema,
  targetDate: optionalDateSchema,
  recurringContributionMinor: minorAmountSchema,
  relatedAccountId: z.string().uuid().nullable(),
  relatedProjectId: z.string().uuid().nullable(),
  excludeFromSafeToSpend: z.boolean(),
  status: financialGoalStatusSchema,
  notes: nullableText(800),
});

const decisionOptionInputSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(1).max(120),
  monthlyImpactMinor: z.number().int().min(-2_000_000_000).max(2_000_000_000),
  upfrontCostMinor: minorAmountSchema,
  annualImpactMinor: z.number().int().min(-2_000_000_000).max(2_000_000_000),
  currency: currencySchema,
  notes: nullableText(800),
});

const decisionInputSchema = relationshipInputSchema.extend({
  title: z.string().trim().min(1).max(160),
  description: nullableText(800),
  status: financialDecisionStatusSchema,
  relatedProjectId: z.string().uuid().nullable(),
  selectedOptionId: z.string().uuid().nullable(),
  notes: nullableText(800),
  options: z.array(decisionOptionInputSchema).min(1).max(6),
});

export const moneyContract = {
  bootstrap: oc
    .input(z.object({ personId: z.string().uuid().optional() }))
    .output(moneyDashboardSchema),
  saveSettings: oc
    .input(
      z.object({
        currency: currencySchema,
        safetyBufferMinor: minorAmountSchema,
      }),
    )
    .output(moneySettingsRecordSchema),
  saveAccount: oc
    .input(
      accountInputSchema.extend({
        accountId: z.string().uuid().optional(),
        organizationId: z.string().min(1).optional(),
      }),
    )
    .output(moneyAccountRecordSchema),
  setAccountArchived: oc
    .input(z.object({ accountId: z.string().uuid(), archived: z.boolean() }))
    .output(moneyAccountRecordSchema),
  createEntry: oc
    .input(
      relationshipInputSchema.extend({
        organizationId: z.string().min(1).optional(),
        title: z.string().trim().min(1).max(160),
        amountMinor: positiveMinorAmountSchema,
        currency: currencySchema,
        direction: moneyDirectionSchema,
        occurredAt: dateSchema,
        accountId: z.string().uuid(),
        recurringItemId: z.string().uuid().nullable(),
        category: nullableText(80),
        notes: nullableText(800),
      }),
    )
    .output(moneyEntryRecordSchema),
  saveRecurring: oc
    .input(
      recurringInputSchema.and(
        z.object({
          itemId: z.string().uuid().optional(),
          organizationId: z.string().min(1).optional(),
        }),
      ),
    )
    .output(recurringMoneyItemRecordSchema),
  setRecurringState: oc
    .input(
      z.object({
        itemId: z.string().uuid(),
        state: recurringMoneyStateSchema,
      }),
    )
    .output(recurringMoneyItemRecordSchema),
  saveGoal: oc
    .input(
      goalInputSchema.extend({
        goalId: z.string().uuid().optional(),
        organizationId: z.string().min(1).optional(),
      }),
    )
    .output(financialGoalRecordSchema),
  saveDecision: oc
    .input(
      decisionInputSchema.extend({
        decisionId: z.string().uuid().optional(),
        organizationId: z.string().min(1).optional(),
      }),
    )
    .output(financialDecisionRecordSchema),
} as const;

export type MoneyDashboard = z.infer<typeof moneyDashboardSchema>;
export type MoneyAccountRecord = z.infer<typeof moneyAccountRecordSchema>;
export type RecurringMoneyItemRecord = z.infer<
  typeof recurringMoneyItemRecordSchema
>;
export type MoneyEntryRecord = z.infer<typeof moneyEntryRecordSchema>;
export type FinancialGoalRecord = z.infer<typeof financialGoalRecordSchema>;
export type FinancialDecisionRecord = z.infer<
  typeof financialDecisionRecordSchema
>;
export type FinancialDecisionOption = z.infer<
  typeof financialDecisionOptionSchema
>;
export type MoneySettingsRecord = z.infer<typeof moneySettingsRecordSchema>;
export type SafeToSpendCalculation = z.infer<
  typeof safeToSpendCalculationSchema
>;
export type UpcomingMoneyMovement = z.infer<typeof upcomingMoneyMovementSchema>;
export type MoneyDirection = z.infer<typeof moneyDirectionSchema>;
export type MoneyRecurringGroup = z.infer<typeof moneyRecurringGroupSchema>;
export type MoneyFrequency = z.infer<typeof moneyFrequencySchema>;
