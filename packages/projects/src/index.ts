import {
  listReadableEntityIds,
  requireEntityAccess,
  requireHouseholdMembership,
} from "@lifeos/access";
import {
  db,
  documents,
  entities,
  entityModules,
  entityPeople,
  fileObjects,
  people,
  projectDocuments,
  projectRelatedEntities,
  projectStepDocuments,
  projectSteps,
  projects,
} from "@lifeos/db";
import { and, asc, desc, eq, inArray, isNull, ne, sql } from "drizzle-orm";

export type ProjectStatus = "active" | "paused" | "completed";
export type ProjectStepStatus = "pending" | "active" | "completed";

export type ProjectDocumentReference = {
  id: string;
  title: string;
  filename: string;
  kind: string;
};

export type ProjectStepRecord = {
  id: string;
  projectId: string;
  parentStepId: string | null;
  title: string;
  description: string | null;
  status: ProjectStepStatus;
  position: number;
  dueDate: string | null;
  completedAt: string | null;
  documents: ProjectDocumentReference[];
  createdAt: string;
  updatedAt: string;
};

export type ProjectRecord = {
  id: string;
  title: string;
  outcome: string;
  whyItMatters: string | null;
  status: ProjectStatus;
  coverImage: string | null;
  people: Array<{ id: string; preferredName: string }>;
  modules: string[];
  relatedEntities: Array<{ id: string; type: string; title: string }>;
  documents: ProjectDocumentReference[];
  steps: ProjectStepRecord[];
  currentStepId: string | null;
  completedSteps: number;
  totalSteps: number;
  createdAt: string;
  updatedAt: string;
};

export class ProjectServiceError extends Error {
  constructor(
    public readonly code: "NOT_FOUND" | "BAD_REQUEST" | "INTERNAL",
    message: string,
  ) {
    super(message);
    this.name = "ProjectServiceError";
  }
}

type ProjectRelationshipsInput = {
  personIds: string[];
  modules: string[];
  relatedEntityIds: string[];
};

function unique(values: string[]) {
  return [...new Set(values)];
}

function optionalText(value: string | null) {
  return value?.trim() || null;
}

async function validateRelationships(
  organizationId: string,
  relationships: ProjectRelationshipsInput,
  projectId?: string,
) {
  const personIds = unique(relationships.personIds);
  const modules = unique(relationships.modules).filter(
    (module) => module !== "projects",
  );
  const relatedEntityIds = unique(relationships.relatedEntityIds).filter(
    (entityId) => entityId !== projectId,
  );

  if (personIds.length > 0) {
    const matchingPeople = await db
      .select({ id: people.id })
      .from(people)
      .where(
        and(
          eq(people.organizationId, organizationId),
          inArray(people.id, personIds),
        ),
      );
    if (matchingPeople.length !== personIds.length) {
      throw new ProjectServiceError(
        "NOT_FOUND",
        "One of the selected people is not in this Family.",
      );
    }
  }

  if (relatedEntityIds.length > 0) {
    const matchingEntities = await db
      .select({ id: entities.id })
      .from(entities)
      .where(
        and(
          eq(entities.organizationId, organizationId),
          inArray(entities.id, relatedEntityIds),
        ),
      );
    if (matchingEntities.length !== relatedEntityIds.length) {
      throw new ProjectServiceError(
        "NOT_FOUND",
        "One of the related LifeOS items could not be found.",
      );
    }
  }

  return { personIds, modules, relatedEntityIds };
}

async function validateDocuments(
  organizationId: string,
  documentIds: string[],
) {
  const ids = unique(documentIds);
  if (ids.length === 0) return ids;

  const matchingDocuments = await db
    .select({ id: entities.id })
    .from(documents)
    .innerJoin(entities, eq(documents.entityId, entities.id))
    .where(
      and(
        eq(entities.organizationId, organizationId),
        inArray(documents.entityId, ids),
      ),
    );
  if (matchingDocuments.length !== ids.length) {
    throw new ProjectServiceError(
      "NOT_FOUND",
      "One of the selected documents could not be found.",
    );
  }
  return ids;
}

