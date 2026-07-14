import {
  requireEntityAccess,
  requireHouseholdMembership,
} from "@lifeos/access";
import {
  db,
  documents,
  entities,
  entityModules,
  entityPeople,
  financialDecisionOptions,
  financialDecisions,
  financialGoals,
  fileObjects,
  moneyAccounts,
  moneyDocuments,
  moneyEntries,
  moneyRelatedEntities,
  moneySettings,
  people,
  recurringMoneyItems,
  type DatabaseTransaction,
} from "@lifeos/db";
import { and, asc, desc, eq, inArray } from "drizzle-orm";

import {
  calculateMonthlyFlow,
  calculateSafeToSpend,
  calculateSavedThisMonth,
  listUpcomingMovements,
} from "./calculation";
import type {
  FinancialDecisionRecord,
  FinancialDecisionStatus,
  FinancialGoalRecord,
  FinancialGoalStatus,
  MoneyAccountRecord,
  MoneyAccountType,
  MoneyDashboard,
  MoneyDirection,
  MoneyDocumentReference,
  MoneyDocumentRole,
  MoneyEntryRecord,
  MoneyFrequency,
  MoneyRecurringGroup,
  MoneyRelationships,
  MoneyRelationshipsInput,
  MoneyRelatedEntity,
  MoneySettingsRecord,
  RecurringMoneyItemRecord,
  RecurringMoneyState,
} from "./types";

const moneyEntityTypes = [
  "money_account",
  "money_entry",
  "money_recurring",
  "financial_goal",
  "financial_decision",
] as const;

type MoneyEntityType = (typeof moneyEntityTypes)[number];

export class MoneyServiceError extends Error {
  constructor(
    public readonly code: "NOT_FOUND" | "BAD_REQUEST" | "INTERNAL",
    message: string,
  ) {
    super(message);
    this.name = "MoneyServiceError";
  }
}

type SaveAccountInput = MoneyRelationshipsInput & {
  accountId?: string | undefined;
  organizationId?: string | undefined;
  name: string;
  type: MoneyAccountType;
  institution: string | null;
  balanceMinor: number;
  currency: string;
  includeInAvailableBalance: boolean;
  notes: string | null;
};

type CreateEntryInput = MoneyRelationshipsInput & {
  organizationId?: string | undefined;
  title: string;
  amountMinor: number;
  currency: string;
  direction: MoneyDirection;
  occurredAt: string;
  accountId: string;
  recurringItemId: string | null;
  category: string | null;
  notes: string | null;
};

type SaveRecurringInput = MoneyRelationshipsInput & {
  itemId?: string | undefined;
  organizationId?: string | undefined;
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
  category: string | null;
  isVariable: boolean;
  notes: string | null;
};

type SaveGoalInput = MoneyRelationshipsInput & {
  goalId?: string | undefined;
  organizationId?: string | undefined;
  title: string;
  targetAmountMinor: number;
  currentAmountMinor: number;
  currency: string;
  targetDate: string | null;
  recurringContributionMinor: number;
  relatedAccountId: string | null;
  relatedProjectId: string | null;
  excludeFromSafeToSpend: boolean;
  status: FinancialGoalStatus;
  notes: string | null;
};

type SaveDecisionInput = MoneyRelationshipsInput & {
  decisionId?: string | undefined;
  organizationId?: string | undefined;
  title: string;
  description: string | null;
  status: FinancialDecisionStatus;
  relatedProjectId: string | null;
  selectedOptionId: string | null;
  notes: string | null;
  options: Array<{
    id?: string | undefined;
    title: string;
    monthlyImpactMinor: number;
    upfrontCostMinor: number;
    annualImpactMinor: number;
    currency: string;
    notes: string | null;
  }>;
};

function unique(values: string[]) {
  return [...new Set(values)];
}

function optionalText(value: string | null) {
  return value?.trim() || null;
}

function localDate(value = new Date()) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function recurringState(
  row: typeof recurringMoneyItems.$inferSelect,
  asOf: string,
): RecurringMoneyState {
  if (row.endDate && row.endDate <= asOf) return "ended";
  return row.isActive ? "active" : "paused";
}

async function requireMoneyEntity(
  actorUserId: string,
  entityId: string,
  expectedType: MoneyEntityType,
) {
  const entity = await requireEntityAccess(actorUserId, entityId);
  if (entity.type !== expectedType) {
    throw new MoneyServiceError("NOT_FOUND", "Money item not found.");
  }
  return entity;
}

async function validatePersonId(organizationId: string, personId: string) {
  const [person] = await db
    .select({ id: people.id })
    .from(people)
    .where(
      and(eq(people.id, personId), eq(people.organizationId, organizationId)),
    )
    .limit(1);
  if (!person) {
    throw new MoneyServiceError(
      "NOT_FOUND",
      "That person could not be found in your Family.",
    );
  }
}

