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
  user,
} from "@lifeos/db";
import {
  lifeOsContract,
  type FamilyDashboard,
  type OfficialRecord,
  type PersonalDate,
  type PersonDashboard,
  type PersonFact,
  type PersonProfile,
  type PersonSummary,
} from "@lifeos/rpc";
import { implement, ORPCError } from "@orpc/server";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";

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

const requireAuth = os.middleware(async ({ context, next }) => {
  const session = await auth.api.getSession({ headers: context.headers });

  if (!session) {
    throw new ORPCError("UNAUTHORIZED", {
      message: "Sign in to continue.",
    });
  }

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

  await ensureLinkedPeople(membership.organization.id);
  const [personRows, documentRows] = await Promise.all([
    db
      .select()
      .from(people)
      .where(eq(people.organizationId, membership.organization.id))
      .orderBy(people.createdAt),
    db
      .select({
        id: entities.id,
        title: entities.title,
        kind: documents.kind,
        expiresAt: documents.expiresAt,
        addedAt: documents.createdAt,
      })
      .from(documents)
      .innerJoin(entities, eq(documents.entityId, entities.id))
      .where(eq(entities.organizationId, membership.organization.id))
      .orderBy(desc(documents.createdAt)),
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
  const [personLinks, moduleLinks] =
    documentIds.length > 0
      ? await Promise.all([
          db
            .select({
              entityId: entityPeople.entityId,
              personName: people.preferredName,
            })
            .from(entityPeople)
            .innerJoin(people, eq(entityPeople.personId, people.id))
            .where(inArray(entityPeople.entityId, documentIds)),
          db
            .select({
              entityId: entityModules.entityId,
              module: entityModules.module,
            })
            .from(entityModules)
            .where(inArray(entityModules.entityId, documentIds)),
        ])
      : [[], []];

  const peopleByEntity = new Map<string, string[]>();
  const modulesByEntity = new Map<string, string[]>();
  for (const link of personLinks) {
    const names = peopleByEntity.get(link.entityId) ?? [];
    names.push(link.personName);
    peopleByEntity.set(link.entityId, names);
  }
  for (const link of moduleLinks) {
    if (link.module === "documents") continue;
    const modules = modulesByEntity.get(link.entityId) ?? [];
    modules.push(link.module);
    modulesByEntity.set(link.entityId, modules);
  }

  const today = new Date();
  const attentionCutoff = new Date(today.getTime() + 90 * 86_400_000)
    .toISOString()
    .slice(0, 10);

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
    people: personRows.map((person) =>
      mapPersonSummary(person, context.auth.user.id),
    ),
    recentDocuments: documentRows.slice(0, 8).map((document) => ({
      id: document.id,
      title: document.title,
      kind: document.kind,
      people: peopleByEntity.get(document.id) ?? [],
      modules: modulesByEntity.get(document.id) ?? [],
      expiresAt: document.expiresAt,
      addedAt: document.addedAt.toISOString(),
    })),
    summary: {
      people: personRows.length,
      documents: documentRows.length,
      needsAttention: documentRows.filter(
        (document) =>
          document.expiresAt !== null && document.expiresAt <= attentionCutoff,
      ).length,
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
