import { oc } from "@orpc/contract";
import { z } from "zod";

export const projectStatusSchema = z.enum(["active", "paused", "completed"]);
export const projectStepStatusSchema = z.enum([
  "pending",
  "active",
  "completed",
]);

export const projectModuleSchema = z.enum([
  "home",
  "money",
  "health",
  "work",
  "travel",
  "memories",
]);

const optionalDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a YYYY-MM-DD date.")
  .nullable();

export const projectDocumentReferenceSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  filename: z.string(),
  kind: z.string(),
});

export const projectStepSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  parentStepId: z.string().uuid().nullable(),
  title: z.string(),
  description: z.string().nullable(),
  status: projectStepStatusSchema,
  position: z.number().int().nonnegative(),
  dueDate: z.string().nullable(),
  completedAt: z.string().nullable(),
  documents: z.array(projectDocumentReferenceSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const projectRecordSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  outcome: z.string(),
  whyItMatters: z.string().nullable(),
  status: projectStatusSchema,
  coverImage: z.string().nullable(),
  people: z.array(
    z.object({
      id: z.string().uuid(),
      preferredName: z.string(),
    }),
  ),
  modules: z.array(z.string()),
  relatedEntities: z.array(
    z.object({
      id: z.string().uuid(),
      type: z.string(),
      title: z.string(),
    }),
  ),
  documents: z.array(projectDocumentReferenceSchema),
  steps: z.array(projectStepSchema),
  currentStepId: z.string().uuid().nullable(),
  completedSteps: z.number().int().nonnegative(),
  totalSteps: z.number().int().nonnegative(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const relationshipInputSchema = z.object({
  personIds: z.array(z.string().uuid()).max(10),
  modules: z.array(projectModuleSchema).max(6),
  relatedEntityIds: z.array(z.string().uuid()).max(30),
});

const projectDetailsInputSchema = relationshipInputSchema.extend({
  title: z.string().trim().min(1).max(160),
  outcome: z.string().trim().min(1).max(300),
  whyItMatters: z.string().trim().max(800).nullable(),
  coverImage: z.string().trim().max(500).nullable(),
});

const stepDetailsInputSchema = z.object({
  title: z.string().trim().min(1).max(180),
  description: z.string().trim().max(800).nullable(),
  dueDate: optionalDateSchema,
  documentIds: z.array(z.string().uuid()).max(20),
});

export const projectsContract = {
  list: oc
    .input(z.object({ personId: z.string().uuid().optional() }))
    .output(z.array(projectRecordSchema)),
  create: oc
    .input(
      projectDetailsInputSchema.extend({
        organizationId: z.string().min(1).optional(),
        firstStep: z.string().trim().max(180).nullable(),
      }),
    )
    .output(projectRecordSchema),
  update: oc
    .input(projectDetailsInputSchema.extend({ projectId: z.string().uuid() }))
    .output(projectRecordSchema),
  setStatus: oc
    .input(
      z.object({
        projectId: z.string().uuid(),
        status: z.enum(["active", "paused"]),
      }),
    )
    .output(projectRecordSchema),
  addStep: oc
    .input(
      stepDetailsInputSchema.extend({
        projectId: z.string().uuid(),
        parentStepId: z.string().uuid().nullable(),
      }),
    )
    .output(projectRecordSchema),
  updateStep: oc
    .input(stepDetailsInputSchema.extend({ stepId: z.string().uuid() }))
    .output(projectRecordSchema),
  setStepCompleted: oc
    .input(
      z.object({
        stepId: z.string().uuid(),
        completed: z.boolean(),
      }),
    )
    .output(projectRecordSchema),
  reorderSteps: oc
    .input(
      z.object({
        projectId: z.string().uuid(),
        stepIds: z.array(z.string().uuid()).max(100),
      }),
    )
    .output(projectRecordSchema),
  setProjectDocuments: oc
    .input(
      z.object({
        projectId: z.string().uuid(),
        documentIds: z.array(z.string().uuid()).max(30),
      }),
    )
    .output(projectRecordSchema),
} as const;

export type ProjectRecord = z.infer<typeof projectRecordSchema>;
export type ProjectStep = z.infer<typeof projectStepSchema>;
export type ProjectDocumentReference = z.infer<
  typeof projectDocumentReferenceSchema
>;
export type ProjectStatus = z.infer<typeof projectStatusSchema>;
export type ProjectModule = z.infer<typeof projectModuleSchema>;
