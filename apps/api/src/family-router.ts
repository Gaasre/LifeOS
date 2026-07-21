import {
  AccessError,
  getHouseholdMembership,
  requireEntityAccess,
  requireHouseholdMembership,
} from "@lifeos/access";
import { auth, type AuthSession } from "@lifeos/auth/server";
import {
  db,
  documents,
  entities,
  entityModules,
  entityPeople,
  invitation,
  member,
  officialRecords,
  organization,
  people,
  personalDates,
  personFacts,
  projects,
  projectSteps,
  recurringMoneyItems,
  user,
} from "@lifeos/db";
import {
  lifeOsContract,
  type FamilyDashboard,
  type FamilyMoment,
  type OfficialRecord,
  type PersonalDate,
  type PersonDashboard,
  type PersonFact,
  type PersonProfile,
  type PersonSummary,
} from "@lifeos/rpc";
import { implement, ORPCError } from "@orpc/server";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { createHash, randomUUID } from "node:crypto";

import { createDocumentsRouter } from "./document-router";
import { createFitnessRouter } from "./fitness-router";
import { createMoneyRouter } from "./money-router";
import { createProjectsRouter } from "./project-router";

type RpcContext = {
  headers: Headers;
};

type AuthorizedContext = RpcContext & {
  auth: AuthSession;
};

const os = implement(lifeOsContract).$context<RpcContext>();

const personalWorkspaceProvisioning = new Map<string, Promise<void>>();

function personalWorkspaceSlug(userId: string) {
  const suffix = createHash("sha256").update(userId).digest("hex").slice(0, 24);
  return `personal-${suffix}`;
}

async function ensurePersonalWorkspace(session: AuthSession, headers: Headers) {
  if (await getHouseholdMembership(session.user.id)) return;

  const inFlight = personalWorkspaceProvisioning.get(session.user.id);
  if (inFlight) {
    await inFlight;
    return;
  }

  const provisioning = (async () => {
    if (await getHouseholdMembership(session.user.id)) return;

    try {
      await auth.api.createOrganization({
        headers,
        body: {
          name: `${session.user.name}'s LifeOS`,
          slug: personalWorkspaceSlug(session.user.id),
          metadata: { kind: "personal" },
        },
      });
    } catch (error) {
      // A second API process may have provisioned the same deterministic
      // workspace between our membership check and the create call.
      if (!(await getHouseholdMembership(session.user.id))) throw error;
    }
  })();

  personalWorkspaceProvisioning.set(session.user.id, provisioning);
  try {
    await provisioning;
  } finally {
    if (personalWorkspaceProvisioning.get(session.user.id) === provisioning) {
      personalWorkspaceProvisioning.delete(session.user.id);
    }
  }

  if (!(await getHouseholdMembership(session.user.id))) {
    throw new ORPCError("INTERNAL_SERVER_ERROR", {
      message: "Your personal workspace could not be prepared.",
    });
  }
}

const requireAuth = os.middleware(async ({ context, next }) => {
  const session = await auth.api.getSession({ headers: context.headers });

  if (!session) {
    throw new ORPCError("UNAUTHORIZED", {
      message: "Sign in to continue.",
    });
  }

  await ensurePersonalWorkspace(session, context.headers);

  return next({ context: { auth: session } });
});

const authorized = os.use(requireAuth);

export type AuthorizedRouter = typeof authorized;

function optionalText(value: string | null) {
  return value?.trim() || null;
}

function validateDateRange(
  startsAt: string | null,
  endsAt: string | null,
  message: string,
) {
  if (startsAt && endsAt && startsAt > endsAt) {
    throw new ORPCError("BAD_REQUEST", { message });
  }
}

function mapAccessError(error: unknown): never {
  if (error instanceof AccessError) {
    throw new ORPCError(error.code, { message: error.message });
  }
  throw error;
}