async function requireProject(actorUserId: string, projectId: string) {
  const entity = await requireEntityAccess(actorUserId, projectId);
  if (entity.type !== "project") {
    throw new ProjectServiceError("NOT_FOUND", "Project not found.");
  }

  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.entityId, projectId))
    .limit(1);
  if (!project) {
    throw new ProjectServiceError("NOT_FOUND", "Project not found.");
  }
  return { entity, project };
}

async function loadProjects(projectIds: string[]): Promise<ProjectRecord[]> {
  if (projectIds.length === 0) return [];

  const [
    projectRows,
    stepRows,
    peopleRows,
    moduleRows,
    relatedRows,
    projectDocumentRows,
  ] = await Promise.all([
    db
      .select({ entity: entities, project: projects })
      .from(projects)
      .innerJoin(entities, eq(projects.entityId, entities.id))
      .where(inArray(projects.entityId, projectIds))
      .orderBy(desc(projects.updatedAt)),
    db
      .select()
      .from(projectSteps)
      .where(inArray(projectSteps.projectId, projectIds))
      .orderBy(asc(projectSteps.position), asc(projectSteps.createdAt)),
    db
      .select({
        entityId: entityPeople.entityId,
        personId: people.id,
        preferredName: people.preferredName,
      })
      .from(entityPeople)
      .innerJoin(people, eq(entityPeople.personId, people.id))
      .where(inArray(entityPeople.entityId, projectIds)),
    db
      .select({
        entityId: entityModules.entityId,
        module: entityModules.module,
      })
      .from(entityModules)
      .where(inArray(entityModules.entityId, projectIds)),
    db
      .select({
        projectId: projectRelatedEntities.projectId,
        id: entities.id,
        type: entities.type,
        title: entities.title,
      })
      .from(projectRelatedEntities)
      .innerJoin(
        entities,
        eq(projectRelatedEntities.relatedEntityId, entities.id),
      )
      .where(inArray(projectRelatedEntities.projectId, projectIds)),
    db
      .select({
        projectId: projectDocuments.projectId,
        id: entities.id,
        title: entities.title,
        filename: fileObjects.originalName,
        kind: documents.kind,
      })
      .from(projectDocuments)
      .innerJoin(entities, eq(projectDocuments.documentId, entities.id))
      .innerJoin(documents, eq(projectDocuments.documentId, documents.entityId))
      .leftJoin(
        fileObjects,
        and(
          eq(fileObjects.entityId, entities.id),
          eq(fileObjects.role, "original"),
        ),
      )
      .where(inArray(projectDocuments.projectId, projectIds)),
  ]);

  const stepIds = stepRows.map((step) => step.id);
  const stepDocumentRows =
    stepIds.length === 0
      ? []
      : await db
          .select({
            stepId: projectStepDocuments.stepId,
            id: entities.id,
            title: entities.title,
            filename: fileObjects.originalName,
            kind: documents.kind,
          })
          .from(projectStepDocuments)
          .innerJoin(entities, eq(projectStepDocuments.documentId, entities.id))
          .innerJoin(
            documents,
            eq(projectStepDocuments.documentId, documents.entityId),
          )
          .leftJoin(
            fileObjects,
            and(
              eq(fileObjects.entityId, entities.id),
              eq(fileObjects.role, "original"),
            ),
          )
          .where(inArray(projectStepDocuments.stepId, stepIds));

  const peopleByProject = new Map<
    string,
    Array<{ id: string; preferredName: string }>
  >();
  const modulesByProject = new Map<string, string[]>();
  const relatedByProject = new Map<
    string,
    Array<{ id: string; type: string; title: string }>
  >();
  const documentsByProject = new Map<string, ProjectDocumentReference[]>();
  const documentsByStep = new Map<string, ProjectDocumentReference[]>();

  for (const row of peopleRows) {
    const values = peopleByProject.get(row.entityId) ?? [];
    values.push({ id: row.personId, preferredName: row.preferredName });
    peopleByProject.set(row.entityId, values);
  }
  for (const row of moduleRows) {
    if (row.module === "projects") continue;
    const values = modulesByProject.get(row.entityId) ?? [];
    values.push(row.module);
    modulesByProject.set(row.entityId, values);
  }
  for (const row of relatedRows) {
    const values = relatedByProject.get(row.projectId) ?? [];
    values.push({ id: row.id, type: row.type, title: row.title });
    relatedByProject.set(row.projectId, values);
  }
  for (const row of projectDocumentRows) {
    const values = documentsByProject.get(row.projectId) ?? [];
    values.push({
      id: row.id,
      title: row.title,
      filename: row.filename ?? row.title,
      kind: row.kind,
    });
    documentsByProject.set(row.projectId, values);
  }
  for (const row of stepDocumentRows) {
    const values = documentsByStep.get(row.stepId) ?? [];
    values.push({
      id: row.id,
      title: row.title,
      filename: row.filename ?? row.title,
      kind: row.kind,
    });
    documentsByStep.set(row.stepId, values);
  }

  return projectRows.map(({ entity, project }) => {
    const steps = stepRows
      .filter((step) => step.projectId === project.entityId)
      .map<ProjectStepRecord>((step) => ({
        id: step.id,
        projectId: step.projectId,
        parentStepId: step.parentStepId,
        title: step.title,
        description: step.description,
        status: step.status,
        position: step.position,
        dueDate: step.dueDate,
        completedAt: step.completedAt?.toISOString() ?? null,
        documents: documentsByStep.get(step.id) ?? [],
        createdAt: step.createdAt.toISOString(),
        updatedAt: step.updatedAt.toISOString(),
      }));
    const topLevelSteps = steps.filter((step) => step.parentStepId === null);
    const currentStep = topLevelSteps.find(
      (step) => step.status !== "completed",
    );

    return {
      id: entity.id,
      title: entity.title,
      outcome: project.outcome,
      whyItMatters: project.whyItMatters,
      status: project.status,
      coverImage: project.coverImage,
      people: peopleByProject.get(project.entityId) ?? [],
      modules: modulesByProject.get(project.entityId) ?? [],
      relatedEntities: relatedByProject.get(project.entityId) ?? [],
      documents: documentsByProject.get(project.entityId) ?? [],
      steps,
      currentStepId: currentStep?.id ?? null,
      completedSteps: topLevelSteps.filter(
        (step) => step.status === "completed",
      ).length,
      totalSteps: topLevelSteps.length,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
    };
  });
}

