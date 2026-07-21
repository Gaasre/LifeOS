import { tool } from "ai";
import type { LifeOsRpcClient } from "@lifeos/rpc";
import { z } from "zod";

export type AssistantPerspective =
  | { kind: "family" }
  | { kind: "person"; personId: string; personName?: string | undefined };

export type AssistantRequestContext = {
  pathname: string;
  localDate: string;
  perspective: AssistantPerspective;
};

export type AssistantActionResult = {
  ok: true;
  action: string;
  kind: "collection" | "record" | "receipt" | "navigation";
  title: string;
  summary: string;
  changed: boolean;
  href?: string;
  data?: unknown;
};

export type AssistantActionRisk = "read" | "write" | "confirm";

type ActionRuntime = {
  client: LifeOsRpcClient;
  context: AssistantRequestContext;
  familyCommands?: {
    create: (name: string) => Promise<{ id: string; name: string }>;
    invite: (
      organizationId: string,
      email: string,
    ) => Promise<{ id: string; email: string }>;
    respondToInvitation: (
      invitationId: string,
      response: "accept" | "reject",
    ) => Promise<{ organizationId?: string | undefined }>;
  };
};

const uuidSchema = z.string().uuid();
const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a YYYY-MM-DD date.");
const nullableText = (maximum: number) =>
  z.string().trim().max(maximum).nullable();

function requirePersonId(
  requestedPersonId: string | undefined,
  context: AssistantRequestContext,
) {
  if (requestedPersonId) return requestedPersonId;
  if (context.perspective.kind === "person") {
    return context.perspective.personId;
  }
  throw new Error(
    "This action needs a person. Ask which Family member it should apply to.",
  );
}

function result(
  action: string,
  values: Omit<AssistantActionResult, "ok" | "action">,
): AssistantActionResult {
  return { ok: true, action, ...values };
}

function summarizeProject(project: {
  id: string;
  title: string;
  outcome: string;
  whyItMatters: string | null;
  status: string;
  coverImage: string | null;
  people: Array<{ id: string; preferredName: string }>;
  modules: string[];
  relatedEntities: Array<{ id: string; type: string; title: string }>;
  documents: Array<{ id: string; title: string }>;
  steps: Array<{
    id: string;
    parentStepId: string | null;
    title: string;
    description: string | null;
    status: string;
    position: number;
    dueDate: string | null;
    documents: Array<{ id: string; title: string }>;
  }>;
}) {
  return {
    id: project.id,
    title: project.title,
    outcome: project.outcome,
    whyItMatters: project.whyItMatters,
    status: project.status,
    coverImage: project.coverImage,
    people: project.people,
    personIds: project.people.map((person) => person.id),
    modules: project.modules,
    relatedEntities: project.relatedEntities,
    relatedEntityIds: project.relatedEntities.map((entity) => entity.id),
    documents: project.documents,
    documentIds: project.documents.map((document) => document.id),
    steps: project.steps.map((step) => ({
      ...step,
      documentIds: step.documents.map((document) => document.id),
    })),
  };
}

function compactMoneyRelationships(record: {
  people: Array<{ id: string }>;
  documents: Array<{ id: string; role: string }>;
  relatedEntities: Array<{ id: string }>;
}) {
  return {
    personIds: record.people.map((person) => person.id),
    relatedEntityIds: record.relatedEntities.map((entity) => entity.id),
    sourceDocumentId:
      record.documents.find((document) => document.role === "source")?.id ??
      null,
    relatedDocumentIds: record.documents
      .filter((document) => document.role !== "source")
      .map((document) => document.id),
  };
}

function defineAction<SCHEMA extends z.ZodType, OUTPUT>(config: {
  name: string;
  domain: string;
  description: string;
  aliases: string[];
  risk: AssistantActionRisk;
  inputSchema: SCHEMA;
  execute: (input: z.infer<SCHEMA>) => Promise<OUTPUT>;
}) {
  // AI SDK accepts Standard Schema (including Zod 4), but its overload also
  // carries a legacy Zod 3 branch. Keep that compatibility detail contained at
  // this adapter boundary so every action retains precise inferred input types.
  const actionTool = tool({
    description: config.description,
    inputSchema: config.inputSchema,
    needsApproval: config.risk === "confirm",
    execute: config.execute,
  } as any);

  return {
    name: config.name,
    domain: config.domain,
    description: config.description,
    aliases: config.aliases,
    risk: config.risk,
    tool: actionTool,
  };
}