async function ensureLinkedPeople(organizationId: string) {
  const accounts = await db
    .select({
      userId: user.id,
      preferredName: user.name,
      avatarUrl: user.image,
    })
    .from(member)
    .innerJoin(user, eq(member.userId, user.id))
    .where(eq(member.organizationId, organizationId));

  if (accounts.length > 0) {
    await db
      .insert(people)
      .values(
        accounts.map((account) => ({
          organizationId,
          userId: account.userId,
          preferredName: account.preferredName,
          avatarUrl: account.avatarUrl,
        })),
      )
      .onConflictDoNothing();
  }
}

type PersonRow = typeof people.$inferSelect & { accountEmail: string | null };

function mapPersonSummary(
  person: typeof people.$inferSelect,
  currentUserId: string,
): PersonSummary {
  return {
    id: person.id,
    preferredName: person.preferredName,
    legalName: person.legalName,
    avatarUrl: person.avatarUrl,
    isCurrentUser: person.userId === currentUserId,
  };
}

function mapPersonProfile(
  person: PersonRow,
  currentUserId: string,
): PersonProfile {
  return {
    ...mapPersonSummary(person, currentUserId),
    organizationId: person.organizationId,
    userId: person.userId,
    birthday: person.birthday,
    placeOfBirth: person.placeOfBirth,
    nationality: person.nationality,
    currentCity: person.currentCity,
    currentAddress: person.currentAddress,
    maritalStatus: person.maritalStatus,
    languages: person.languages,
    accountEmail: person.accountEmail,
    updatedAt: person.updatedAt.toISOString(),
  };
}

