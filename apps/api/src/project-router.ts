import { AccessError } from "@lifeos/access";
import { projectService, ProjectServiceError } from "@lifeos/projects";
import { ORPCError } from "@orpc/server";

import type { AuthorizedRouter } from "./family-router";

function throwMappedError(error: unknown): never {
  if (error instanceof AccessError) {
    throw new ORPCError(error.code, { message: error.message });
  }
  if (error instanceof ProjectServiceError) {
    const code =
      error.code === "NOT_FOUND"
        ? "NOT_FOUND"
        : error.code === "BAD_REQUEST"
          ? "BAD_REQUEST"
          : "INTERNAL_SERVER_ERROR";
    throw new ORPCError(code, { message: error.message });
  }
  throw error;
}

export function createProjectsRouter(authorized: AuthorizedRouter) {
  const list = authorized.projects.list.handler(async ({ input, context }) => {
    try {
      return await projectService.list(context.auth.user.id, {
        ...(input.personId ? { personId: input.personId } : {}),
      });
    } catch (error) {
      return throwMappedError(error);
    }
  });

  const create = authorized.projects.create.handler(
    async ({ input, context }) => {
      try {
        return await projectService.create(context.auth.user.id, {
          ...(input.organizationId
            ? { organizationId: input.organizationId }
            : {}),
          title: input.title,
          outcome: input.outcome,
          whyItMatters: input.whyItMatters,
          coverImage: input.coverImage,
          firstStep: input.firstStep,
          personIds: input.personIds,
          modules: input.modules,
          relatedEntityIds: input.relatedEntityIds,
        });
      } catch (error) {
        return throwMappedError(error);
      }
    },
  );

  const update = authorized.projects.update.handler(
    async ({ input, context }) => {
      try {
        return await projectService.update(context.auth.user.id, input);
      } catch (error) {
        return throwMappedError(error);
      }
    },
  );

  const setStatus = authorized.projects.setStatus.handler(
    async ({ input, context }) => {
      try {
        return await projectService.setStatus(
          context.auth.user.id,
          input.projectId,
          input.status,
        );
      } catch (error) {
        return throwMappedError(error);
      }
    },
  );

  const addStep = authorized.projects.addStep.handler(
    async ({ input, context }) => {
      try {
        return await projectService.addStep(context.auth.user.id, input);
      } catch (error) {
        return throwMappedError(error);
      }
    },
  );

  const updateStep = authorized.projects.updateStep.handler(
    async ({ input, context }) => {
      try {
        return await projectService.updateStep(context.auth.user.id, input);
      } catch (error) {
        return throwMappedError(error);
      }
    },
  );

  const setStepCompleted = authorized.projects.setStepCompleted.handler(
    async ({ input, context }) => {
      try {
        return await projectService.setStepCompleted(
          context.auth.user.id,
          input.stepId,
          input.completed,
        );
      } catch (error) {
        return throwMappedError(error);
      }
    },
  );

  const reorderSteps = authorized.projects.reorderSteps.handler(
    async ({ input, context }) => {
      try {
        return await projectService.reorderSteps(
          context.auth.user.id,
          input.projectId,
          input.stepIds,
        );
      } catch (error) {
        return throwMappedError(error);
      }
    },
  );

  const setProjectDocuments = authorized.projects.setProjectDocuments.handler(
    async ({ input, context }) => {
      try {
        return await projectService.setProjectDocuments(
          context.auth.user.id,
          input.projectId,
          input.documentIds,
        );
      } catch (error) {
        return throwMappedError(error);
      }
    },
  );

  return {
    list,
    create,
    update,
    setStatus,
    addStep,
    updateStep,
    setStepCompleted,
    reorderSteps,
    setProjectDocuments,
  };
}