async function validateAccount(
  organizationId: string,
  accountId: string | null,
) {
  if (!accountId) return null;
  const [account] = await db
    .select({ id: moneyAccounts.entityId })
    .from(moneyAccounts)
    .innerJoin(entities, eq(moneyAccounts.entityId, entities.id))
    .where(
      and(
        eq(moneyAccounts.entityId, accountId),
        eq(entities.organizationId, organizationId),
      ),
    )
    .limit(1);
  if (!account) {
    throw new MoneyServiceError("NOT_FOUND", "Account not found.");
  }
  return account.id;
}

async function validateRecurringItem(
  organizationId: string,
  recurringItemId: string | null,
) {
  if (!recurringItemId) return null;
  const [item] = await db
    .select({ id: recurringMoneyItems.entityId })
    .from(recurringMoneyItems)
    .innerJoin(entities, eq(recurringMoneyItems.entityId, entities.id))
    .where(
      and(
        eq(recurringMoneyItems.entityId, recurringItemId),
        eq(entities.organizationId, organizationId),
      ),
    )
    .limit(1);
  if (!item) {
    throw new MoneyServiceError("NOT_FOUND", "Recurring item not found.");
  }
  return item.id;
}

async function validateProject(
  organizationId: string,
  projectId: string | null,
) {
  if (!projectId) return null;
  const [project] = await db
    .select({ id: entities.id })
    .from(entities)
    .where(
      and(
        eq(entities.id, projectId),
        eq(entities.organizationId, organizationId),
        eq(entities.type, "project"),
      ),
    )
    .limit(1);
  if (!project) {
    throw new MoneyServiceError("NOT_FOUND", "Project not found.");
  }
  return project.id;
}

async function validateRelationships(
  organizationId: string,
  input: MoneyRelationshipsInput,
  currentEntityId?: string,
) {
  const personIds = unique(input.personIds);
  const relatedEntityIds = unique(input.relatedEntityIds).filter(
    (entityId) => entityId !== currentEntityId,
  );
  const sourceDocumentId = input.sourceDocumentId;
  const relatedDocumentIds = unique(input.relatedDocumentIds).filter(
    (documentId) => documentId !== sourceDocumentId,
  );

  if (personIds.length > 0) {
    const rows = await db
      .select({ id: people.id })
      .from(people)
      .where(
        and(
          eq(people.organizationId, organizationId),
          inArray(people.id, personIds),
        ),
      );
    if (rows.length !== personIds.length) {
      throw new MoneyServiceError(
        "NOT_FOUND",
        "One of the selected people is not in this Family.",
      );
    }
  }

  if (relatedEntityIds.length > 0) {
    const rows = await db
      .select({ id: entities.id })
      .from(entities)
      .where(
        and(
          eq(entities.organizationId, organizationId),
          inArray(entities.id, relatedEntityIds),
        ),
      );
    if (rows.length !== relatedEntityIds.length) {
      throw new MoneyServiceError(
        "NOT_FOUND",
        "One of the related LifeOS items could not be found.",
      );
    }
  }

  const documentIds = unique([
    ...(sourceDocumentId ? [sourceDocumentId] : []),
    ...relatedDocumentIds,
  ]);
  if (documentIds.length > 0) {
    const rows = await db
      .select({ id: documents.entityId })
      .from(documents)
      .innerJoin(entities, eq(documents.entityId, entities.id))
      .where(
        and(
          eq(entities.organizationId, organizationId),
          inArray(documents.entityId, documentIds),
        ),
      );
    if (rows.length !== documentIds.length) {
      throw new MoneyServiceError(
        "NOT_FOUND",
        "One of the linked documents could not be found.",
      );
    }
  }

  return {
    personIds,
    relatedEntityIds,
    sourceDocumentId,
    relatedDocumentIds,
  };
}

async function replaceRelationships(
  tx: DatabaseTransaction,
  entityId: string,
  relationships: Awaited<ReturnType<typeof validateRelationships>>,
  roles: { source: MoneyDocumentRole; related: MoneyDocumentRole },
) {
  await Promise.all([
    tx.delete(entityPeople).where(eq(entityPeople.entityId, entityId)),
    tx.delete(moneyDocuments).where(eq(moneyDocuments.moneyEntityId, entityId)),
    tx
      .delete(moneyRelatedEntities)
      .where(eq(moneyRelatedEntities.moneyEntityId, entityId)),
  ]);

  if (relationships.personIds.length > 0) {
    await tx
      .insert(entityPeople)
      .values(
        relationships.personIds.map((personId) => ({ entityId, personId })),
      );
  }
  if (relationships.relatedEntityIds.length > 0) {
    await tx.insert(moneyRelatedEntities).values(
      relationships.relatedEntityIds.map((relatedEntityId) => ({
        moneyEntityId: entityId,
        relatedEntityId,
      })),
    );
  }

  const documentRows = [
    ...(relationships.sourceDocumentId
      ? [
          {
            moneyEntityId: entityId,
            documentId: relationships.sourceDocumentId,
            role: roles.source,
          },
        ]
      : []),
    ...relationships.relatedDocumentIds.map((documentId) => ({
      moneyEntityId: entityId,
      documentId,
      role: roles.related,
    })),
  ];
  if (documentRows.length > 0) {
    await tx.insert(moneyDocuments).values(documentRows);
  }
}