function mapFact(row: typeof personFacts.$inferSelect): PersonFact {
  return {
    id: row.id,
    kind: row.kind,
    key: row.key,
    label: row.label,
    value: row.value,
    source: row.source,
    sourceDocumentId: row.sourceDocumentId,
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapPersonalDate(row: typeof personalDates.$inferSelect): PersonalDate {
  return {
    id: row.id,
    label: row.label,
    occursOn: row.occursOn,
    recursAnnually: row.recursAnnually,
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapOfficialRecord(
  row: typeof officialRecords.$inferSelect,
): OfficialRecord {
  return {
    id: row.id,
    recordType: row.recordType,
    title: row.title,
    identifier: row.identifier,
    issuingAuthority: row.issuingAuthority,
    country: row.country,
    issueDate: row.issueDate,
    expiryDate: row.expiryDate,
    status: row.status,
    sourceDocumentId: row.sourceDocumentId,
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function resolvePerson(
  context: AuthorizedContext,
  requestedPersonId?: string,
) {
  let membership;
  try {
    membership = await requireHouseholdMembership(context.auth.user.id);
  } catch (error) {
    return mapAccessError(error);
  }

  await ensureLinkedPeople(membership.organization.id);

  const [person] = await db
    .select({
      id: people.id,
      organizationId: people.organizationId,
      userId: people.userId,
      preferredName: people.preferredName,
      legalName: people.legalName,
      birthday: people.birthday,
      placeOfBirth: people.placeOfBirth,
      nationality: people.nationality,
      currentCity: people.currentCity,
      currentAddress: people.currentAddress,
      maritalStatus: people.maritalStatus,
      languages: people.languages,
      avatarUrl: people.avatarUrl,
      createdAt: people.createdAt,
      updatedAt: people.updatedAt,
      accountEmail: user.email,
    })
    .from(people)
    .leftJoin(user, eq(people.userId, user.id))
    .where(
      and(
        eq(people.organizationId, membership.organization.id),
        requestedPersonId
          ? eq(people.id, requestedPersonId)
          : eq(people.userId, context.auth.user.id),
      ),
    )
    .limit(1);

  if (!person) {
    throw new ORPCError("NOT_FOUND", {
      message: requestedPersonId
        ? "That person could not be found in your Family."
        : "Your person profile could not be found.",
    });
  }

  return { membership, person };
}

async function validateSourceDocument(
  context: AuthorizedContext,
  person: PersonRow,
  sourceDocumentId: string | null,
) {
  if (!sourceDocumentId) return null;

  let entity;
  try {
    entity = await requireEntityAccess(context.auth.user.id, sourceDocumentId);
  } catch (error) {
    return mapAccessError(error);
  }
  if (entity.organizationId !== person.organizationId) {
    throw new ORPCError("BAD_REQUEST", {
      message: "The source document must belong to the same Family.",
    });
  }

  const [document] = await db
    .select({ entityId: documents.entityId })
    .from(documents)
    .where(eq(documents.entityId, sourceDocumentId))
    .limit(1);
  if (!document) {
    throw new ORPCError("BAD_REQUEST", {
      message: "The source must be a file from Documents.",
    });
  }
  return sourceDocumentId;
}

async function linkSourceDocumentToPerson(
  sourceDocumentId: string | null,
  personId: string,
) {
  if (!sourceDocumentId) return;
  await db
    .insert(entityPeople)
    .values({ entityId: sourceDocumentId, personId })
    .onConflictDoNothing();
}

async function buildPersonDashboard(
  context: AuthorizedContext,
  requestedPersonId?: string,
): Promise<PersonDashboard> {
  const { membership, person } = await resolvePerson(
    context,
    requestedPersonId,
  );
  const [personRows, factRows, recordRows, personalDateRows, sourceDocuments] =
    await Promise.all([
      db
        .select()
        .from(people)
        .where(eq(people.organizationId, membership.organization.id))
        .orderBy(people.createdAt),
      db
        .select()
        .from(personFacts)
        .where(eq(personFacts.personId, person.id))
        .orderBy(desc(personFacts.updatedAt)),
      db
        .select()
        .from(officialRecords)
        .where(eq(officialRecords.personId, person.id))
        .orderBy(desc(officialRecords.updatedAt)),
      db
        .select()
        .from(personalDates)
        .where(eq(personalDates.personId, person.id))
        .orderBy(personalDates.occursOn),
      db
        .select({
          id: entities.id,
          title: entities.title,
          kind: documents.kind,
          expiresAt: documents.expiresAt,
        })
        .from(documents)
        .innerJoin(entities, eq(documents.entityId, entities.id))
        .where(eq(entities.organizationId, membership.organization.id))
        .orderBy(desc(entities.updatedAt)),
    ]);

  return {
    profile: mapPersonProfile(person, context.auth.user.id),
    people: personRows.map((row) =>
      mapPersonSummary(row, context.auth.user.id),
    ),
    facts: factRows.map(mapFact),
    officialRecords: recordRows.map(mapOfficialRecord),
    personalDates: personalDateRows.map(mapPersonalDate),
    sourceDocuments,
  };
}

const meBootstrap = authorized.me.bootstrap.handler(
  async ({ input, context }) => {
    const membership = await getHouseholdMembership(context.auth.user.id);
    if (!membership) return null;
    return buildPersonDashboard(context, input.personId);
  },
);

const updatePersonProfile = authorized.me.updateProfile.handler(
  async ({ input, context }) => {
    const { person } = await resolvePerson(context, input.personId);
    const [updated] = await db
      .update(people)
      .set({
        preferredName: input.preferredName,
        legalName: optionalText(input.legalName),
        birthday: input.birthday,
        placeOfBirth: optionalText(input.placeOfBirth),
        nationality: optionalText(input.nationality),
        currentCity: optionalText(input.currentCity),
        currentAddress: optionalText(input.currentAddress),
        maritalStatus: optionalText(input.maritalStatus),
        languages: input.languages,
        updatedAt: new Date(),
      })
      .where(eq(people.id, person.id))
      .returning();

    if (!updated) throw new ORPCError("NOT_FOUND");
    return mapPersonProfile(
      { ...updated, accountEmail: person.accountEmail },
      context.auth.user.id,
    );
  },
);

const savePersonFact = authorized.me.saveFact.handler(
  async ({ input, context }) => {
    const { person } = await resolvePerson(context, input.personId);
    const sourceDocumentId = await validateSourceDocument(
      context,
      person,
      input.sourceDocumentId,
    );
    const values = {
      kind: input.kind,
      label: input.label,
      value: input.value,
      source: sourceDocumentId ? ("document" as const) : ("self" as const),
      sourceDocumentId,
      updatedAt: new Date(),
    };

    if (input.id) {
      const [updated] = await db
        .update(personFacts)
        .set(values)
        .where(
          and(
            eq(personFacts.id, input.id),
            eq(personFacts.personId, person.id),
          ),
        )
        .returning();
      if (!updated) throw new ORPCError("NOT_FOUND");
      await linkSourceDocumentToPerson(sourceDocumentId, person.id);
      return mapFact(updated);
    }

    const key = input.key ?? `custom-${randomUUID()}`;
    const statement = db.insert(personFacts).values({
      personId: person.id,
      key,
      ...values,
    });
    const [created] = input.key
      ? await statement
          .onConflictDoUpdate({
            target: [personFacts.personId, personFacts.key],
            set: values,
          })
          .returning()
      : await statement.returning();
    if (!created) throw new ORPCError("INTERNAL_SERVER_ERROR");
    await linkSourceDocumentToPerson(sourceDocumentId, person.id);
    return mapFact(created);
  },
);

const deletePersonFact = authorized.me.deleteFact.handler(
  async ({ input, context }) => {
    const { person } = await resolvePerson(context, input.personId);
    const [removed] = await db
      .delete(personFacts)
      .where(
        and(
          eq(personFacts.id, input.factId),
          eq(personFacts.personId, person.id),
        ),
      )
      .returning({ id: personFacts.id });
    if (!removed) throw new ORPCError("NOT_FOUND");
    return { removed: true as const };
  },
);

const saveOfficialRecord = authorized.me.saveOfficialRecord.handler(
  async ({ input, context }) => {
    validateDateRange(
      input.issueDate,
      input.expiryDate,
      "The expiry date must come after the issue date.",
    );
    const { person } = await resolvePerson(context, input.personId);
    const sourceDocumentId = await validateSourceDocument(
      context,
      person,
      input.sourceDocumentId,
    );
    const status =
      input.expiryDate &&
      input.expiryDate < new Date().toISOString().slice(0, 10)
        ? ("expired" as const)
        : input.status;
    const values = {
      recordType: input.recordType,
      title: input.title,
      identifier: optionalText(input.identifier),
      issuingAuthority: optionalText(input.issuingAuthority),
      country: optionalText(input.country),
      issueDate: input.issueDate,
      expiryDate: input.expiryDate,
      status,
      sourceDocumentId,
      updatedAt: new Date(),
    };

    if (input.id) {
      const [updated] = await db
        .update(officialRecords)
        .set(values)
        .where(
          and(
            eq(officialRecords.id, input.id),
            eq(officialRecords.personId, person.id),
          ),
        )
        .returning();
      if (!updated) throw new ORPCError("NOT_FOUND");
      await linkSourceDocumentToPerson(sourceDocumentId, person.id);
      return mapOfficialRecord(updated);
    }

    const [created] = await db
      .insert(officialRecords)
      .values({ personId: person.id, ...values })
      .returning();
    if (!created) throw new ORPCError("INTERNAL_SERVER_ERROR");
    await linkSourceDocumentToPerson(sourceDocumentId, person.id);
    return mapOfficialRecord(created);
  },
);

const deleteOfficialRecord = authorized.me.deleteOfficialRecord.handler(
  async ({ input, context }) => {
    const { person } = await resolvePerson(context, input.personId);
    const [removed] = await db
      .delete(officialRecords)
      .where(
        and(
          eq(officialRecords.id, input.recordId),
          eq(officialRecords.personId, person.id),
        ),
      )
      .returning({ id: officialRecords.id });
    if (!removed) throw new ORPCError("NOT_FOUND");
    return { removed: true as const };
  },
);

const savePersonalDate = authorized.me.savePersonalDate.handler(
  async ({ input, context }) => {
    const { person } = await resolvePerson(context, input.personId);
    const values = {
      label: input.label,
      occursOn: input.occursOn,
      recursAnnually: input.recursAnnually,
      updatedAt: new Date(),
    };

    if (input.id) {
      const [updated] = await db
        .update(personalDates)
        .set(values)
        .where(
          and(
            eq(personalDates.id, input.id),
            eq(personalDates.personId, person.id),
          ),
        )
        .returning();
      if (!updated) throw new ORPCError("NOT_FOUND");
      return mapPersonalDate(updated);
    }

    const [created] = await db
      .insert(personalDates)
      .values({ personId: person.id, ...values })
      .returning();
    if (!created) throw new ORPCError("INTERNAL_SERVER_ERROR");
    return mapPersonalDate(created);
  },
);

const deletePersonalDate = authorized.me.deletePersonalDate.handler(
  async ({ input, context }) => {
    const { person } = await resolvePerson(context, input.personId);
    const [removed] = await db
      .delete(personalDates)
      .where(
        and(
          eq(personalDates.id, input.dateId),
          eq(personalDates.personId, person.id),
        ),
      )
      .returning({ id: personalDates.id });
    if (!removed) throw new ORPCError("NOT_FOUND");
    return { removed: true as const };
  },
);

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function shiftDateKey(value: string, days: number) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function annualOccurrence(value: string, today: string) {
  const [, month = "01", rawDay = "01"] = value.split("-");

  function inYear(year: number) {
    const lastDay = new Date(Date.UTC(year, Number(month), 0)).getUTCDate();
    const day = Math.min(Number(rawDay), lastDay);
    return `${year}-${month}-${String(day).padStart(2, "0")}`;
  }

  const year = Number(today.slice(0, 4));
  const thisYear = inYear(year);
  return thisYear >= today ? thisYear : inYear(year + 1);
}

function compareFamilyMoments(left: FamilyMoment, right: FamilyMoment) {
  if (left.occursOn === right.occursOn) {
    return left.title.localeCompare(right.title);
  }
  if (left.occursOn === null) return -1;
  if (right.occursOn === null) return 1;
  return left.occursOn.localeCompare(right.occursOn);
}

async function buildFamilyDashboard(
  context: AuthorizedContext,
  organizationId?: string,
): Promise<FamilyDashboard | null> {
  const membership = await getHouseholdMembership(
    context.auth.user.id,
    organizationId,
  );
  if (!membership) {
    if (organizationId) {
      throw new ORPCError("FORBIDDEN", {
        message: "You do not belong to this Family.",
      });
    }
    return null;
  }

  const familyId = membership.organization.id;
  await ensureLinkedPeople(familyId);

  const [
    personRows,
    documentRows,
    recordRows,
    personalDateRows,
    projectRows,
    recurringRows,
  ] = await Promise.all([
    db
      .select()
      .from(people)
      .where(eq(people.organizationId, familyId))
      .orderBy(people.createdAt),
    db
      .select({
        id: entities.id,
        title: entities.title,
        kind: documents.kind,
        lifecycle: documents.lifecycle,
        expiresAt: documents.expiresAt,
        addedAt: documents.createdAt,
      })
      .from(documents)
      .innerJoin(entities, eq(documents.entityId, entities.id))
      .where(eq(entities.organizationId, familyId))
      .orderBy(desc(documents.createdAt)),
    db
      .select({
        id: officialRecords.id,
        personId: officialRecords.personId,
        personName: people.preferredName,
        recordType: officialRecords.recordType,
        title: officialRecords.title,
        expiryDate: officialRecords.expiryDate,
        status: officialRecords.status,
        sourceDocumentId: officialRecords.sourceDocumentId,
      })
      .from(officialRecords)
      .innerJoin(people, eq(officialRecords.personId, people.id))
      .where(eq(people.organizationId, familyId)),
    db
      .select({
        id: personalDates.id,
        personId: personalDates.personId,
        personName: people.preferredName,
        label: personalDates.label,
        occursOn: personalDates.occursOn,
        recursAnnually: personalDates.recursAnnually,
      })
      .from(personalDates)
      .innerJoin(people, eq(personalDates.personId, people.id))
      .where(eq(people.organizationId, familyId)),
    db
      .select({
        id: projects.entityId,
        title: entities.title,
        outcome: projects.outcome,
        coverImage: projects.coverImage,
        updatedAt: projects.updatedAt,
      })
      .from(projects)
      .innerJoin(entities, eq(projects.entityId, entities.id))
      .where(
        and(
          eq(entities.organizationId, familyId),
          eq(projects.status, "active"),
        ),
      )
      .orderBy(desc(projects.updatedAt)),
    db
      .select({
        id: recurringMoneyItems.entityId,
        title: entities.title,
        amountMinor: recurringMoneyItems.amountMinor,
        currency: recurringMoneyItems.currency,
        direction: recurringMoneyItems.direction,
        group: recurringMoneyItems.group,
        frequency: recurringMoneyItems.frequency,
        nextOccurrence: recurringMoneyItems.nextOccurrence,
      })
      .from(recurringMoneyItems)
      .innerJoin(entities, eq(recurringMoneyItems.entityId, entities.id))
      .where(
        and(
          eq(entities.organizationId, familyId),
          eq(recurringMoneyItems.isActive, true),
        ),
      ),
  ]);

  const viewerPerson = personRows.find(
    (person) => person.userId === context.auth.user.id,
  );
  if (!viewerPerson) {
    throw new ORPCError("INTERNAL_SERVER_ERROR", {
      message: "Your Family profile could not be prepared.",
    });
  }

  const documentIds = documentRows.map((row) => row.id);
  const projectIds = projectRows.map((row) => row.id);
  const recurringIds = recurringRows.map((row) => row.id);
  const entityIds = [...documentIds, ...projectIds, ...recurringIds];

  const [personLinks, moduleLinks, stepRows] = await Promise.all([
    entityIds.length > 0
      ? db
          .select({
            entityId: entityPeople.entityId,
            personId: entityPeople.personId,
          })
          .from(entityPeople)
          .where(inArray(entityPeople.entityId, entityIds))
      : Promise.resolve([] as Array<{ entityId: string; personId: string }>),
    entityIds.length > 0
      ? db
          .select({
            entityId: entityModules.entityId,
            module: entityModules.module,
          })
          .from(entityModules)
          .where(inArray(entityModules.entityId, entityIds))
      : Promise.resolve([] as Array<{ entityId: string; module: string }>),
    projectIds.length > 0
      ? db
          .select({
            id: projectSteps.id,
            projectId: projectSteps.projectId,
            parentStepId: projectSteps.parentStepId,
            title: projectSteps.title,
            status: projectSteps.status,
            position: projectSteps.position,
            dueDate: projectSteps.dueDate,
          })
          .from(projectSteps)
          .where(inArray(projectSteps.projectId, projectIds))
          .orderBy(projectSteps.projectId, projectSteps.position)
      : Promise.resolve(
          [] as Array<{
            id: string;
            projectId: string;
            parentStepId: string | null;
            title: string;
            status: "pending" | "active" | "completed";
            position: number;
            dueDate: string | null;
          }>,
        ),
  ]);

  const personIdsByEntity = new Map<string, string[]>();
  const modulesByEntity = new Map<string, string[]>();
  const stepsByProject = new Map<string, typeof stepRows>();
  for (const link of personLinks) {
    const linked = personIdsByEntity.get(link.entityId) ?? [];
    linked.push(link.personId);
    personIdsByEntity.set(link.entityId, linked);
  }
  for (const link of moduleLinks) {
    if (link.module === "documents") continue;
    const linked = modulesByEntity.get(link.entityId) ?? [];
    linked.push(link.module);
    modulesByEntity.set(link.entityId, linked);
  }
  for (const step of stepRows) {
    const linked = stepsByProject.get(step.projectId) ?? [];
    linked.push(step);
    stepsByProject.set(step.projectId, linked);
  }

  const personSummaries = personRows.map((person) =>
    mapPersonSummary(person, context.auth.user.id),
  );
  const peopleById = new Map(
    personSummaries.map((person) => [person.id, person]),
  );
  const linkedPeople = (entityId: string) =>
    (personIdsByEntity.get(entityId) ?? [])
      .map((personId) => peopleById.get(personId))
      .filter((person): person is PersonSummary => Boolean(person));

  const today = localDateKey();
  const upcomingCutoff = shiftDateKey(today, 13);
  const nearTermCutoff = shiftDateKey(today, 3);
  const attentionCutoff = shiftDateKey(today, 90);
  const moments: FamilyMoment[] = [];
  const recordSourceDocumentIds = new Set(
    recordRows
      .map((record) => record.sourceDocumentId)
      .filter((id): id is string => id !== null),
  );

  for (const record of recordRows) {
    const needsAttention =
      record.status !== "current" ||
      (record.expiryDate !== null && record.expiryDate <= attentionCutoff);
    if (!needsAttention) continue;

    moments.push({
      id: `official-record:${record.id}`,
      kind: "official_record",
      title: record.title,
      detail:
        record.status === "needs_review"
          ? "Needs review"
          : record.status === "expired"
            ? "Expired"
            : record.recordType,
      occursOn: record.expiryDate,
      tone: "attention",
      personIds: [record.personId],
      people: [record.personName],
      destination: "me",
      targetId: record.personId,
      amountMinor: null,
      currency: null,
    });
  }

  for (const document of documentRows) {
    if (
      document.expiresAt === null ||
      document.lifecycle !== "active" ||
      document.expiresAt > attentionCutoff ||
      recordSourceDocumentIds.has(document.id)
    ) {
      continue;
    }
    const linked = linkedPeople(document.id);
    moments.push({
      id: `document:${document.id}`,
      kind: "document",
      title: document.title,
      detail: document.kind,
      occursOn: document.expiresAt,
      tone: "attention",
      personIds: linked.map((person) => person.id),
      people: linked.map((person) => person.preferredName),
      destination: "documents",
      targetId: document.id,
      amountMinor: null,
      currency: null,
    });
  }

  for (const person of personRows) {
    if (!person.birthday) continue;
    moments.push({
      id: `birthday:${person.id}`,
      kind: "birthday",
      title: `${person.preferredName}’s birthday`,
      detail: "Birthday",
      occursOn: annualOccurrence(person.birthday, today),
      tone: "upcoming",
      personIds: [person.id],
      people: [person.preferredName],
      destination: "me",
      targetId: person.id,
      amountMinor: null,
      currency: null,
    });
  }

  for (const date of personalDateRows) {
    const occursOn = date.recursAnnually
      ? annualOccurrence(date.occursOn, today)
      : date.occursOn;
    if (occursOn < today) continue;
    moments.push({
      id: `personal-date:${date.id}`,
      kind: "personal_date",
      title: date.label,
      detail: date.personName,
      occursOn,
      tone: "upcoming",
      personIds: [date.personId],
      people: [date.personName],
      destination: "me",
      targetId: date.personId,
      amountMinor: null,
      currency: null,
    });
  }

  const sharedProjects = projectRows.slice(0, 6).map((project) => {
    const topLevelSteps = (stepsByProject.get(project.id) ?? []).filter(
      (step) => step.parentStepId === null,
    );
    const nextStep =
      topLevelSteps.find((step) => step.status === "active") ??
      topLevelSteps.find((step) => step.status === "pending") ??
      null;
    const linked = linkedPeople(project.id);

    if (nextStep?.dueDate) {
      moments.push({
        id: `project:${nextStep.id}`,
        kind: "project",
        title: nextStep.title,
        detail: project.title,
        occursOn: nextStep.dueDate,
        tone: nextStep.dueDate <= nearTermCutoff ? "attention" : "upcoming",
        personIds: linked.map((person) => person.id),
        people: linked.map((person) => person.preferredName),
        destination: "projects",
        targetId: project.id,
        amountMinor: null,
        currency: null,
      });
    }

    return {
      id: project.id,
      title: project.title,
      outcome: project.outcome,
      coverImage: project.coverImage,
      people: linked,
      modules: modulesByEntity.get(project.id) ?? [],
      nextStep: nextStep
        ? {
            id: nextStep.id,
            title: nextStep.title,
            dueDate: nextStep.dueDate,
          }
        : null,
      completedSteps: topLevelSteps.filter(
        (step) => step.status === "completed",
      ).length,
      totalSteps: topLevelSteps.length,
    };
  });

  for (const recurring of recurringRows) {
    const linked = linkedPeople(recurring.id);
    moments.push({
      id: `money:${recurring.id}`,
      kind: "money",
      title: recurring.title,
      detail: `${recurring.group} · ${recurring.frequency}`,
      occursOn: recurring.nextOccurrence,
      tone:
        recurring.direction === "expense" &&
        recurring.nextOccurrence <= nearTermCutoff
          ? "attention"
          : "upcoming",
      personIds: linked.map((person) => person.id),
      people: linked.map((person) => person.preferredName),
      destination: "money",
      targetId: recurring.id,
      amountMinor: recurring.amountMinor,
      currency: recurring.currency,
    });
  }

  const attention = moments
    .filter((moment) => moment.tone === "attention")
    .sort(compareFamilyMoments)
    .slice(0, 10);
  const upcoming = moments
    .filter(
      (moment) =>
        moment.occursOn !== null &&
        moment.occursOn >= today &&
        moment.occursOn <= upcomingCutoff,
    )
    .sort(compareFamilyMoments)
    .slice(0, 18);

  return {
    family: {
      id: membership.organization.id,
      name: membership.organization.name,
      slug: membership.organization.slug,
      logo: membership.organization.logo,
      createdAt: membership.organization.createdAt.toISOString(),
    },
    viewer: {
      userId: context.auth.user.id,
      personId: viewerPerson.id,
    },
    today,
    people: personSummaries,
    recentDocuments: documentRows.slice(0, 8).map((document) => {
      const linked = linkedPeople(document.id);
      return {
        id: document.id,
        title: document.title,
        kind: document.kind,
        people: linked.map((person) => person.preferredName),
        modules: modulesByEntity.get(document.id) ?? [],
        expiresAt: document.expiresAt,
        addedAt: document.addedAt.toISOString(),
      };
    }),
    attention,
    upcoming,
    sharedProjects,
    summary: {
      people: personRows.length,
      documents: documentRows.length,
      needsAttention: attention.length,
      sharedProjects: sharedProjects.length,
    },
  };
}

const familyBootstrap = authorized.family.bootstrap.handler(
  async ({ input, context }) =>
    buildFamilyDashboard(context, input.organizationId),
);

const listIncomingInvitations =
  authorized.family.listIncomingInvitations.handler(async ({ context }) => {
    const rows = await db
      .select({
        id: invitation.id,
        email: invitation.email,
        status: invitation.status,
        expiresAt: invitation.expiresAt,
        createdAt: invitation.createdAt,
        organizationId: organization.id,
        organizationName: organization.name,
        organizationSlug: organization.slug,
        inviterName: user.name,
      })
      .from(invitation)
      .innerJoin(organization, eq(invitation.organizationId, organization.id))
      .leftJoin(user, eq(invitation.inviterId, user.id))
      .where(
        and(
          sql`lower(${invitation.email}) = lower(${context.auth.user.email})`,
          eq(invitation.status, "pending"),
        ),
      )
      .orderBy(desc(invitation.createdAt));

    return rows.map((row) => ({
      ...row,
      expiresAt: row.expiresAt.toISOString(),
      createdAt: row.createdAt.toISOString(),
    }));
  });

const documentsRouter = createDocumentsRouter(authorized);
const fitnessRouter = createFitnessRouter(authorized);
const moneyRouter = createMoneyRouter(authorized);
const projectsRouter = createProjectsRouter(authorized);

export const lifeOsRouter = os.router({
  me: {
    bootstrap: meBootstrap,
    updateProfile: updatePersonProfile,
    saveFact: savePersonFact,
    deleteFact: deletePersonFact,
    saveOfficialRecord,
    deleteOfficialRecord,
    savePersonalDate,
    deletePersonalDate,
  },
  family: {
    bootstrap: familyBootstrap,
    listIncomingInvitations,
  },
  documents: documentsRouter,
  fitness: fitnessRouter,
  money: moneyRouter,
  projects: projectsRouter,
});