export function createAssistantActions({
  client,
  context,
  familyCommands,
}: ActionRuntime) {
  let mutationQueue = Promise.resolve();
  const serial =
    <INPUT, OUTPUT>(execute: (input: INPUT) => Promise<OUTPUT>) =>
    async (input: INPUT) => {
      const current = mutationQueue.then(() => execute(input));
      mutationQueue = current.then(
        () => undefined,
        () => undefined,
      );
      return current;
    };

  const personTargetSchema = z.object({
    personId: uuidSchema
      .optional()
      .describe("Person UUID. Omit to use the current person perspective."),
  });
  const relationshipSchema = {
    personIds: z.array(uuidSchema).max(10).optional(),
    relatedEntityIds: z.array(uuidSchema).max(30).optional(),
    sourceDocumentId: uuidSchema.nullable().optional(),
    relatedDocumentIds: z.array(uuidSchema).max(20).optional(),
  };

  const actions = [
    defineAction({
      name: "find_person_information",
      domain: "me",
      risk: "read",
      aliases: [
        "who am i",
        "personal details",
        "preferences",
        "facts",
        "ring size",
        "passport",
        "birthday",
      ],
      description:
        "Find profile fields, personal facts, official records, or personal dates for one person. Use an empty query for the complete editable profile.",
      inputSchema: personTargetSchema.extend({
        query: z.string().trim().max(160).optional(),
      }),
      execute: async ({ personId, query }) => {
        const resolvedPersonId = requirePersonId(personId, context);
        const dashboard = await client.me.bootstrap({
          personId: resolvedPersonId,
        });
        if (!dashboard) throw new Error("That person could not be found.");

        const needle = query?.trim().toLocaleLowerCase();
        const matches = (...values: Array<string | null | undefined>) =>
          !needle ||
          values.some((value) => value?.toLocaleLowerCase().includes(needle));
        const facts = dashboard.facts.filter((item) =>
          matches(item.label, item.key, item.value),
        );
        const officialRecords = dashboard.officialRecords.filter((item) =>
          matches(item.title, item.recordType, item.identifier, item.country),
        );
        const personalDates = dashboard.personalDates.filter((item) =>
          matches(item.label, item.occursOn),
        );

        return result("find_person_information", {
          kind: "record",
          title: dashboard.profile.preferredName,
          summary: needle
            ? `Found ${facts.length + officialRecords.length + personalDates.length} matching item(s).`
            : "Loaded the current personal profile and related information.",
          changed: false,
          href: `/people/${resolvedPersonId}`,
          data: {
            profile: {
              preferredName: dashboard.profile.preferredName,
              legalName: dashboard.profile.legalName,
              birthday: dashboard.profile.birthday,
              placeOfBirth: dashboard.profile.placeOfBirth,
              nationality: dashboard.profile.nationality,
              currentCity: dashboard.profile.currentCity,
              currentAddress: dashboard.profile.currentAddress,
              maritalStatus: dashboard.profile.maritalStatus,
              languages: dashboard.profile.languages,
            },
            facts: facts.slice(0, 20),
            officialRecords: officialRecords.slice(0, 20),
            personalDates: personalDates.slice(0, 20),
          },
        });
      },
    }),
    defineAction({
      name: "update_person_profile",
      domain: "me",
      risk: "write",
      aliases: ["change name", "update address", "move city", "nationality"],
      description:
        "Update a person's core profile. This replaces all editable profile fields, so first call find_person_information and preserve values the user did not ask to change.",
      inputSchema: personTargetSchema.extend({
        preferredName: z.string().trim().min(1).max(100),
        legalName: nullableText(140),
        birthday: dateSchema.nullable(),
        placeOfBirth: nullableText(140),
        nationality: nullableText(120),
        currentCity: nullableText(140),
        currentAddress: nullableText(500),
        maritalStatus: nullableText(80),
        languages: z.array(z.string().trim().min(1).max(80)).max(20),
      }),
      execute: serial(async ({ personId, ...profile }) => {
        const resolvedPersonId = requirePersonId(personId, context);
        const updated = await client.me.updateProfile({
          personId: resolvedPersonId,
          ...profile,
        });
        return result("update_person_profile", {
          kind: "receipt",
          title: "Profile updated",
          summary: `${updated.preferredName}'s profile is up to date.`,
          changed: true,
          href: `/people/${resolvedPersonId}`,
          data: {
            preferredName: updated.preferredName,
            updatedAt: updated.updatedAt,
          },
        });
      }),
    }),
    defineAction({
      name: "save_person_fact",
      domain: "me",
      risk: "write",
      aliases: [
        "ring size",
        "shoe size",
        "favorite",
        "preference",
        "personal detail",
        "update fact",
      ],
      description:
        "Create or update a personal detail or preference such as ring size, shoe size, favorite food, or communication preference. For updates, find the existing fact first and pass its id.",
      inputSchema: personTargetSchema.extend({
        id: uuidSchema.optional().describe("Existing fact UUID when updating."),
        key: z
          .string()
          .trim()
          .min(1)
          .max(80)
          .regex(/^[a-z0-9_-]+$/)
          .optional()
          .describe("Stable snake-case key, for example ring_size."),
        kind: z.enum(["personal_detail", "preference"]),
        label: z.string().trim().min(1).max(80),
        value: z.string().trim().min(1).max(500),
        sourceDocumentId: uuidSchema.nullable().optional(),
      }),
      execute: serial(async ({ personId, sourceDocumentId, ...fact }) => {
        const resolvedPersonId = requirePersonId(personId, context);
        const saved = await client.me.saveFact({
          personId: resolvedPersonId,
          ...fact,
          sourceDocumentId: sourceDocumentId ?? null,
        });
        return result("save_person_fact", {
          kind: "receipt",
          title: `${saved.label} saved`,
          summary: `${saved.label} is now ${saved.value}.`,
          changed: true,
          href: `/people/${resolvedPersonId}`,
          data: { id: saved.id, label: saved.label, value: saved.value },
        });
      }),
    }),
    defineAction({
      name: "delete_person_fact",
      domain: "me",
      risk: "confirm",
      aliases: ["remove personal detail", "delete preference", "forget fact"],
      description: "Permanently remove a personal fact or preference.",
      inputSchema: personTargetSchema.extend({ factId: uuidSchema }),
      execute: serial(async ({ personId, factId }) => {
        const resolvedPersonId = requirePersonId(personId, context);
        await client.me.deleteFact({ personId: resolvedPersonId, factId });
        return result("delete_person_fact", {
          kind: "receipt",
          title: "Personal detail removed",
          summary: "The selected personal detail was removed.",
          changed: true,
          href: `/people/${resolvedPersonId}`,
        });
      }),
    }),
    defineAction({
      name: "save_official_record",
      domain: "me",
      risk: "write",
      aliases: ["passport record", "id card", "permit", "official document"],
      description:
        "Create or update an official record. Pass id when updating an existing record.",
      inputSchema: personTargetSchema.extend({
        id: uuidSchema.optional(),
        recordType: z.string().trim().min(1).max(80),
        title: z.string().trim().min(1).max(120),
        identifier: nullableText(160),
        issuingAuthority: nullableText(160),
        country: nullableText(120),
        issueDate: dateSchema.nullable(),
        expiryDate: dateSchema.nullable(),
        status: z.enum(["current", "needs_review", "expired"]),
        sourceDocumentId: uuidSchema.nullable(),
      }),
      execute: serial(async ({ personId, ...record }) => {
        const resolvedPersonId = requirePersonId(personId, context);
        const saved = await client.me.saveOfficialRecord({
          personId: resolvedPersonId,
          ...record,
        });
        return result("save_official_record", {
          kind: "receipt",
          title: `${saved.title} saved`,
          summary: "The official record is up to date.",
          changed: true,
          href: `/people/${resolvedPersonId}`,
          data: { id: saved.id, title: saved.title, status: saved.status },
        });
      }),
    }),
    defineAction({
      name: "delete_official_record",
      domain: "me",
      risk: "confirm",
      aliases: ["remove passport record", "delete official record"],
      description: "Permanently remove an official record from a person.",
      inputSchema: personTargetSchema.extend({ recordId: uuidSchema }),
      execute: serial(async ({ personId, recordId }) => {
        const resolvedPersonId = requirePersonId(personId, context);
        await client.me.deleteOfficialRecord({
          personId: resolvedPersonId,
          recordId,
        });
        return result("delete_official_record", {
          kind: "receipt",
          title: "Official record removed",
          summary: "The selected official record was removed.",
          changed: true,
          href: `/people/${resolvedPersonId}`,
        });
      }),
    }),
    defineAction({
      name: "save_personal_date",
      domain: "me",
      risk: "write",
      aliases: ["anniversary", "important date", "birthday reminder"],
      description:
        "Create or update an important personal date. Pass id when updating.",
      inputSchema: personTargetSchema.extend({
        id: uuidSchema.optional(),
        label: z.string().trim().min(1).max(120),
        occursOn: dateSchema,
        recursAnnually: z.boolean(),
      }),
      execute: serial(async ({ personId, ...date }) => {
        const resolvedPersonId = requirePersonId(personId, context);
        const saved = await client.me.savePersonalDate({
          personId: resolvedPersonId,
          ...date,
        });
        return result("save_personal_date", {
          kind: "receipt",
          title: `${saved.label} saved`,
          summary: `Scheduled for ${saved.occursOn}${saved.recursAnnually ? " every year" : ""}.`,
          changed: true,
          href: `/people/${resolvedPersonId}`,
          data: saved,
        });
      }),
    }),
    defineAction({
      name: "delete_personal_date",
      domain: "me",
      risk: "confirm",
      aliases: ["remove anniversary", "delete important date"],
      description: "Permanently remove an important personal date.",
      inputSchema: personTargetSchema.extend({ dateId: uuidSchema }),
      execute: serial(async ({ personId, dateId }) => {
        const resolvedPersonId = requirePersonId(personId, context);
        await client.me.deletePersonalDate({
          personId: resolvedPersonId,
          dateId,
        });
        return result("delete_personal_date", {
          kind: "receipt",
          title: "Personal date removed",
          summary: "The selected date was removed.",
          changed: true,
          href: `/people/${resolvedPersonId}`,
        });
      }),
    }),
    defineAction({
      name: "get_family_overview",
      domain: "family",
      risk: "read",
      aliases: ["family", "household", "people", "upcoming", "attention"],
      description:
        "Get Family members, current attention items, upcoming dates, recent documents, and shared projects.",
      inputSchema: z.object({ organizationId: z.string().optional() }),
      execute: async ({ organizationId }) => {
        const dashboard = await client.family.bootstrap({ organizationId });
        if (!dashboard) {
          return result("get_family_overview", {
            kind: "navigation",
            title: "No Family workspace yet",
            summary: "Open Family to create or join a household.",
            changed: false,
            href: "/family",
          });
        }
        return result("get_family_overview", {
          kind: "collection",
          title: dashboard.family.name,
          summary: `${dashboard.summary.people} people · ${dashboard.summary.needsAttention} item(s) need attention.`,
          changed: false,
          href: "/family",
          data: {
            people: dashboard.people,
            attention: dashboard.attention.slice(0, 10),
            upcoming: dashboard.upcoming.slice(0, 10),
            recentDocuments: dashboard.recentDocuments.slice(0, 8),
            sharedProjects: dashboard.sharedProjects.slice(0, 8),
          },
        });
      },
    }),
    defineAction({
      name: "list_family_invitations",
      domain: "family",
      risk: "read",
      aliases: ["invitations", "family invite", "join household"],
      description: "List pending Family invitations for the signed-in user.",
      inputSchema: z.object({}),
      execute: async () => {
        const invitations = await client.family.listIncomingInvitations({});
        return result("list_family_invitations", {
          kind: "collection",
          title: "Family invitations",
          summary: `${invitations.length} pending invitation(s).`,
          changed: false,
          href: "/invitations",
          data: { items: invitations },
        });
      },
    }),
    defineAction({
      name: "create_family",
      domain: "family",
      risk: "confirm",
      aliases: ["create family", "start household", "new family"],
      description:
        "Create a Family workspace and make it active. This is a major workspace change and requires approval.",
      inputSchema: z.object({
        name: z.string().trim().min(1).max(80),
      }),
      execute: serial(async ({ name }) => {
        if (!familyCommands) {
          throw new Error("Family commands are not available in this session.");
        }
        const family = await familyCommands.create(name);
        return result("create_family", {
          kind: "receipt",
          title: `${family.name} created`,
          summary: "The new Family workspace is active.",
          changed: true,
          href: "/family",
          data: family,
        });
      }),
    }),
    defineAction({
      name: "invite_family_member",
      domain: "family",
      risk: "confirm",
      aliases: [
        "invite partner",
        "invite family member",
        "send family invitation",
      ],
      description:
        "Invite one person by email to the current Family. This sends an external invitation and requires approval.",
      inputSchema: z.object({
        organizationId: z.string().optional(),
        email: z.string().email(),
      }),
      execute: serial(async ({ organizationId, email }) => {
        if (!familyCommands) {
          throw new Error("Family commands are not available in this session.");
        }
        const dashboard = organizationId
          ? null
          : await client.family.bootstrap({});
        const resolvedOrganizationId = organizationId ?? dashboard?.family.id;
        if (!resolvedOrganizationId) {
          throw new Error(
            "Create or select a Family before sending an invitation.",
          );
        }
        const invitation = await familyCommands.invite(
          resolvedOrganizationId,
          email.toLocaleLowerCase(),
        );
        return result("invite_family_member", {
          kind: "receipt",
          title: "Family invitation sent",
          summary: `An invitation was sent to ${invitation.email}.`,
          changed: true,
          href: "/family",
          data: { email: invitation.email },
        });
      }),
    }),
    defineAction({
      name: "respond_to_family_invitation",
      domain: "family",
      risk: "confirm",
      aliases: [
        "accept family invitation",
        "decline family invitation",
        "reject family invite",
        "join family",
      ],
      description:
        "Accept or reject a pending Family invitation. Accepting may merge the personal workspace into that Family and requires approval.",
      inputSchema: z.object({
        invitationId: z.string().min(1),
        response: z.enum(["accept", "reject"]),
      }),
      execute: serial(async ({ invitationId, response }) => {
        if (!familyCommands) {
          throw new Error("Family commands are not available in this session.");
        }
        await familyCommands.respondToInvitation(invitationId, response);
        return result("respond_to_family_invitation", {
          kind: "receipt",
          title:
            response === "accept"
              ? "Family invitation accepted"
              : "Family invitation declined",
          summary:
            response === "accept"
              ? "The Family workspace is now active."
              : "The invitation was declined.",
          changed: true,
          href: response === "accept" ? "/family" : "/invitations",
        });
      }),
    }),
    defineAction({
      name: "list_documents",
      domain: "documents",
      risk: "read",
      aliases: ["documents", "files", "receipts", "contracts", "passport"],
      description:
        "List documents, optionally for the current person perspective. Returns metadata only, never file contents.",
      inputSchema: personTargetSchema.extend({
        limit: z.number().int().min(1).max(30).optional(),
      }),
      execute: async ({ personId, limit }) => {
        const resolvedPersonId =
          personId ??
          (context.perspective.kind === "person"
            ? context.perspective.personId
            : undefined);
        const documents = await client.documents.list(
          resolvedPersonId ? { personId: resolvedPersonId } : {},
        );
        const items = documents.slice(0, limit ?? 20).map((document) => ({
          id: document.id,
          title: document.title,
          filename: document.filename,
          kind: document.kind,
          issuer: document.issuer,
          status: document.status,
          expiresAt: document.expiresAt,
          people: document.people,
          modules: document.modules,
          addedAt: document.addedAt,
        }));
        return result("list_documents", {
          kind: "collection",
          title: "Documents",
          summary: `${documents.length} document(s) found.`,
          changed: false,
          href: "/documents",
          data: { items, total: documents.length },
        });
      },
    }),
    defineAction({
      name: "search_documents",
      domain: "documents",
      risk: "read",
      aliases: [
        "find document",
        "search files",
        "look up receipt",
        "find passport",
      ],
      description: "Search document titles, filenames, kinds, and issuers.",
      inputSchema: z.object({
        query: z.string().trim().min(1).max(160),
        limit: z.number().int().min(1).max(30).optional(),
      }),
      execute: async ({ query, limit }) => {
        const page = await client.documents.search({
          query,
          offset: 0,
          limit: limit ?? 20,
        });
        return result("search_documents", {
          kind: "collection",
          title: `Documents matching “${query}”`,
          summary: `${page.total} match(es).`,
          changed: false,
          href: "/documents",
          data: { items: page.items, total: page.total },
        });
      },
    }),
    defineAction({
      name: "set_document_relationships",
      domain: "documents",
      risk: "write",
      aliases: ["link document", "assign document", "document module"],
      description: "Change which people and modules a document is linked to.",
      inputSchema: z.object({
        documentId: uuidSchema,
        personIds: z.array(uuidSchema).max(2),
        modules: z
          .array(
            z.enum([
              "home",
              "money",
              "health",
              "work",
              "travel",
              "projects",
              "memories",
            ]),
          )
          .max(7),
      }),
      execute: serial(async (input) => {
        const document = await client.documents.setRelationships(input);
        return result("set_document_relationships", {
          kind: "receipt",
          title: `${document.title} updated`,
          summary: "Document relationships were updated.",
          changed: true,
          href: "/documents",
          data: {
            id: document.id,
            people: document.people,
            modules: document.modules,
          },
        });
      }),
    }),
    defineAction({
      name: "set_document_archived",
      domain: "documents",
      risk: "confirm",
      aliases: ["archive document", "restore document"],
      description: "Archive or restore a document. Requires confirmation.",
      inputSchema: z.object({ documentId: uuidSchema, archived: z.boolean() }),
      execute: serial(async (input) => {
        const document = await client.documents.setArchived(input);
        return result("set_document_archived", {
          kind: "receipt",
          title: input.archived ? "Document archived" : "Document restored",
          summary: `${document.title} is now ${input.archived ? "archived" : "current"}.`,
          changed: true,
          href: "/documents",
          data: {
            id: document.id,
            title: document.title,
            status: document.status,
          },
        });
      }),
    }),
    defineAction({
      name: "delete_document",
      domain: "documents",
      risk: "confirm",
      aliases: ["delete file", "remove document"],
      description: "Permanently delete a LifeOS document and its stored file.",
      inputSchema: z.object({ documentId: uuidSchema }),
      execute: serial(async ({ documentId }) => {
        await client.documents.delete({ documentId });
        return result("delete_document", {
          kind: "receipt",
          title: "Document deleted",
          summary: "The document and its stored file were deleted.",
          changed: true,
          href: "/documents",
        });
      }),
    }),
    defineAction({
      name: "list_projects",
      domain: "projects",
      risk: "read",
      aliases: ["projects", "plans", "tasks", "steps", "what am i working on"],
      description:
        "List projects and their steps. Use this before updating an existing project or step to obtain IDs and preserve unchanged fields.",
      inputSchema: personTargetSchema,
      execute: async ({ personId }) => {
        const resolvedPersonId =
          personId ??
          (context.perspective.kind === "person"
            ? context.perspective.personId
            : undefined);
        const projects = await client.projects.list(
          resolvedPersonId ? { personId: resolvedPersonId } : {},
        );
        return result("list_projects", {
          kind: "collection",
          title: "Projects",
          summary: `${projects.length} project(s).`,
          changed: false,
          href: "/projects",
          data: { items: projects.slice(0, 25).map(summarizeProject) },
        });
      },
    }),
    defineAction({
      name: "create_project",
      domain: "projects",
      risk: "write",
      aliases: ["new project", "start project", "create plan"],
      description: "Create a new project, optionally with its first step.",
      inputSchema: z.object({
        title: z.string().trim().min(1).max(160),
        outcome: z.string().trim().min(1).max(300),
        whyItMatters: nullableText(800),
        coverImage: nullableText(500),
        personIds: z.array(uuidSchema).max(10).optional(),
        modules: z
          .array(
            z.enum(["home", "money", "health", "work", "travel", "memories"]),
          )
          .max(6)
          .optional(),
        relatedEntityIds: z.array(uuidSchema).max(30).optional(),
        firstStep: nullableText(180),
      }),
      execute: serial(async (input) => {
        const project = await client.projects.create({
          ...input,
          personIds:
            input.personIds ??
            (context.perspective.kind === "person"
              ? [context.perspective.personId]
              : []),
          modules: input.modules ?? [],
          relatedEntityIds: input.relatedEntityIds ?? [],
        });
        return result("create_project", {
          kind: "receipt",
          title: `${project.title} created`,
          summary: project.outcome,
          changed: true,
          href: "/projects",
          data: summarizeProject(project),
        });
      }),
    }),
    defineAction({
      name: "update_project",
      domain: "projects",
      risk: "write",
      aliases: ["rename project", "edit project", "change project outcome"],
      description:
        "Update a project's main details and relationships. This replaces those fields; call list_projects first and preserve anything the user did not ask to change.",
      inputSchema: z.object({
        projectId: uuidSchema,
        title: z.string().trim().min(1).max(160),
        outcome: z.string().trim().min(1).max(300),
        whyItMatters: nullableText(800),
        coverImage: nullableText(500),
        personIds: z.array(uuidSchema).max(10),
        modules: z
          .array(
            z.enum(["home", "money", "health", "work", "travel", "memories"]),
          )
          .max(6),
        relatedEntityIds: z.array(uuidSchema).max(30),
      }),
      execute: serial(async (input) => {
        const project = await client.projects.update(input);
        return result("update_project", {
          kind: "receipt",
          title: `${project.title} updated`,
          summary: project.outcome,
          changed: true,
          href: "/projects",
          data: summarizeProject(project),
        });
      }),
    }),
    defineAction({
      name: "set_project_status",
      domain: "projects",
      risk: "write",
      aliases: ["pause project", "resume project", "activate project"],
      description: "Pause or reactivate a project.",
      inputSchema: z.object({
        projectId: uuidSchema,
        status: z.enum(["active", "paused"]),
      }),
      execute: serial(async (input) => {
        const project = await client.projects.setStatus(input);
        return result("set_project_status", {
          kind: "receipt",
          title: `${project.title} ${project.status}`,
          summary: `Project status changed to ${project.status}.`,
          changed: true,
          href: "/projects",
          data: {
            id: project.id,
            title: project.title,
            status: project.status,
          },
        });
      }),
    }),
    defineAction({
      name: "add_project_step",
      domain: "projects",
      risk: "write",
      aliases: ["add task", "new project step", "next step"],
      description: "Add a step or nested step to a project.",
      inputSchema: z.object({
        projectId: uuidSchema,
        parentStepId: uuidSchema.nullable().optional(),
        title: z.string().trim().min(1).max(180),
        description: nullableText(800).optional(),
        dueDate: dateSchema.nullable().optional(),
        documentIds: z.array(uuidSchema).max(20).optional(),
      }),
      execute: serial(
        async ({
          parentStepId,
          description,
          dueDate,
          documentIds,
          ...input
        }) => {
          const project = await client.projects.addStep({
            ...input,
            parentStepId: parentStepId ?? null,
            description: description ?? null,
            dueDate: dueDate ?? null,
            documentIds: documentIds ?? [],
          });
          return result("add_project_step", {
            kind: "receipt",
            title: "Project step added",
            summary: `${input.title} was added to ${project.title}.`,
            changed: true,
            href: "/projects",
            data: summarizeProject(project),
          });
        },
      ),
    }),
    defineAction({
      name: "update_project_step",
      domain: "projects",
      risk: "write",
      aliases: ["edit task", "rename project step", "change step due date"],
      description:
        "Update a project step. This replaces its details; call list_projects first and preserve unchanged values.",
      inputSchema: z.object({
        stepId: uuidSchema,
        title: z.string().trim().min(1).max(180),
        description: nullableText(800),
        dueDate: dateSchema.nullable(),
        documentIds: z.array(uuidSchema).max(20),
      }),
      execute: serial(async (input) => {
        const project = await client.projects.updateStep(input);
        return result("update_project_step", {
          kind: "receipt",
          title: "Project step updated",
          summary: `${input.title} is up to date.`,
          changed: true,
          href: "/projects",
          data: summarizeProject(project),
        });
      }),
    }),
    defineAction({
      name: "set_project_step_completed",
      domain: "projects",
      risk: "write",
      aliases: ["complete task", "finish step", "reopen step", "mark done"],
      description: "Mark a project step completed or reopen it.",
      inputSchema: z.object({ stepId: uuidSchema, completed: z.boolean() }),
      execute: serial(async (input) => {
        const project = await client.projects.setStepCompleted(input);
        return result("set_project_step_completed", {
          kind: "receipt",
          title: input.completed ? "Step completed" : "Step reopened",
          summary: `${project.completedSteps} of ${project.totalSteps} project steps completed.`,
          changed: true,
          href: "/projects",
          data: summarizeProject(project),
        });
      }),
    }),
    defineAction({
      name: "reorder_project_steps",
      domain: "projects",
      risk: "write",
      aliases: ["reorder tasks", "move project step", "change step order"],
      description:
        "Set the complete top-level step order for a project. Call list_projects first and include every top-level step ID in the desired order.",
      inputSchema: z.object({
        projectId: uuidSchema,
        stepIds: z.array(uuidSchema).max(100),
      }),
      execute: serial(async (input) => {
        const project = await client.projects.reorderSteps(input);
        return result("reorder_project_steps", {
          kind: "receipt",
          title: "Project steps reordered",
          summary: `${project.title}'s step order was updated.`,
          changed: true,
          href: "/projects",
          data: summarizeProject(project),
        });
      }),
    }),
    defineAction({
      name: "set_project_documents",
      domain: "projects",
      risk: "write",
      aliases: [
        "attach project document",
        "remove project document",
        "link file to project",
      ],
      description: "Replace the documents linked to a project.",
      inputSchema: z.object({
        projectId: uuidSchema,
        documentIds: z.array(uuidSchema).max(30),
      }),
      execute: serial(async (input) => {
        const project = await client.projects.setProjectDocuments(input);
        return result("set_project_documents", {
          kind: "receipt",
          title: "Project documents updated",
          summary: `${project.documents.length} document(s) are linked to ${project.title}.`,
          changed: true,
          href: "/projects",
          data: summarizeProject(project),
        });
      }),
    }),
    defineAction({
      name: "get_money_overview",
      domain: "money",
      risk: "read",
      aliases: [
        "money",
        "balance",
        "safe to spend",
        "accounts",
        "budget",
        "income",
        "expenses",
        "goals",
      ],
      description:
        "Get balances, safe-to-spend, recurring money, recent entries, financial goals, and decisions. Use before modifying existing money records.",
      inputSchema: personTargetSchema,
      execute: async ({ personId }) => {
        const resolvedPersonId =
          personId ??
          (context.perspective.kind === "person"
            ? context.perspective.personId
            : undefined);
        const dashboard = await client.money.bootstrap(
          resolvedPersonId ? { personId: resolvedPersonId } : {},
        );
        return result("get_money_overview", {
          kind: "collection",
          title: "Money overview",
          summary: dashboard.status.message,
          changed: false,
          href: "/money",
          data: {
            settings: dashboard.settings,
            summary: dashboard.summary,
            monthlyFlow: dashboard.monthlyFlow,
            accounts: dashboard.accounts.slice(0, 20).map((account) => ({
              id: account.id,
              name: account.name,
              type: account.type,
              institution: account.institution,
              balanceMinor: account.balanceMinor,
              currency: account.currency,
              includeInAvailableBalance: account.includeInAvailableBalance,
              archived: account.archived,
              notes: account.notes,
              ...compactMoneyRelationships(account),
            })),
            recurring: dashboard.recurring.slice(0, 20).map((item) => ({
              id: item.id,
              title: item.title,
              amountMinor: item.amountMinor,
              currency: item.currency,
              direction: item.direction,
              group: item.group,
              frequency: item.frequency,
              nextOccurrence: item.nextOccurrence,
              startDate: item.startDate,
              endDate: item.endDate,
              accountId: item.accountId,
              category: item.category,
              state: item.state,
              isVariable: item.isVariable,
              notes: item.notes,
              ...compactMoneyRelationships(item),
            })),
            activity: dashboard.activity.slice(0, 12).map((entry) => ({
              id: entry.id,
              title: entry.title,
              amountMinor: entry.amountMinor,
              currency: entry.currency,
              direction: entry.direction,
              occurredAt: entry.occurredAt,
              accountId: entry.accountId,
              category: entry.category,
            })),
            goals: dashboard.goals.slice(0, 20).map((goal) => ({
              id: goal.id,
              title: goal.title,
              targetAmountMinor: goal.targetAmountMinor,
              currentAmountMinor: goal.currentAmountMinor,
              currency: goal.currency,
              targetDate: goal.targetDate,
              recurringContributionMinor: goal.recurringContributionMinor,
              relatedAccountId: goal.relatedAccountId,
              relatedProjectId: goal.relatedProjectId,
              excludeFromSafeToSpend: goal.excludeFromSafeToSpend,
              status: goal.status,
              notes: goal.notes,
              ...compactMoneyRelationships(goal),
            })),
            decisions: dashboard.decisions.slice(0, 12).map((decision) => ({
              id: decision.id,
              title: decision.title,
              description: decision.description,
              status: decision.status,
              relatedProjectId: decision.relatedProjectId,
              notes: decision.notes,
              selectedOptionId:
                decision.options.find((option) => option.selected)?.id ?? null,
              options: decision.options.map((option) => ({
                id: option.id,
                title: option.title,
                monthlyImpactMinor: option.monthlyImpactMinor,
                upfrontCostMinor: option.upfrontCostMinor,
                annualImpactMinor: option.annualImpactMinor,
                currency: option.currency,
                notes: option.notes,
              })),
              ...compactMoneyRelationships(decision),
            })),
            warnings: dashboard.calculation.warnings,
          },
        });
      },
    }),
    defineAction({
      name: "save_money_settings",
      domain: "money",
      risk: "confirm",
      aliases: ["change currency", "safety buffer", "money settings"],
      description:
        "Change the workspace currency and safe-to-spend safety buffer. Amounts are integer minor units (for example cents).",
      inputSchema: z.object({
        currency: z.string().regex(/^[A-Z]{3}$/),
        safetyBufferMinor: z.number().int().nonnegative().max(2_000_000_000),
      }),
      execute: serial(async (input) => {
        const settings = await client.money.saveSettings(input);
        return result("save_money_settings", {
          kind: "receipt",
          title: "Money settings updated",
          summary: `Currency is ${settings.currency}; safety buffer is ${settings.safetyBufferMinor} minor units.`,
          changed: true,
          href: "/money",
          data: settings,
        });
      }),
    }),
    defineAction({
      name: "save_money_account",
      domain: "money",
      risk: "confirm",
      aliases: [
        "add bank account",
        "update balance",
        "savings account",
        "cash balance",
      ],
      description:
        "Create or update a money account and balance. Amounts are integer minor units. For updates, call get_money_overview first and pass accountId plus all existing fields.",
      inputSchema: z.object({
        accountId: uuidSchema.optional(),
        name: z.string().trim().min(1).max(120),
        type: z.enum(["bank", "savings", "cash", "investment", "other"]),
        institution: nullableText(120),
        balanceMinor: z.number().int().min(-2_000_000_000).max(2_000_000_000),
        currency: z.string().regex(/^[A-Z]{3}$/),
        includeInAvailableBalance: z.boolean(),
        notes: nullableText(800),
        ...relationshipSchema,
      }),
      execute: serial(async (input) => {
        const account = await client.money.saveAccount({
          ...input,
          personIds:
            input.personIds ??
            (context.perspective.kind === "person"
              ? [context.perspective.personId]
              : []),
          relatedEntityIds: input.relatedEntityIds ?? [],
          sourceDocumentId: input.sourceDocumentId ?? null,
          relatedDocumentIds: input.relatedDocumentIds ?? [],
        });
        return result("save_money_account", {
          kind: "receipt",
          title: `${account.name} saved`,
          summary: `Balance is ${account.balanceMinor} ${account.currency} minor units.`,
          changed: true,
          href: "/money",
          data: account,
        });
      }),
    }),
    defineAction({
      name: "set_money_account_archived",
      domain: "money",
      risk: "confirm",
      aliases: ["archive account", "restore account"],
      description: "Archive or restore a money account.",
      inputSchema: z.object({ accountId: uuidSchema, archived: z.boolean() }),
      execute: serial(async (input) => {
        const account = await client.money.setAccountArchived(input);
        return result("set_money_account_archived", {
          kind: "receipt",
          title: input.archived ? "Account archived" : "Account restored",
          summary: `${account.name} is ${input.archived ? "archived" : "active"}.`,
          changed: true,
          href: "/money",
          data: {
            id: account.id,
            name: account.name,
            archived: account.archived,
          },
        });
      }),
    }),
    defineAction({
      name: "create_money_entry",
      domain: "money",
      risk: "confirm",
      aliases: [
        "log expense",
        "add income",
        "record transaction",
        "spent",
        "payment",
      ],
      description:
        "Record a single income or expense. Amount is a positive integer in minor currency units.",
      inputSchema: z.object({
        title: z.string().trim().min(1).max(160),
        amountMinor: z.number().int().positive().max(2_000_000_000),
        currency: z.string().regex(/^[A-Z]{3}$/),
        direction: z.enum(["income", "expense"]),
        occurredAt: dateSchema,
        accountId: uuidSchema,
        recurringItemId: uuidSchema.nullable().optional(),
        category: nullableText(80).optional(),
        notes: nullableText(800).optional(),
        ...relationshipSchema,
      }),
      execute: serial(async (input) => {
        const entry = await client.money.createEntry({
          ...input,
          recurringItemId: input.recurringItemId ?? null,
          category: input.category ?? null,
          notes: input.notes ?? null,
          personIds:
            input.personIds ??
            (context.perspective.kind === "person"
              ? [context.perspective.personId]
              : []),
          relatedEntityIds: input.relatedEntityIds ?? [],
          sourceDocumentId: input.sourceDocumentId ?? null,
          relatedDocumentIds: input.relatedDocumentIds ?? [],
        });
        return result("create_money_entry", {
          kind: "receipt",
          title: `${entry.title} recorded`,
          summary: `${entry.direction} of ${entry.amountMinor} ${entry.currency} minor units.`,
          changed: true,
          href: "/money",
          data: entry,
        });
      }),
    }),
    defineAction({
      name: "save_recurring_money",
      domain: "money",
      risk: "confirm",
      aliases: [
        "subscription",
        "salary",
        "recurring payment",
        "monthly bill",
        "savings contribution",
      ],
      description:
        "Create or update recurring income, a commitment, subscription, or savings item. Amounts are minor units. For updates, retrieve the item first and preserve all fields.",
      inputSchema: z.object({
        itemId: uuidSchema.optional(),
        title: z.string().trim().min(1).max(160),
        amountMinor: z.number().int().positive().max(2_000_000_000),
        currency: z.string().regex(/^[A-Z]{3}$/),
        direction: z.enum(["income", "expense"]),
        group: z.enum(["income", "essential", "subscription", "savings"]),
        frequency: z.enum(["weekly", "monthly", "quarterly", "yearly"]),
        nextOccurrence: dateSchema,
        startDate: dateSchema.nullable(),
        endDate: dateSchema.nullable(),
        accountId: uuidSchema.nullable(),
        category: nullableText(80),
        isVariable: z.boolean(),
        notes: nullableText(800),
        ...relationshipSchema,
      }),
      execute: serial(async (input) => {
        const item = await client.money.saveRecurring({
          ...input,
          personIds:
            input.personIds ??
            (context.perspective.kind === "person"
              ? [context.perspective.personId]
              : []),
          relatedEntityIds: input.relatedEntityIds ?? [],
          sourceDocumentId: input.sourceDocumentId ?? null,
          relatedDocumentIds: input.relatedDocumentIds ?? [],
        });
        return result("save_recurring_money", {
          kind: "receipt",
          title: `${item.title} saved`,
          summary: `${item.frequency} ${item.direction} · next ${item.nextOccurrence}.`,
          changed: true,
          href: "/money",
          data: item,
        });
      }),
    }),
    defineAction({
      name: "set_recurring_money_state",
      domain: "money",
      risk: "confirm",
      aliases: [
        "pause subscription",
        "end recurring payment",
        "resume recurring",
      ],
      description: "Set a recurring money item to active, paused, or ended.",
      inputSchema: z.object({
        itemId: uuidSchema,
        state: z.enum(["active", "paused", "ended"]),
      }),
      execute: serial(async (input) => {
        const item = await client.money.setRecurringState(input);
        return result("set_recurring_money_state", {
          kind: "receipt",
          title: `${item.title} ${item.state}`,
          summary: `Recurring item state changed to ${item.state}.`,
          changed: true,
          href: "/money",
          data: { id: item.id, title: item.title, state: item.state },
        });
      }),
    }),
    defineAction({
      name: "save_financial_goal",
      domain: "money",
      risk: "confirm",
      aliases: ["savings goal", "financial target", "save for"],
      description:
        "Create or update a financial goal. Amounts are integer minor units. Retrieve first when updating.",
      inputSchema: z.object({
        goalId: uuidSchema.optional(),
        title: z.string().trim().min(1).max(160),
        targetAmountMinor: z.number().int().positive().max(2_000_000_000),
        currentAmountMinor: z.number().int().nonnegative().max(2_000_000_000),
        currency: z.string().regex(/^[A-Z]{3}$/),
        targetDate: dateSchema.nullable(),
        recurringContributionMinor: z
          .number()
          .int()
          .nonnegative()
          .max(2_000_000_000),
        relatedAccountId: uuidSchema.nullable(),
        relatedProjectId: uuidSchema.nullable(),
        excludeFromSafeToSpend: z.boolean(),
        status: z.enum(["active", "paused", "completed"]),
        notes: nullableText(800),
        ...relationshipSchema,
      }),
      execute: serial(async (input) => {
        const goal = await client.money.saveGoal({
          ...input,
          personIds:
            input.personIds ??
            (context.perspective.kind === "person"
              ? [context.perspective.personId]
              : []),
          relatedEntityIds: input.relatedEntityIds ?? [],
          sourceDocumentId: input.sourceDocumentId ?? null,
          relatedDocumentIds: input.relatedDocumentIds ?? [],
        });
        return result("save_financial_goal", {
          kind: "receipt",
          title: `${goal.title} saved`,
          summary: `${goal.currentAmountMinor} of ${goal.targetAmountMinor} ${goal.currency} minor units.`,
          changed: true,
          href: "/money",
          data: goal,
        });
      }),
    }),
    defineAction({
      name: "save_financial_decision",
      domain: "money",
      risk: "confirm",
      aliases: [
        "compare purchase",
        "financial decision",
        "options",
        "decide whether to buy",
      ],
      description:
        "Create or update a financial decision with 1 to 6 options. Monetary impacts are integer minor units. Retrieve first when updating.",
      inputSchema: z.object({
        decisionId: uuidSchema.optional(),
        title: z.string().trim().min(1).max(160),
        description: nullableText(800),
        status: z.enum(["considering", "decided", "rejected"]),
        relatedProjectId: uuidSchema.nullable(),
        selectedOptionId: uuidSchema.nullable(),
        notes: nullableText(800),
        options: z
          .array(
            z.object({
              id: uuidSchema.optional(),
              title: z.string().trim().min(1).max(120),
              monthlyImpactMinor: z
                .number()
                .int()
                .min(-2_000_000_000)
                .max(2_000_000_000),
              upfrontCostMinor: z
                .number()
                .int()
                .nonnegative()
                .max(2_000_000_000),
              annualImpactMinor: z
                .number()
                .int()
                .min(-2_000_000_000)
                .max(2_000_000_000),
              currency: z.string().regex(/^[A-Z]{3}$/),
              notes: nullableText(800),
            }),
          )
          .min(1)
          .max(6),
        ...relationshipSchema,
      }),
      execute: serial(async (input) => {
        const decision = await client.money.saveDecision({
          ...input,
          personIds:
            input.personIds ??
            (context.perspective.kind === "person"
              ? [context.perspective.personId]
              : []),
          relatedEntityIds: input.relatedEntityIds ?? [],
          sourceDocumentId: input.sourceDocumentId ?? null,
          relatedDocumentIds: input.relatedDocumentIds ?? [],
        });
        return result("save_financial_decision", {
          kind: "receipt",
          title: `${decision.title} saved`,
          summary: `${decision.options.length} option(s) · ${decision.status}.`,
          changed: true,
          href: "/money",
          data: decision,
        });
      }),
    }),
    defineAction({
      name: "get_fitness_overview",
      domain: "fitness",
      risk: "read",
      aliases: [
        "fitness",
        "health",
        "workout",
        "meals",
        "weight",
        "training",
        "nutrition",
        "goals",
      ],
      description:
        "Get workouts, meals, training and nutrition plans, goals, and progress for a person and date. Use it to obtain IDs before changing scheduled items.",
      inputSchema: personTargetSchema.extend({ date: dateSchema.optional() }),
      execute: async ({ personId, date }) => {
        const resolvedPersonId = requirePersonId(personId, context);
        const dashboard = await client.fitness.bootstrap({
          personId: resolvedPersonId,
          date: date ?? context.localDate,
        });
        return result("get_fitness_overview", {
          kind: "collection",
          title: `${dashboard.person.preferredName}'s fitness`,
          summary: dashboard.today.workout
            ? `${dashboard.today.workout.title} is ${dashboard.today.workout.status} today.`
            : "No workout is planned for today.",
          changed: false,
          href: "/fitness",
          data: {
            date: dashboard.date,
            profile: dashboard.profile,
            today: dashboard.today,
            week: dashboard.week.map((day) => ({
              date: day.date,
              weekday: day.weekday,
              workout: day.workout
                ? {
                    id: day.workout.id,
                    title: day.workout.title,
                    type: day.workout.type,
                    status: day.workout.status,
                    date: day.workout.date,
                  }
                : null,
              calorieTarget: day.calorieTarget,
              mealPlanStatus: day.mealPlanStatus,
              completed: day.completed,
            })),
            training: dashboard.training,
            nutrition: dashboard.nutrition,
            meals: dashboard.meals.slice(0, 30).map((meal) => ({
              id: meal.id,
              title: meal.title,
              caloriesPerServing: meal.caloriesPerServing,
              proteinPerServing: meal.proteinPerServing,
              preparationMinutes: meal.preparationMinutes,
              servings: meal.servings,
              favourite: meal.favourite,
              tags: meal.tags,
            })),
            goals: dashboard.goals,
            progress: dashboard.progress,
          },
        });
      },
    }),
    defineAction({
      name: "set_meal_status",
      domain: "fitness",
      risk: "write",
      aliases: ["ate meal", "skip meal", "meal completed", "mark meal"],
      description: "Mark a planned meal as planned, eaten, or skipped.",
      inputSchema: z.object({
        plannedMealId: uuidSchema,
        status: z.enum(["planned", "eaten", "skipped"]),
      }),
      execute: serial(async (input) => {
        await client.fitness.setMealStatus(input);
        return result("set_meal_status", {
          kind: "receipt",
          title: "Meal status updated",
          summary: `Meal marked ${input.status}.`,
          changed: true,
          href: "/fitness",
        });
      }),
    }),
    defineAction({
      name: "replace_planned_meal",
      domain: "fitness",
      risk: "write",
      aliases: ["swap meal", "replace meal", "change planned meal"],
      description: "Replace a planned meal with another saved meal.",
      inputSchema: z.object({ plannedMealId: uuidSchema, mealId: uuidSchema }),
      execute: serial(async (input) => {
        await client.fitness.replacePlannedMeal(input);
        return result("replace_planned_meal", {
          kind: "receipt",
          title: "Meal replaced",
          summary: "The planned meal was replaced.",
          changed: true,
          href: "/fitness",
        });
      }),
    }),
    defineAction({
      name: "set_workout_status",
      domain: "fitness",
      risk: "write",
      aliases: ["skip workout", "restore workout", "mark workout planned"],
      description:
        "Mark a workout as planned or skipped. Use complete_workout to finish it.",
      inputSchema: z.object({
        workoutId: uuidSchema,
        status: z.enum(["planned", "skipped"]),
      }),
      execute: serial(async (input) => {
        await client.fitness.setWorkoutStatus(input);
        return result("set_workout_status", {
          kind: "receipt",
          title: "Workout status updated",
          summary: `Workout marked ${input.status}.`,
          changed: true,
          href: "/fitness",
        });
      }),
    }),
    defineAction({
      name: "complete_workout",
      domain: "fitness",
      risk: "write",
      aliases: [
        "finished workout",
        "log workout",
        "workout done",
        "complete training",
      ],
      description:
        "Complete a workout and optionally log effort, running metrics, notes, and exercise results.",
      inputSchema: z.object({
        workoutId: uuidSchema,
        perceivedEffort: z.number().int().min(1).max(10).nullable().optional(),
        actualDistanceKm: z.number().positive().nullable().optional(),
        durationMinutes: z.number().int().positive().nullable().optional(),
        notes: nullableText(500).optional(),
        exerciseLogs: z
          .array(
            z.object({
              exerciseId: uuidSchema,
              repetitions: z.number().int().nonnegative().nullable(),
              weight: z.number().nonnegative().nullable(),
              completed: z.boolean(),
            }),
          )
          .max(30)
          .optional(),
      }),
      execute: serial(
        async ({
          perceivedEffort,
          actualDistanceKm,
          durationMinutes,
          notes,
          exerciseLogs,
          ...input
        }) => {
          await client.fitness.completeWorkout({
            ...input,
            perceivedEffort: perceivedEffort ?? null,
            actualDistanceKm: actualDistanceKm ?? null,
            durationMinutes: durationMinutes ?? null,
            notes: notes ?? null,
            exerciseLogs: exerciseLogs ?? [],
          });
          return result("complete_workout", {
            kind: "receipt",
            title: "Workout completed",
            summary: durationMinutes
              ? `Completed in ${durationMinutes} minutes.`
              : "Workout marked complete.",
            changed: true,
            href: "/fitness",
          });
        },
      ),
    }),
    defineAction({
      name: "log_weight",
      domain: "fitness",
      risk: "write",
      aliases: ["weight", "weigh in", "body weight"],
      description: "Log a person's body weight for a date.",
      inputSchema: personTargetSchema.extend({
        weight: z.number().positive().max(1000),
        date: dateSchema.optional(),
        notes: nullableText(500).optional(),
      }),
      execute: serial(async ({ personId, date, notes, ...input }) => {
        const resolvedPersonId = requirePersonId(personId, context);
        const logged = await client.fitness.logWeight({
          ...input,
          personId: resolvedPersonId,
          date: date ?? context.localDate,
          notes: notes ?? null,
        });
        return result("log_weight", {
          kind: "receipt",
          title: "Weight logged",
          summary: `${input.weight} recorded for ${date ?? context.localDate}.`,
          changed: true,
          href: "/fitness",
          data: logged,
        });
      }),
    }),
    defineAction({
      name: "create_training_plan",
      domain: "fitness",
      risk: "write",
      aliases: ["training plan", "running plan", "strength plan"],
      description: "Create a strength, running, or mixed training plan.",
      inputSchema: personTargetSchema.extend({
        title: z.string().trim().min(1).max(160),
        type: z.enum(["strength", "running", "mixed"]),
        weeklyFrequency: z.number().int().min(1).max(14),
        goal: nullableText(500).optional(),
        startDate: dateSchema,
        endDate: dateSchema.nullable().optional(),
      }),
      execute: serial(async ({ personId, goal, endDate, ...input }) => {
        const resolvedPersonId = requirePersonId(personId, context);
        const plan = await client.fitness.createTrainingPlan({
          ...input,
          personId: resolvedPersonId,
          goal: goal ?? null,
          endDate: endDate ?? null,
        });
        return result("create_training_plan", {
          kind: "receipt",
          title: `${input.title} created`,
          summary: `${input.weeklyFrequency} session(s) per week.`,
          changed: true,
          href: "/fitness",
          data: plan,
        });
      }),
    }),
    defineAction({
      name: "create_workout",
      domain: "fitness",
      risk: "write",
      aliases: ["schedule workout", "add run", "plan rest day", "new workout"],
      description: "Schedule a workout or rest day for a person.",
      inputSchema: personTargetSchema.extend({
        trainingPlanId: uuidSchema.nullable().optional(),
        title: z.string().trim().min(1).max(160),
        type: z.enum([
          "strength",
          "easy_run",
          "long_run",
          "intervals",
          "tempo_run",
          "recovery_run",
          "rest",
        ]),
        date: dateSchema,
        estimatedDurationMinutes: z
          .number()
          .int()
          .positive()
          .nullable()
          .optional(),
        summary: nullableText(500).optional(),
        plannedDistanceKm: z.number().positive().nullable().optional(),
      }),
      execute: serial(
        async ({
          personId,
          trainingPlanId,
          estimatedDurationMinutes,
          summary,
          plannedDistanceKm,
          ...input
        }) => {
          const resolvedPersonId = requirePersonId(personId, context);
          const workout = await client.fitness.createWorkout({
            ...input,
            personId: resolvedPersonId,
            trainingPlanId: trainingPlanId ?? null,
            estimatedDurationMinutes: estimatedDurationMinutes ?? null,
            summary: summary ?? null,
            plannedDistanceKm: plannedDistanceKm ?? null,
          });
          return result("create_workout", {
            kind: "receipt",
            title: `${input.title} scheduled`,
            summary: `Scheduled for ${input.date}.`,
            changed: true,
            href: "/fitness",
            data: workout,
          });
        },
      ),
    }),
    defineAction({
      name: "move_workout",
      domain: "fitness",
      risk: "write",
      aliases: ["reschedule workout", "move run", "change workout date"],
      description: "Move a scheduled workout to another date.",
      inputSchema: z.object({ workoutId: uuidSchema, date: dateSchema }),
      execute: serial(async (input) => {
        await client.fitness.moveWorkout(input);
        return result("move_workout", {
          kind: "receipt",
          title: "Workout moved",
          summary: `Workout rescheduled to ${input.date}.`,
          changed: true,
          href: "/fitness",
        });
      }),
    }),
    defineAction({
      name: "create_nutrition_plan",
      domain: "fitness",
      risk: "write",
      aliases: [
        "meal plan",
        "nutrition target",
        "calorie goal",
        "protein target",
      ],
      description:
        "Create a nutrition plan with daily calorie, protein, and meal targets.",
      inputSchema: personTargetSchema.extend({
        title: z.string().trim().min(1).max(160),
        calorieTarget: z.number().int().min(500).max(10000),
        proteinTarget: z.number().int().min(0).max(1000),
        mealsPerDay: z.number().int().min(1).max(12),
        goal: nullableText(500).optional(),
        startDate: dateSchema,
        endDate: dateSchema.nullable().optional(),
      }),
      execute: serial(async ({ personId, goal, endDate, ...input }) => {
        const resolvedPersonId = requirePersonId(personId, context);
        const plan = await client.fitness.createNutritionPlan({
          ...input,
          personId: resolvedPersonId,
          goal: goal ?? null,
          endDate: endDate ?? null,
        });
        return result("create_nutrition_plan", {
          kind: "receipt",
          title: `${input.title} created`,
          summary: `${input.calorieTarget} kcal and ${input.proteinTarget} g protein per day.`,
          changed: true,
          href: "/fitness",
          data: plan,
        });
      }),
    }),
    defineAction({
      name: "create_meal",
      domain: "fitness",
      risk: "write",
      aliases: ["new meal", "save recipe", "add food"],
      description: "Create a reusable meal or recipe.",
      inputSchema: personTargetSchema.extend({
        title: z.string().trim().min(1).max(160),
        description: nullableText(800).optional(),
        caloriesPerServing: z
          .number()
          .int()
          .nonnegative()
          .nullable()
          .optional(),
        proteinPerServing: z.number().int().nonnegative().nullable().optional(),
        preparationMinutes: z
          .number()
          .int()
          .nonnegative()
          .nullable()
          .optional(),
        servings: z.number().int().min(1).max(50),
        favourite: z.boolean().optional(),
        tags: z.array(z.string().trim().min(1).max(60)).max(12).optional(),
        dietaryNotes: nullableText(500).optional(),
        ingredients: z
          .array(
            z.object({
              name: z.string().trim().min(1).max(160),
              quantity: z.number().positive().nullable(),
              unit: z.string().trim().max(40).nullable(),
              optional: z.boolean(),
            }),
          )
          .max(40)
          .optional(),
        steps: z.array(z.string().trim().min(1).max(800)).max(30).optional(),
      }),
      execute: serial(
        async ({
          personId,
          description,
          caloriesPerServing,
          proteinPerServing,
          preparationMinutes,
          favourite,
          tags,
          dietaryNotes,
          ingredients,
          steps,
          ...input
        }) => {
          const resolvedPersonId = requirePersonId(personId, context);
          const meal = await client.fitness.createMeal({
            ...input,
            personId: resolvedPersonId,
            description: description ?? null,
            caloriesPerServing: caloriesPerServing ?? null,
            proteinPerServing: proteinPerServing ?? null,
            preparationMinutes: preparationMinutes ?? null,
            favourite: favourite ?? false,
            tags: tags ?? [],
            dietaryNotes: dietaryNotes ?? null,
            ingredients: ingredients ?? [],
            steps: steps ?? [],
          });
          return result("create_meal", {
            kind: "receipt",
            title: `${input.title} created`,
            summary: "The meal is ready to add to a day.",
            changed: true,
            href: "/fitness",
            data: meal,
          });
        },
      ),
    }),
    defineAction({
      name: "add_meal_to_day",
      domain: "fitness",
      risk: "write",
      aliases: [
        "schedule meal",
        "add meal today",
        "plan breakfast",
        "plan dinner",
      ],
      description: "Add a saved meal to a person's day and meal slot.",
      inputSchema: personTargetSchema.extend({
        mealId: uuidSchema,
        date: dateSchema.optional(),
        slot: z.enum(["breakfast", "lunch", "snack", "dinner", "other"]),
      }),
      execute: serial(async ({ personId, date, ...input }) => {
        const resolvedPersonId = requirePersonId(personId, context);
        const planned = await client.fitness.addMealToDay({
          ...input,
          personId: resolvedPersonId,
          date: date ?? context.localDate,
        });
        return result("add_meal_to_day", {
          kind: "receipt",
          title: "Meal planned",
          summary: `Added to ${input.slot} on ${date ?? context.localDate}.`,
          changed: true,
          href: "/fitness",
          data: planned,
        });
      }),
    }),
    defineAction({
      name: "copy_day_meals",
      domain: "fitness",
      risk: "write",
      aliases: ["copy meal plan", "repeat meals", "duplicate day meals"],
      description:
        "Copy all planned meals from one date to another for a person.",
      inputSchema: personTargetSchema.extend({
        sourceDate: dateSchema,
        targetDate: dateSchema,
      }),
      execute: serial(async ({ personId, ...input }) => {
        const resolvedPersonId = requirePersonId(personId, context);
        await client.fitness.copyDayMeals({
          ...input,
          personId: resolvedPersonId,
        });
        return result("copy_day_meals", {
          kind: "receipt",
          title: "Meals copied",
          summary: `Meals from ${input.sourceDate} were copied to ${input.targetDate}.`,
          changed: true,
          href: "/fitness",
        });
      }),
    }),
    defineAction({
      name: "save_fitness_goal",
      domain: "fitness",
      risk: "write",
      aliases: ["fitness goal", "weight goal", "running goal", "strength goal"],
      description:
        "Create a weight, consistency, strength, running distance, or running event goal.",
      inputSchema: personTargetSchema.extend({
        title: z.string().trim().min(1).max(160),
        type: z.enum([
          "weight",
          "training_consistency",
          "strength",
          "running_distance",
          "running_event",
        ]),
        startingValue: z.number().nonnegative().nullable().optional(),
        targetValue: z.number().positive(),
        unit: z.string().trim().min(1).max(40),
        targetDate: dateSchema.nullable().optional(),
      }),
      execute: serial(
        async ({ personId, startingValue, targetDate, ...input }) => {
          const resolvedPersonId = requirePersonId(personId, context);
          const goal = await client.fitness.saveGoal({
            ...input,
            personId: resolvedPersonId,
            startingValue: startingValue ?? null,
            targetDate: targetDate ?? null,
          });
          return result("save_fitness_goal", {
            kind: "receipt",
            title: `${input.title} created`,
            summary: `Target: ${input.targetValue} ${input.unit}.`,
            changed: true,
            href: "/fitness",
            data: goal,
          });
        },
      ),
    }),
    defineAction({
      name: "open_lifeos_page",
      domain: "navigation",
      risk: "read",
      aliases: [
        "open",
        "go to",
        "show page",
        "upload document",
        "create family",
        "invite family",
      ],
      description:
        "Return a navigation card for a LifeOS page. Use for UI-only actions such as uploading a file, creating a Family, or inviting someone.",
      inputSchema: z.object({
        page: z.enum([
          "home",
          "me",
          "family",
          "invitations",
          "documents",
          "projects",
          "money",
          "fitness",
        ]),
        reason: z.string().trim().max(160).optional(),
      }),
      execute: async ({ page, reason }) => {
        const routes: Record<string, string> = {
          home: "/",
          me:
            context.perspective.kind === "person"
              ? `/people/${context.perspective.personId}`
              : "/me",
          family: "/family",
          invitations: "/invitations",
          documents: "/documents",
          projects: "/projects",
          money: "/money",
          fitness: "/fitness",
        };
        return result("open_lifeos_page", {
          kind: "navigation",
          title: `Open ${page}`,
          summary: reason ?? `Continue in the ${page} page.`,
          changed: false,
          href: routes[page] ?? "/",
        });
      },
    }),
  ];

  return actions;
}