async function createCanonicalEntity(
  tx: DatabaseTransaction,
  input: {
    organizationId: string;
    actorUserId: string;
    type: MoneyEntityType;
    title: string;
    summary: string | null;
  },
) {
  const [entity] = await tx
    .insert(entities)
    .values({
      organizationId: input.organizationId,
      createdByUserId: input.actorUserId,
      type: input.type,
      title: input.title.trim(),
      summary: optionalText(input.summary),
    })
    .returning({ id: entities.id });
  if (!entity) {
    throw new MoneyServiceError(
      "INTERNAL",
      "The Money item could not be created.",
    );
  }
  await tx.insert(entityModules).values({
    entityId: entity.id,
    module: "money",
  });
  return entity.id;
}

function buildRelationshipMaps(input: {
  personRows: Array<{
    entityId: string;
    personId: string;
    preferredName: string;
  }>;
  documentRows: MoneyDocumentReference[] & Array<{ moneyEntityId: string }>;
  relatedRows: Array<{ moneyEntityId: string } & MoneyRelatedEntity>;
}) {
  const peopleByEntity = new Map<
    string,
    Array<{ id: string; preferredName: string }>
  >();
  const documentsByEntity = new Map<string, MoneyDocumentReference[]>();
  const relatedByEntity = new Map<string, MoneyRelatedEntity[]>();

  for (const row of input.personRows) {
    const values = peopleByEntity.get(row.entityId) ?? [];
    values.push({ id: row.personId, preferredName: row.preferredName });
    peopleByEntity.set(row.entityId, values);
  }
  for (const row of input.documentRows) {
    const values = documentsByEntity.get(row.moneyEntityId) ?? [];
    values.push({
      id: row.id,
      title: row.title,
      filename: row.filename,
      kind: row.kind,
      role: row.role,
    });
    documentsByEntity.set(row.moneyEntityId, values);
  }
  for (const row of input.relatedRows) {
    const values = relatedByEntity.get(row.moneyEntityId) ?? [];
    values.push({ id: row.id, type: row.type, title: row.title });
    relatedByEntity.set(row.moneyEntityId, values);
  }

  return { peopleByEntity, documentsByEntity, relatedByEntity };
}

function relationshipsFor(
  entityId: string,
  maps: ReturnType<typeof buildRelationshipMaps>,
): MoneyRelationships {
  return {
    people: maps.peopleByEntity.get(entityId) ?? [],
    documents: maps.documentsByEntity.get(entityId) ?? [],
    relatedEntities: maps.relatedByEntity.get(entityId) ?? [],
  };
}

function visibleToPerson<T extends MoneyRelationships>(
  records: T[],
  personId?: string,
) {
  if (!personId) return records;
  return records.filter((record) =>
    record.people.some((person) => person.id === personId),
  );
}

