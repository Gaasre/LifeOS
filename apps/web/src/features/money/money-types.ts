import type {
  FinancialDecisionRecord,
  FinancialGoalRecord,
  MoneyAccountRecord,
  RecurringMoneyItemRecord,
} from "@lifeos/rpc";

export type MoneyEditorTarget =
  | { kind: "account"; record?: MoneyAccountRecord }
  | { kind: "activity" }
  | { kind: "recurring"; record?: RecurringMoneyItemRecord }
  | { kind: "goal"; record?: FinancialGoalRecord }
  | { kind: "decision"; record?: FinancialDecisionRecord };