export type AssistantAction = ReturnType<typeof createAssistantActions>[number];

function tokenize(value: string) {
  return new Set(
    value
      .toLocaleLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .split(/\s+/)
      .filter((token) => token.length > 1),
  );
}

const routeDomains: Array<[string, string]> = [
  ["/documents", "documents"],
  ["/projects", "projects"],
  ["/money", "money"],
  ["/fitness", "fitness"],
  ["/family", "family"],
  ["/invitations", "family"],
  ["/me", "me"],
  ["/people/", "me"],
];

export function rankAssistantActions(
  query: string,
  context: AssistantRequestContext,
  actions: AssistantAction[],
  limit = 6,
) {
  const queryTokens = tokenize(query);
  const routeDomain = routeDomains.find(([prefix]) =>
    context.pathname.startsWith(prefix),
  )?.[1];

  return actions
    .map((action) => {
      const haystack =
        `${action.name} ${action.domain} ${action.description} ${action.aliases.join(" ")}`.toLocaleLowerCase();
      const actionTokens = tokenize(haystack);
      let score = action.domain === routeDomain ? 1.5 : 0;
      for (const token of queryTokens) {
        if (actionTokens.has(token)) score += 2;
        if (haystack.includes(token)) score += 0.35;
      }
      for (const alias of action.aliases) {
        if (query.toLocaleLowerCase().includes(alias.toLocaleLowerCase())) {
          score += 5;
        }
      }
      return { action, score };
    })
    .sort((left, right) =>
      right.score === left.score
        ? left.action.name.localeCompare(right.action.name)
        : right.score - left.score,
    )
    .slice(0, limit)
    .map(({ action }) => action);
}