async function loadDashboard(
  actorUserId: string,
  perspective: { personId?: string } = {},
): Promise<MoneyDashboard> {
  const membership = await requireHouseholdMembership(actorUserId);
  const organizationId = membership.organization.id;
  if (perspective.personId) {
    await validatePersonId(organizationId, perspective.personId);
  }

  const [
    settingsRow,
    accountRows,
    recurringRows,
    entryRows,
    goalRows,
    decisionRows,
    optionRows,
  ] = await Promise.all([
    db
      .select()
      .from(moneySettings)
      .where(eq(moneySettings.organizationId, organizationId))
      .limit(1),
    db
      .select({ entity: entities, account: moneyAccounts })
      .from(moneyAccounts)
      .innerJoin(entities, eq(moneyAccounts.entityId, entities.id))
      .where(eq(entities.organizationId, organizationId))
      .orderBy(moneyAccounts.archived, desc(moneyAccounts.updatedAt)),
    db
      .select({ entity: entities, recurring: recurringMoneyItems })
      .from(recurringMoneyItems)
      .innerJoin(entities, eq(recurringMoneyItems.entityId, entities.id))
      .where(eq(entities.organizationId, organizationId))
      .orderBy(asc(recurringMoneyItems.nextOccurrence)),
    db
      .select({ entity: entities, entry: moneyEntries })
      .from(moneyEntries)
      .innerJoin(entities, eq(moneyEntries.entityId, entities.id))
      .where(eq(entities.organizationId, organizationId))
      .orderBy(desc(moneyEntries.occurredAt), desc(moneyEntries.createdAt)),
    db
      .select({ entity: entities, goal: financialGoals })
      .from(financialGoals)
      .innerJoin(entities, eq(financialGoals.entityId, entities.id))
      .where(eq(entities.organizationId, organizationId))
      .orderBy(desc(financialGoals.updatedAt)),
    db
      .select({ entity: entities, decision: financialDecisions })
      .from(financialDecisions)
      .innerJoin(entities, eq(financialDecisions.entityId, entities.id))
      .where(eq(entities.organizationId, organizationId))
      .orderBy(desc(financialDecisions.updatedAt)),
    db
      .select({ option: financialDecisionOptions })
      .from(financialDecisionOptions)
      .innerJoin(
        financialDecisions,
        eq(financialDecisionOptions.decisionId, financialDecisions.entityId),
      )
      .innerJoin(entities, eq(financialDecisions.entityId, entities.id))
      .where(eq(entities.organizationId, organizationId))
      .orderBy(
        asc(financialDecisionOptions.position),
        asc(financialDecisionOptions.createdAt),
      ),
  ]);

  const entityIds = [
    ...accountRows.map((row) => row.entity.id),
    ...recurringRows.map((row) => row.entity.id),
    ...entryRows.map((row) => row.entity.id),
    ...goalRows.map((row) => row.entity.id),
    ...decisionRows.map((row) => row.entity.id),
  ];

  const [personRows, documentRows, relatedRows] =
    entityIds.length === 0
      ? [[], [], []]
      : await Promise.all([
          db
            .select({
              entityId: entityPeople.entityId,
              personId: people.id,
              preferredName: people.preferredName,
            })
            .from(entityPeople)
            .innerJoin(people, eq(entityPeople.personId, people.id))
            .where(inArray(entityPeople.entityId, entityIds)),
          db
            .select({
              moneyEntityId: moneyDocuments.moneyEntityId,
              id: entities.id,
              title: entities.title,
              filename: fileObjects.originalName,
              kind: documents.kind,
              role: moneyDocuments.role,
            })
            .from(moneyDocuments)
            .innerJoin(entities, eq(moneyDocuments.documentId, entities.id))
            .innerJoin(
              documents,
              eq(moneyDocuments.documentId, documents.entityId),
            )
            .leftJoin(
              fileObjects,
              and(
                eq(fileObjects.entityId, entities.id),
                eq(fileObjects.role, "original"),
              ),
            )
            .where(inArray(moneyDocuments.moneyEntityId, entityIds)),
          db
            .select({
              moneyEntityId: moneyRelatedEntities.moneyEntityId,
              id: entities.id,
              type: entities.type,
              title: entities.title,
            })
            .from(moneyRelatedEntities)
            .innerJoin(
              entities,
              eq(moneyRelatedEntities.relatedEntityId, entities.id),
            )
            .where(inArray(moneyRelatedEntities.moneyEntityId, entityIds)),
        ]);

  const maps = buildRelationshipMaps({
    personRows,
    documentRows: documentRows.map((row) => ({
      ...row,
      filename: row.filename ?? row.title,
    })),
    relatedRows,
  });
  const accountNameById = new Map(
    accountRows.map((row) => [row.account.entityId, row.entity.title]),
  );
  const optionsByDecision = new Map<
    string,
    FinancialDecisionRecord["options"]
  >();
  for (const { option } of optionRows) {
    const values = optionsByDecision.get(option.decisionId) ?? [];
    values.push({
      id: option.id,
      title: option.title,
      monthlyImpactMinor: option.monthlyImpactMinor,
      upfrontCostMinor: option.upfrontCostMinor,
      annualImpactMinor: option.annualImpactMinor,
      currency: option.currency,
      notes: option.notes,
      selected: option.selected,
      position: option.position,
    });
    optionsByDecision.set(option.decisionId, values);
  }

  const asOf = localDate();
  const allAccounts: MoneyAccountRecord[] = accountRows.map(
    ({ entity, account }) => ({
      id: entity.id,
      name: entity.title,
      type: account.type,
      institution: account.institution,
      balanceMinor: account.balanceMinor,
      currency: account.currency,
      includeInAvailableBalance: account.includeInAvailableBalance,
      lastUpdatedAt: account.lastUpdatedAt.toISOString(),
      archived: account.archived,
      notes: account.notes,
      createdAt: account.createdAt.toISOString(),
      updatedAt: account.updatedAt.toISOString(),
      ...relationshipsFor(entity.id, maps),
    }),
  );
  const allRecurring: RecurringMoneyItemRecord[] = recurringRows.map(
    ({ entity, recurring }) => ({
      id: entity.id,
      title: entity.title,
      amountMinor: recurring.amountMinor,
      currency: recurring.currency,
      direction: recurring.direction,
      group: recurring.group,
      frequency: recurring.frequency,
      nextOccurrence: recurring.nextOccurrence,
      startDate: recurring.startDate,
      endDate: recurring.endDate,
      accountId: recurring.accountId,
      accountName: recurring.accountId
        ? (accountNameById.get(recurring.accountId) ?? null)
        : null,
      category: recurring.category,
      state: recurringState(recurring, asOf),
      isVariable: recurring.isVariable,
      notes: recurring.notes,
      createdAt: recurring.createdAt.toISOString(),
      updatedAt: recurring.updatedAt.toISOString(),
      ...relationshipsFor(entity.id, maps),
    }),
  );
  const allActivity: MoneyEntryRecord[] = entryRows.map(
    ({ entity, entry }) => ({
      id: entity.id,
      title: entity.title,
      amountMinor: entry.amountMinor,
      currency: entry.currency,
      direction: entry.direction,
      occurredAt: entry.occurredAt,
      accountId: entry.accountId,
      accountName: accountNameById.get(entry.accountId) ?? "Account",
      recurringItemId: entry.recurringItemId,
      category: entry.category,
      notes: entry.notes,
      createdAt: entry.createdAt.toISOString(),
      updatedAt: entry.updatedAt.toISOString(),
      ...relationshipsFor(entity.id, maps),
    }),
  );
  const allGoals: FinancialGoalRecord[] = goalRows.map(({ entity, goal }) => ({
    id: entity.id,
    title: entity.title,
    targetAmountMinor: goal.targetAmountMinor,
    currentAmountMinor: goal.currentAmountMinor,
    currency: goal.currency,
    targetDate: goal.targetDate,
    recurringContributionMinor: goal.recurringContributionMinor,
    relatedAccountId: goal.relatedAccountId,
    relatedAccountName: goal.relatedAccountId
      ? (accountNameById.get(goal.relatedAccountId) ?? null)
      : null,
    relatedProjectId: goal.relatedProjectId,
    excludeFromSafeToSpend: goal.excludeFromSafeToSpend,
    status: goal.status,
    notes: goal.notes,
    createdAt: goal.createdAt.toISOString(),
    updatedAt: goal.updatedAt.toISOString(),
    ...relationshipsFor(entity.id, maps),
  }));
  const allDecisions: FinancialDecisionRecord[] = decisionRows.map(
    ({ entity, decision }) => ({
      id: entity.id,
      title: entity.title,
      description: decision.description,
      status: decision.status,
      relatedProjectId: decision.relatedProjectId,
      notes: decision.notes,
      options: optionsByDecision.get(entity.id) ?? [],
      createdAt: decision.createdAt.toISOString(),
      updatedAt: decision.updatedAt.toISOString(),
      ...relationshipsFor(entity.id, maps),
    }),
  );

  const accounts = visibleToPerson(allAccounts, perspective.personId);
  const recurring = visibleToPerson(allRecurring, perspective.personId);
  const activity = visibleToPerson(allActivity, perspective.personId);
  const goals = visibleToPerson(allGoals, perspective.personId);
  const decisions = visibleToPerson(allDecisions, perspective.personId);
  const storedSettings = settingsRow[0];
  const settings: MoneySettingsRecord = storedSettings
    ? {
        organizationId: storedSettings.organizationId,
        currency: storedSettings.currency,
        safetyBufferMinor: storedSettings.safetyBufferMinor,
        updatedAt: storedSettings.updatedAt.toISOString(),
      }
    : {
        organizationId,
        currency: "EUR",
        safetyBufferMinor: 0,
        updatedAt: null,
      };
  const calculation = calculateSafeToSpend({
    asOf,
    currency: settings.currency,
    safetyBufferMinor: settings.safetyBufferMinor,
    accounts,
    recurring,
    goals,
  });
  const monthlyFlow = calculateMonthlyFlow({
    asOf,
    currency: settings.currency,
    recurring,
    activity,
  });
  const savedThisMonthMinor = calculateSavedThisMonth({
    asOf,
    currency: settings.currency,
    activity,
    recurring,
  });
  const staleWarning = calculation.warnings.find(
    (warning) => warning.code === "stale_balance",
  );
  const status =
    calculation.safeToSpendMinor < 0
      ? {
          message: "Known commitments are higher than the available balance.",
          tone: "attention" as const,
        }
      : staleWarning
        ? {
            message:
              "Refresh an older balance to make this amount more reliable.",
            tone: "attention" as const,
          }
        : calculation.nextIncome
          ? {
              message:
                "Upcoming commitments are covered until the next income.",
              tone: "calm" as const,
            }
          : {
              message:
                "This view covers the next 30 days until income is added.",
              tone: "attention" as const,
            };

  return {
    settings,
    summary: {
      totalAvailableMinor: calculation.availableBalanceMinor,
      committedBeforeNextIncomeMinor: calculation.committedPaymentsMinor,
      safeToSpendMinor: calculation.safeToSpendMinor,
      savedThisMonthMinor,
    },
    monthlyFlow,
    status,
    calculation,
    upcoming: listUpcomingMovements(recurring, asOf, 90, 8),
    accounts,
    recurring,
    activity,
    goals,
    decisions,
  };
}