async function getProjectRecord(actorUserId: string, projectId: string) {
  await requireProject(actorUserId, projectId);
  const [project] = await loadProjects([projectId]);
  if (!project) {
    throw new ProjectServiceError("NOT_FOUND", "Project not found.");
  }
  return project;
}

export const projectService = {
  async list(actorUserId: string, perspective: { personId?: string } = {}) {
    let projectIds = await listReadableEntityIds(actorUserId, "project");
    if (projectIds.length === 0) return [];

    if (perspective.personId) {
      const membership = await requireHouseholdMembership(actorUserId);
      const [selectedPerson] = await db
        .select({ id: people.id })
        .from(people)
        .where(
          and(
            eq(people.id, perspective.personId),
            eq(people.organizationId, membership.organization.id),
          ),
        )
        .limit(1);
      if (!selectedPerson) {
        throw new ProjectServiceError(
          "NOT_FOUND",
          "That person could not be found in your Family.",
        );
      }

      const linkedProjects = await db
        .select({ entityId: entityPeople.entityId })
        .from(entityPeople)
        .where(
          and(
            eq(entityPeople.personId, perspective.personId),
            inArray(entityPeople.entityId, projectIds),
          ),
        );
      projectIds = linkedProjects.map((row) => row.entityId);
    }

    return loadProjects(projectIds);
  },

  async create(
    actorUserId: string,
    input: {
      organizationId?: string;
      title: string;
      outcome: string;
      whyItMatters: string | null;
      coverImage: string | null;
      firstStep: string | null;
      personIds: string[];
      modules: string[];
      relatedEntityIds: string[];
    },
  ) {
    const membership = await requireHouseholdMembership(
      actorUserId,
      input.organizationId,
    );
    const relationships = await validateRelationships(
      membership.organization.id,
      input,
    );

    const projectId = await db.transaction(async (tx) => {
      const [entity] = await tx
        .insert(entities)
        .values({
          organizationId: membership.organization.id,
          type: "project",
          title: input.title.trim(),
          summary: input.outcome.trim(),
          createdByUserId: actorUserId,
        })
        .returning({ id: entities.id });
      if (!entity) {
        throw new ProjectServiceError(
          "INTERNAL",
          "The project could not be created.",
        );
      }

      await tx.insert(projects).values({
        entityId: entity.id,
        outcome: input.outcome.trim(),
        whyItMatters: optionalText(input.whyItMatters),
        coverImage: optionalText(input.coverImage),
      });
      if (relationships.personIds.length > 0) {
        await tx.insert(entityPeople).values(
          relationships.personIds.map((personId) => ({
            entityId: entity.id,
            personId,
          })),
        );
      }
      await tx.insert(entityModules).values([
        { entityId: entity.id, module: "projects" },
        ...relationships.modules.map((module) => ({
          entityId: entity.id,
          module,
        })),
      ]);
      if (relationships.relatedEntityIds.length > 0) {
        await tx.insert(projectRelatedEntities).values(
          relationships.relatedEntityIds.map((relatedEntityId) => ({
            projectId: entity.id,
            relatedEntityId,
          })),
        );
      }
      if (optionalText(input.firstStep)) {
        await tx.insert(projectSteps).values({
          projectId: entity.id,
          title: input.firstStep!.trim(),
          status: "active",
          position: 0,
        });
      }
      return entity.id;
    });

    return getProjectRecord(actorUserId, projectId);
  },

  async update(
    actorUserId: string,
    input: {
      projectId: string;
      title: string;
      outcome: string;
      whyItMatters: string | null;
      coverImage: string | null;
      personIds: string[];
      modules: string[];
      relatedEntityIds: string[];
    },
  ) {
    const { entity } = await requireProject(actorUserId, input.projectId);
    const relationships = await validateRelationships(
      entity.organizationId,
      input,
      input.projectId,
    );

    await db.transaction(async (tx) => {
      const now = new Date();
      await tx
        .update(entities)
        .set({
          title: input.title.trim(),
          summary: input.outcome.trim(),
          updatedAt: now,
        })
        .where(eq(entities.id, input.projectId));
      await tx
        .update(projects)
        .set({
          outcome: input.outcome.trim(),
          whyItMatters: optionalText(input.whyItMatters),
          coverImage: optionalText(input.coverImage),
          updatedAt: now,
        })
        .where(eq(projects.entityId, input.projectId));
      await tx
        .delete(entityPeople)
        .where(eq(entityPeople.entityId, input.projectId));
      await tx
        .delete(entityModules)
        .where(eq(entityModules.entityId, input.projectId));
      await tx
        .delete(projectRelatedEntities)
        .where(eq(projectRelatedEntities.projectId, input.projectId));
      if (relationships.personIds.length > 0) {
        await tx.insert(entityPeople).values(
          relationships.personIds.map((personId) => ({
            entityId: input.projectId,
            personId,
          })),
        );
      }
      await tx.insert(entityModules).values([
        { entityId: input.projectId, module: "projects" },
        ...relationships.modules.map((module) => ({
          entityId: input.projectId,
          module,
        })),
      ]);
      if (relationships.relatedEntityIds.length > 0) {
        await tx.insert(projectRelatedEntities).values(
          relationships.relatedEntityIds.map((relatedEntityId) => ({
            projectId: input.projectId,
            relatedEntityId,
          })),
        );
      }
    });

    return getProjectRecord(actorUserId, input.projectId);
  },

  async setStatus(
    actorUserId: string,
    projectId: string,
    status: "active" | "paused",
  ) {
    await requireProject(actorUserId, projectId);
    const topLevelSteps = await db
      .select({ id: projectSteps.id, status: projectSteps.status })
      .from(projectSteps)
      .where(
        and(
          eq(projectSteps.projectId, projectId),
          isNull(projectSteps.parentStepId),
        ),
      )
      .orderBy(asc(projectSteps.position));
    const hasNextStep = topLevelSteps.some(
      (step) => step.status !== "completed",
    );
    const nextStatus =
      status === "active" && !hasNextStep && topLevelSteps.length > 0
        ? "completed"
        : status;
    const now = new Date();

    await db.transaction(async (tx) => {
      await tx
        .update(projects)
        .set({ status: nextStatus, updatedAt: now })
        .where(eq(projects.entityId, projectId));
      await tx
        .update(entities)
        .set({ updatedAt: now })
        .where(eq(entities.id, projectId));
    });
    return getProjectRecord(actorUserId, projectId);
  },

  async addStep(
    actorUserId: string,
    input: {
      projectId: string;
      parentStepId: string | null;
      title: string;
      description: string | null;
      dueDate: string | null;
      documentIds: string[];
    },
  ) {
    const { entity, project } = await requireProject(
      actorUserId,
      input.projectId,
    );
    const documentIds = await validateDocuments(
      entity.organizationId,
      input.documentIds,
    );
    if (input.parentStepId) {
      const [parent] = await db
        .select({
          id: projectSteps.id,
          parentStepId: projectSteps.parentStepId,
        })
        .from(projectSteps)
        .where(
          and(
            eq(projectSteps.id, input.parentStepId),
            eq(projectSteps.projectId, input.projectId),
          ),
        )
        .limit(1);
      if (!parent || parent.parentStepId) {
        throw new ProjectServiceError(
          "BAD_REQUEST",
          "Preparation items must belong to a top-level project step.",
        );
      }
    }

    await db.transaction(async (tx) => {
      const wherePosition = input.parentStepId
        ? and(
            eq(projectSteps.projectId, input.projectId),
            eq(projectSteps.parentStepId, input.parentStepId),
          )
        : and(
            eq(projectSteps.projectId, input.projectId),
            isNull(projectSteps.parentStepId),
          );
      const [lastStep] = await tx
        .select({ position: projectSteps.position })
        .from(projectSteps)
        .where(wherePosition)
        .orderBy(desc(projectSteps.position))
        .limit(1);
      const position = (lastStep?.position ?? -1) + 1;

      let status: ProjectStepStatus = "pending";
      if (!input.parentStepId) {
        const [current] = await tx
          .select({ id: projectSteps.id })
          .from(projectSteps)
          .where(
            and(
              eq(projectSteps.projectId, input.projectId),
              isNull(projectSteps.parentStepId),
              ne(projectSteps.status, "completed"),
            ),
          )
          .limit(1);
        status = current ? "pending" : "active";
      }

      const [step] = await tx
        .insert(projectSteps)
        .values({
          projectId: input.projectId,
          parentStepId: input.parentStepId,
          title: input.title.trim(),
          description: optionalText(input.description),
          dueDate: input.dueDate,
          status,
          position,
        })
        .returning({ id: projectSteps.id });
      if (!step) {
        throw new ProjectServiceError(
          "INTERNAL",
          "The step could not be created.",
        );
      }
      if (documentIds.length > 0) {
        await tx.insert(projectStepDocuments).values(
          documentIds.map((documentId) => ({
            stepId: step.id,
            documentId,
          })),
        );
      }
      const now = new Date();
      await tx
        .update(projects)
        .set({
          status: input.parentStepId
            ? project.status
            : project.status === "paused"
              ? "paused"
              : "active",
          updatedAt: now,
        })
        .where(eq(projects.entityId, input.projectId));
      await tx
        .update(entities)
        .set({ updatedAt: now })
        .where(eq(entities.id, input.projectId));
    });

    return getProjectRecord(actorUserId, input.projectId);
  },

  async updateStep(
    actorUserId: string,
    input: {
      stepId: string;
      title: string;
      description: string | null;
      dueDate: string | null;
      documentIds: string[];
    },
  ) {
    const [step] = await db
      .select()
      .from(projectSteps)
      .where(eq(projectSteps.id, input.stepId))
      .limit(1);
    if (!step) {
      throw new ProjectServiceError("NOT_FOUND", "Step not found.");
    }
    const { entity } = await requireProject(actorUserId, step.projectId);
    const documentIds = await validateDocuments(
      entity.organizationId,
      input.documentIds,
    );
    const now = new Date();

    await db.transaction(async (tx) => {
      await tx
        .update(projectSteps)
        .set({
          title: input.title.trim(),
          description: optionalText(input.description),
          dueDate: input.dueDate,
          updatedAt: now,
        })
        .where(eq(projectSteps.id, input.stepId));
      await tx
        .delete(projectStepDocuments)
        .where(eq(projectStepDocuments.stepId, input.stepId));
      if (documentIds.length > 0) {
        await tx.insert(projectStepDocuments).values(
          documentIds.map((documentId) => ({
            stepId: input.stepId,
            documentId,
          })),
        );
      }
      await tx
        .update(projects)
        .set({ updatedAt: now })
        .where(eq(projects.entityId, step.projectId));
      await tx
        .update(entities)
        .set({ updatedAt: now })
        .where(eq(entities.id, step.projectId));
    });

    return getProjectRecord(actorUserId, step.projectId);
  },

  async setStepCompleted(
    actorUserId: string,
    stepId: string,
    completed: boolean,
  ) {
    const [step] = await db
      .select()
      .from(projectSteps)
      .where(eq(projectSteps.id, stepId))
      .limit(1);
    if (!step) {
      throw new ProjectServiceError("NOT_FOUND", "Step not found.");
    }
    await requireProject(actorUserId, step.projectId);
    const now = new Date();

    await db.transaction(async (tx) => {
      if (step.parentStepId) {
        await tx
          .update(projectSteps)
          .set({
            status: completed ? "completed" : "pending",
            completedAt: completed ? now : null,
            updatedAt: now,
          })
          .where(eq(projectSteps.id, stepId));
      } else {
        await tx
          .update(projectSteps)
          .set({
            status: completed ? "completed" : "pending",
            completedAt: completed ? now : null,
            updatedAt: now,
          })
          .where(eq(projectSteps.id, stepId));
        if (completed) {
          await tx
            .update(projectSteps)
            .set({ status: "completed", completedAt: now, updatedAt: now })
            .where(eq(projectSteps.parentStepId, stepId));
        }

        await tx
          .update(projectSteps)
          .set({ status: "pending", updatedAt: now })
          .where(
            and(
              eq(projectSteps.projectId, step.projectId),
              isNull(projectSteps.parentStepId),
              ne(projectSteps.status, "completed"),
            ),
          );
        const [nextStep] = await tx
          .select({ id: projectSteps.id })
          .from(projectSteps)
          .where(
            and(
              eq(projectSteps.projectId, step.projectId),
              isNull(projectSteps.parentStepId),
              ne(projectSteps.status, "completed"),
            ),
          )
          .orderBy(asc(projectSteps.position))
          .limit(1);
        if (nextStep) {
          await tx
            .update(projectSteps)
            .set({ status: "active", updatedAt: now })
            .where(eq(projectSteps.id, nextStep.id));
        }

        const [currentProject] = await tx
          .select({ status: projects.status })
          .from(projects)
          .where(eq(projects.entityId, step.projectId))
          .limit(1);
        await tx
          .update(projects)
          .set({
            status: nextStep
              ? currentProject?.status === "paused"
                ? "paused"
                : "active"
              : "completed",
            updatedAt: now,
          })
          .where(eq(projects.entityId, step.projectId));
      }

      await tx
        .update(projects)
        .set({ updatedAt: now })
        .where(eq(projects.entityId, step.projectId));
      await tx
        .update(entities)
        .set({ updatedAt: now })
        .where(eq(entities.id, step.projectId));
    });

    return getProjectRecord(actorUserId, step.projectId);
  },

  async reorderSteps(
    actorUserId: string,
    projectId: string,
    stepIds: string[],
  ) {
    await requireProject(actorUserId, projectId);
    const topLevelSteps = await db
      .select({ id: projectSteps.id })
      .from(projectSteps)
      .where(
        and(
          eq(projectSteps.projectId, projectId),
          isNull(projectSteps.parentStepId),
        ),
      );
    const currentIds = topLevelSteps.map((step) => step.id);
    const orderedIds = unique(stepIds);
    if (
      orderedIds.length !== currentIds.length ||
      currentIds.some((id) => !orderedIds.includes(id))
    ) {
      throw new ProjectServiceError(
        "BAD_REQUEST",
        "The path order must include every top-level step exactly once.",
      );
    }
    const now = new Date();

    await db.transaction(async (tx) => {
      await tx
        .update(projectSteps)
        .set({
          position: sql`${projectSteps.position} + ${orderedIds.length}`,
          updatedAt: now,
        })
        .where(
          and(
            eq(projectSteps.projectId, projectId),
            isNull(projectSteps.parentStepId),
          ),
        );
      for (const [position, id] of orderedIds.entries()) {
        await tx
          .update(projectSteps)
          .set({ position, updatedAt: now })
          .where(eq(projectSteps.id, id));
      }

      await tx
        .update(projectSteps)
        .set({ status: "pending", updatedAt: now })
        .where(
          and(
            eq(projectSteps.projectId, projectId),
            isNull(projectSteps.parentStepId),
            ne(projectSteps.status, "completed"),
          ),
        );
      const firstIncompleteId = orderedIds.find((id) => {
        const existing = topLevelSteps.find((step) => step.id === id);
        return Boolean(existing);
      });
      if (firstIncompleteId) {
        const [firstIncomplete] = await tx
          .select({ id: projectSteps.id })
          .from(projectSteps)
          .where(
            and(
              eq(projectSteps.id, firstIncompleteId),
              ne(projectSteps.status, "completed"),
            ),
          )
          .limit(1);
        if (firstIncomplete) {
          await tx
            .update(projectSteps)
            .set({ status: "active", updatedAt: now })
            .where(eq(projectSteps.id, firstIncomplete.id));
        } else {
          const [nextIncomplete] = await tx
            .select({ id: projectSteps.id })
            .from(projectSteps)
            .where(
              and(
                eq(projectSteps.projectId, projectId),
                isNull(projectSteps.parentStepId),
                ne(projectSteps.status, "completed"),
              ),
            )
            .orderBy(asc(projectSteps.position))
            .limit(1);
          if (nextIncomplete) {
            await tx
              .update(projectSteps)
              .set({ status: "active", updatedAt: now })
              .where(eq(projectSteps.id, nextIncomplete.id));
          }
        }
      }
      await tx
        .update(projects)
        .set({ updatedAt: now })
        .where(eq(projects.entityId, projectId));
      await tx
        .update(entities)
        .set({ updatedAt: now })
        .where(eq(entities.id, projectId));
    });

    return getProjectRecord(actorUserId, projectId);
  },

  async setProjectDocuments(
    actorUserId: string,
    projectId: string,
    requestedDocumentIds: string[],
  ) {
    const { entity } = await requireProject(actorUserId, projectId);
    const documentIds = await validateDocuments(
      entity.organizationId,
      requestedDocumentIds,
    );
    const now = new Date();

    await db.transaction(async (tx) => {
      await tx
        .delete(projectDocuments)
        .where(eq(projectDocuments.projectId, projectId));
      if (documentIds.length > 0) {
        await tx
          .insert(projectDocuments)
          .values(documentIds.map((documentId) => ({ projectId, documentId })));
      }
      await tx
        .update(projects)
        .set({ updatedAt: now })
        .where(eq(projects.entityId, projectId));
      await tx
        .update(entities)
        .set({ updatedAt: now })
        .where(eq(entities.id, projectId));
    });
    return getProjectRecord(actorUserId, projectId);
  },
};
