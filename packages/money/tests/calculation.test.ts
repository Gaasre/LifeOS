import assert from "node:assert/strict";
import test from "node:test";

import { addFrequency, calculateSafeToSpend } from "../src/calculation";
import type {
  FinancialGoalRecord,
  MoneyAccountRecord,
  RecurringMoneyItemRecord,
} from "../src/types";

const relationships = {
  people: [],
  documents: [],
  relatedEntities: [],
};

function account(
  id: string,
  balanceMinor: number,
  overrides: Partial<MoneyAccountRecord> = {},
): MoneyAccountRecord {
  return {
    ...relationships,
    id,
    name: id,
    type: "bank",
    institution: null,
    balanceMinor,
    currency: "EUR",
    includeInAvailableBalance: true,
    lastUpdatedAt: "2026-07-13T08:00:00.000Z",
    archived: false,
    notes: null,
    createdAt: "2026-07-13T08:00:00.000Z",
    updatedAt: "2026-07-13T08:00:00.000Z",
    ...overrides,
  };
}

function recurring(
  id: string,
  amountMinor: number,
  overrides: Partial<RecurringMoneyItemRecord> = {},
): RecurringMoneyItemRecord {
  return {
    ...relationships,
    id,
    title: id,
    amountMinor,
    currency: "EUR",
    direction: "expense",
    group: "essential",
    frequency: "monthly",
    nextOccurrence: "2026-07-20",
    startDate: null,
    endDate: null,
    accountId: null,
    accountName: null,
    category: null,
    state: "active",
    isVariable: false,
    notes: null,
    createdAt: "2026-07-13T08:00:00.000Z",
    updatedAt: "2026-07-13T08:00:00.000Z",
    ...overrides,
  };
}

function goal(
  id: string,
  currentAmountMinor: number,
  overrides: Partial<FinancialGoalRecord> = {},
): FinancialGoalRecord {
  return {
    ...relationships,
    id,
    title: id,
    targetAmountMinor: 1_000_000,
    currentAmountMinor,
    currency: "EUR",
    targetDate: null,
    recurringContributionMinor: 0,
    relatedAccountId: null,
    relatedAccountName: null,
    relatedProjectId: null,
    excludeFromSafeToSpend: true,
    status: "active",
    notes: null,
    createdAt: "2026-07-13T08:00:00.000Z",
    updatedAt: "2026-07-13T08:00:00.000Z",
    ...overrides,
  };
}

test("subtracts known commitments, planned savings, goal reserves, and the safety buffer", () => {
  const calculation = calculateSafeToSpend({
    asOf: "2026-07-13",
    currency: "EUR",
    safetyBufferMinor: 50_000,
    accounts: [account("current", 530_000)],
    recurring: [
      recurring("rent", 210_000),
      recurring("savings", 70_000, { group: "savings" }),
      recurring("salary", 400_000, {
        direction: "income",
        group: "income",
        nextOccurrence: "2026-07-25",
      }),
    ],
    goals: [goal("reserve", 80_000)],
  });

  assert.equal(calculation.safeToSpendMinor, 120_000);
  assert.equal(calculation.committedPaymentsMinor, 210_000);
  assert.equal(calculation.plannedSavingsMinor, 70_000);
  assert.equal(calculation.reservedGoalMoneyMinor, 80_000);
  assert.equal(calculation.upcomingIncomeMinor, 400_000);
  assert.equal(calculation.periodEnd, "2026-07-25");
});

test("does not double-subtract a goal held in an excluded account", () => {
  const calculation = calculateSafeToSpend({
    asOf: "2026-07-13",
    currency: "EUR",
    safetyBufferMinor: 0,
    accounts: [
      account("current", 200_000),
      account("protected", 500_000, {
        includeInAvailableBalance: false,
      }),
    ],
    recurring: [],
    goals: [
      goal("emergency", 300_000, {
        relatedAccountId: "protected",
        relatedAccountName: "Protected savings",
      }),
    ],
  });

  assert.equal(calculation.availableBalanceMinor, 200_000);
  assert.equal(calculation.reservedGoalMoneyMinor, 0);
  assert.equal(calculation.safeToSpendMinor, 200_000);
});

test("falls back to 30 days and explains stale or excluded data", () => {
  const calculation = calculateSafeToSpend({
    asOf: "2026-07-13",
    currency: "EUR",
    safetyBufferMinor: 0,
    accounts: [
      account("stale", 100_000, {
        lastUpdatedAt: "2026-07-01T08:00:00.000Z",
      }),
      account("pounds", 100_000, { currency: "GBP" }),
    ],
    recurring: [],
    goals: [],
  });

  assert.equal(calculation.periodEnd, "2026-08-12");
  assert.deepEqual(calculation.warnings.map((warning) => warning.code).sort(), [
    "currency_excluded",
    "missing_income",
    "stale_balance",
  ]);
});

test("keeps recurring calendar dates valid at month end", () => {
  assert.equal(addFrequency("2026-01-31", "monthly"), "2026-02-28");
  assert.equal(addFrequency("2028-01-31", "monthly"), "2028-02-29");
  assert.equal(addFrequency("2026-11-30", "quarterly"), "2027-02-28");
});