async function getAccountRecord(actorUserId: string, accountId: string) {
  const dashboard = await loadDashboard(actorUserId);
  const record = dashboard.accounts.find((account) => account.id === accountId);
  if (!record) throw new MoneyServiceError("NOT_FOUND", "Account not found.");
  return record;
}

async function getEntryRecord(actorUserId: string, entryId: string) {
  const dashboard = await loadDashboard(actorUserId);
  const record = dashboard.activity.find((entry) => entry.id === entryId);
  if (!record) throw new MoneyServiceError("NOT_FOUND", "Activity not found.");
  return record;
}

async function getRecurringRecord(actorUserId: string, itemId: string) {
  const dashboard = await loadDashboard(actorUserId);
  const record = dashboard.recurring.find((item) => item.id === itemId);
  if (!record) {
    throw new MoneyServiceError("NOT_FOUND", "Recurring item not found.");
  }
  return record;
}

async function getGoalRecord(actorUserId: string, goalId: string) {
  const dashboard = await loadDashboard(actorUserId);
  const record = dashboard.goals.find((goal) => goal.id === goalId);
  if (!record) throw new MoneyServiceError("NOT_FOUND", "Goal not found.");
  return record;
}

async function getDecisionRecord(actorUserId: string, decisionId: string) {
  const dashboard = await loadDashboard(actorUserId);
  const record = dashboard.decisions.find(
    (decision) => decision.id === decisionId,
  );
  if (!record) {
    throw new MoneyServiceError("NOT_FOUND", "Decision not found.");
  }
  return record;
}

export const moneyService = {
  loadDashboard,

  async saveSettings(
    actorUserId: string,
    input: { currency: string; safetyBufferMinor: number },
  ) {
    const membership = await requireHouseholdMembership(actorUserId);
    const [settings] = await db
      .insert(moneySettings)
      .values({
        organizationId: membership.organization.id,
        currency: input.currency.toUpperCase(),
        safetyBufferMinor: input.safetyBufferMinor,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: moneySettings.organizationId,
        set: {
          currency: input.currency.toUpperCase(),
          safetyBufferMinor: input.safetyBufferMinor,
          updatedAt: new Date(),
        },
      })
      .returning();
    if (!settings) {
      throw new MoneyServiceError(
        "INTERNAL",
        "Money settings could not be saved.",
      );
    }
    return {
      organizationId: settings.organizationId,
      currency: settings.currency,
      safetyBufferMinor: settings.safetyBufferMinor,
      updatedAt: settings.updatedAt.toISOString(),
    } satisfies MoneySettingsRecord;
  },

  async saveAccount(actorUserId: string, input: SaveAccountInput) {
    const existingEntity = input.accountId
      ? await requireMoneyEntity(actorUserId, input.accountId, "money_account")
      : null;
    const membership = existingEntity
      ? null
      : await requireHouseholdMembership(actorUserId, input.organizationId);
    const organizationId =
      existingEntity?.organizationId ?? membership!.organization.id;
    const relationships = await validateRelationships(
      organizationId,
      input,
      input.accountId,
    );
    const now = new Date();

    const accountId = await db.transaction(async (tx) => {
      if (input.accountId) {
        await tx
          .update(entities)
          .set({ title: input.name.trim(), updatedAt: now })
          .where(eq(entities.id, input.accountId));
        await tx
          .update(moneyAccounts)
          .set({
            type: input.type,
            institution: optionalText(input.institution),
            balanceMinor: input.balanceMinor,
            currency: input.currency.toUpperCase(),
            includeInAvailableBalance: input.includeInAvailableBalance,
            lastUpdatedAt: now,
            notes: optionalText(input.notes),
            updatedAt: now,
          })
          .where(eq(moneyAccounts.entityId, input.accountId));
        await replaceRelationships(tx, input.accountId, relationships, {
          source: "statement",
          related: "related",
        });
        return input.accountId;
      }

      const entityId = await createCanonicalEntity(tx, {
        organizationId,
        actorUserId,
        type: "money_account",
        title: input.name,
        summary: input.institution,
      });
      await tx.insert(moneyAccounts).values({
        entityId,
        type: input.type,
        institution: optionalText(input.institution),
        balanceMinor: input.balanceMinor,
        currency: input.currency.toUpperCase(),
        includeInAvailableBalance: input.includeInAvailableBalance,
        lastUpdatedAt: now,
        notes: optionalText(input.notes),
      });
      await replaceRelationships(tx, entityId, relationships, {
        source: "statement",
        related: "related",
      });
      return entityId;
    });

    return getAccountRecord(actorUserId, accountId);
  },

  async setAccountArchived(
    actorUserId: string,
    accountId: string,
    archived: boolean,
  ) {
    await requireMoneyEntity(actorUserId, accountId, "money_account");
    const now = new Date();
    await db.transaction(async (tx) => {
      await tx
        .update(moneyAccounts)
        .set({ archived, updatedAt: now })
        .where(eq(moneyAccounts.entityId, accountId));
      await tx
        .update(entities)
        .set({ updatedAt: now })
        .where(eq(entities.id, accountId));
    });
    return getAccountRecord(actorUserId, accountId);
  },

  async createEntry(actorUserId: string, input: CreateEntryInput) {
    const membership = await requireHouseholdMembership(
      actorUserId,
      input.organizationId,
    );
    const organizationId = membership.organization.id;
    const [accountId, recurringItemId, relationships] = await Promise.all([
      validateAccount(organizationId, input.accountId),
      validateRecurringItem(organizationId, input.recurringItemId),
      validateRelationships(organizationId, input),
    ]);
    if (!accountId) {
      throw new MoneyServiceError("BAD_REQUEST", "Choose an account.");
    }

    const entryId = await db.transaction(async (tx) => {
      const entityId = await createCanonicalEntity(tx, {
        organizationId,
        actorUserId,
        type: "money_entry",
        title: input.title,
        summary: input.notes,
      });
      await tx.insert(moneyEntries).values({
        entityId,
        amountMinor: input.amountMinor,
        currency: input.currency.toUpperCase(),
        direction: input.direction,
        occurredAt: input.occurredAt,
        accountId,
        recurringItemId,
        category: optionalText(input.category),
        notes: optionalText(input.notes),
      });
      await replaceRelationships(tx, entityId, relationships, {
        source: "receipt",
        related: "related",
      });
      return entityId;
    });

    return getEntryRecord(actorUserId, entryId);
  },

  async saveRecurring(actorUserId: string, input: SaveRecurringInput) {
    const existingEntity = input.itemId
      ? await requireMoneyEntity(actorUserId, input.itemId, "money_recurring")
      : null;
    const membership = existingEntity
      ? null
      : await requireHouseholdMembership(actorUserId, input.organizationId);
    const organizationId =
      existingEntity?.organizationId ?? membership!.organization.id;
    const [accountId, relationships] = await Promise.all([
      validateAccount(organizationId, input.accountId),
      validateRelationships(organizationId, input, input.itemId),
    ]);
    const now = new Date();

    const itemId = await db.transaction(async (tx) => {
      if (input.itemId) {
        await tx
          .update(entities)
          .set({
            title: input.title.trim(),
            summary: optionalText(input.notes),
            updatedAt: now,
          })
          .where(eq(entities.id, input.itemId));
        await tx
          .update(recurringMoneyItems)
          .set({
            amountMinor: input.amountMinor,
            currency: input.currency.toUpperCase(),
            direction: input.direction,
            group: input.group,
            frequency: input.frequency,
            nextOccurrence: input.nextOccurrence,
            startDate: input.startDate,
            endDate: input.endDate,
            accountId,
            category: optionalText(input.category),
            isVariable: input.isVariable,
            notes: optionalText(input.notes),
            updatedAt: now,
          })
          .where(eq(recurringMoneyItems.entityId, input.itemId));
        await replaceRelationships(tx, input.itemId, relationships, {
          source: "source",
          related: "related",
        });
        return input.itemId;
      }

      const entityId = await createCanonicalEntity(tx, {
        organizationId,
        actorUserId,
        type: "money_recurring",
        title: input.title,
        summary: input.notes,
      });
      await tx.insert(recurringMoneyItems).values({
        entityId,
        amountMinor: input.amountMinor,
        currency: input.currency.toUpperCase(),
        direction: input.direction,
        group: input.group,
        frequency: input.frequency,
        nextOccurrence: input.nextOccurrence,
        startDate: input.startDate,
        endDate: input.endDate,
        accountId,
        category: optionalText(input.category),
        isVariable: input.isVariable,
        notes: optionalText(input.notes),
      });
      await replaceRelationships(tx, entityId, relationships, {
        source: "source",
        related: "related",
      });
      return entityId;
    });

    return getRecurringRecord(actorUserId, itemId);
  },

  async setRecurringState(
    actorUserId: string,
    itemId: string,
    state: RecurringMoneyState,
  ) {
    await requireMoneyEntity(actorUserId, itemId, "money_recurring");
    const [current] = await db
      .select({ endDate: recurringMoneyItems.endDate })
      .from(recurringMoneyItems)
      .where(eq(recurringMoneyItems.entityId, itemId))
      .limit(1);
    if (!current) {
      throw new MoneyServiceError("NOT_FOUND", "Recurring item not found.");
    }
    const now = new Date();
    const today = localDate(now);
    const endDate =
      state === "ended"
        ? today
        : state === "active" && current.endDate && current.endDate <= today
          ? null
          : current.endDate;

    await db.transaction(async (tx) => {
      await tx
        .update(recurringMoneyItems)
        .set({ isActive: state === "active", endDate, updatedAt: now })
        .where(eq(recurringMoneyItems.entityId, itemId));
      await tx
        .update(entities)
        .set({ updatedAt: now })
        .where(eq(entities.id, itemId));
    });
    return getRecurringRecord(actorUserId, itemId);
  },

  async saveGoal(actorUserId: string, input: SaveGoalInput) {
    const existingEntity = input.goalId
      ? await requireMoneyEntity(actorUserId, input.goalId, "financial_goal")
      : null;
    const membership = existingEntity
      ? null
      : await requireHouseholdMembership(actorUserId, input.organizationId);
    const organizationId =
      existingEntity?.organizationId ?? membership!.organization.id;
    const [relatedAccountId, relatedProjectId, relationships] =
      await Promise.all([
        validateAccount(organizationId, input.relatedAccountId),
        validateProject(organizationId, input.relatedProjectId),
        validateRelationships(organizationId, input, input.goalId),
      ]);
    const now = new Date();

    const goalId = await db.transaction(async (tx) => {
      if (input.goalId) {
        await tx
          .update(entities)
          .set({
            title: input.title.trim(),
            summary: optionalText(input.notes),
            updatedAt: now,
          })
          .where(eq(entities.id, input.goalId));
        await tx
          .update(financialGoals)
          .set({
            targetAmountMinor: input.targetAmountMinor,
            currentAmountMinor: input.currentAmountMinor,
            currency: input.currency.toUpperCase(),
            targetDate: input.targetDate,
            recurringContributionMinor: input.recurringContributionMinor,
            relatedAccountId,
            relatedProjectId,
            excludeFromSafeToSpend: input.excludeFromSafeToSpend,
            status: input.status,
            notes: optionalText(input.notes),
            updatedAt: now,
          })
          .where(eq(financialGoals.entityId, input.goalId));
        await replaceRelationships(tx, input.goalId, relationships, {
          source: "source",
          related: "related",
        });
        return input.goalId;
      }

      const entityId = await createCanonicalEntity(tx, {
        organizationId,
        actorUserId,
        type: "financial_goal",
        title: input.title,
        summary: input.notes,
      });
      await tx.insert(financialGoals).values({
        entityId,
        targetAmountMinor: input.targetAmountMinor,
        currentAmountMinor: input.currentAmountMinor,
        currency: input.currency.toUpperCase(),
        targetDate: input.targetDate,
        recurringContributionMinor: input.recurringContributionMinor,
        relatedAccountId,
        relatedProjectId,
        excludeFromSafeToSpend: input.excludeFromSafeToSpend,
        status: input.status,
        notes: optionalText(input.notes),
      });
      await replaceRelationships(tx, entityId, relationships, {
        source: "source",
        related: "related",
      });
      return entityId;
    });

    return getGoalRecord(actorUserId, goalId);
  },

  async saveDecision(actorUserId: string, input: SaveDecisionInput) {
    const existingEntity = input.decisionId
      ? await requireMoneyEntity(
          actorUserId,
          input.decisionId,
          "financial_decision",
        )
      : null;
    const membership = existingEntity
      ? null
      : await requireHouseholdMembership(actorUserId, input.organizationId);
    const organizationId =
      existingEntity?.organizationId ?? membership!.organization.id;
    const [relatedProjectId, relationships] = await Promise.all([
      validateProject(organizationId, input.relatedProjectId),
      validateRelationships(organizationId, input, input.decisionId),
    ]);
    const optionIds = new Set(
      input.options.flatMap((option) => (option.id ? [option.id] : [])),
    );
    if (input.selectedOptionId && !optionIds.has(input.selectedOptionId)) {
      throw new MoneyServiceError(
        "BAD_REQUEST",
        "The selected option must be one of this decision's saved options.",
      );
    }
    if (input.status === "decided" && !input.selectedOptionId) {
      throw new MoneyServiceError(
        "BAD_REQUEST",
        "Choose an option before marking the decision as decided.",
      );
    }
    const now = new Date();

    const decisionId = await db.transaction(async (tx) => {
      let entityId = input.decisionId;
      if (entityId) {
        await tx
          .update(entities)
          .set({
            title: input.title.trim(),
            summary: optionalText(input.description),
            updatedAt: now,
          })
          .where(eq(entities.id, entityId));
        await tx
          .update(financialDecisions)
          .set({
            description: optionalText(input.description),
            status: input.status,
            relatedProjectId,
            notes: optionalText(input.notes),
            updatedAt: now,
          })
          .where(eq(financialDecisions.entityId, entityId));
        await tx
          .delete(financialDecisionOptions)
          .where(eq(financialDecisionOptions.decisionId, entityId));
      } else {
        entityId = await createCanonicalEntity(tx, {
          organizationId,
          actorUserId,
          type: "financial_decision",
          title: input.title,
          summary: input.description,
        });
        await tx.insert(financialDecisions).values({
          entityId,
          description: optionalText(input.description),
          status: input.status,
          relatedProjectId,
          notes: optionalText(input.notes),
        });
      }

      await tx.insert(financialDecisionOptions).values(
        input.options.map((option, position) => ({
          ...(option.id ? { id: option.id } : {}),
          decisionId: entityId,
          title: option.title.trim(),
          monthlyImpactMinor: option.monthlyImpactMinor,
          upfrontCostMinor: option.upfrontCostMinor,
          annualImpactMinor: option.annualImpactMinor,
          currency: option.currency.toUpperCase(),
          notes: optionalText(option.notes),
          selected: option.id === input.selectedOptionId,
          position,
          updatedAt: now,
        })),
      );
      await replaceRelationships(tx, entityId, relationships, {
        source: "source",
        related: "related",
      });
      return entityId;
    });

    return getDecisionRecord(actorUserId, decisionId);
  },
};
