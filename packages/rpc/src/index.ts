import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { oc, type ContractRouterClient } from "@orpc/contract";
import { z } from "zod";

import { meContract, personSummarySchema } from "./me";
import { fitnessContract } from "./fitness";
import { moneyContract } from "./money";
import { projectsContract } from "./projects";

export * from "./fitness";
export * from "./me";
export * from "./money";
export * from "./projects";

export const moduleSchema = z.enum([
  "home",
  "money",
  "health",
  "work",
  "travel",
  "projects",
  "memories",
]);

export const documentKindSchema = z.enum([
  "Passport",
  "Residence permit",
  "Contract",
  "Payslip",
  "Invoice",
  "Receipt",
  "Tax document",
  "Insurance document",
  "Medical document",
  "Certificate",
  "Letter",
  "Travel booking",
  "Bank document",
  "Other",
]);

export const documentRecordSchema = z.object({
  id: z.string().uuid(),
  fileId: z.string().uuid(),
  title: z.string(),
  filename: z.string(),
  mediaType: z.enum(["PDF", "Image"]),
  mimeType: z.string(),
  pageCount: z.number().int().positive().nullable(),
  sizeBytes: z.number().int().nonnegative(),
  kind: documentKindSchema,
  issuer: z.string(),
  modules: z.array(z.string()),
  people: z.array(z.string()),
  personIds: z.array(z.string().uuid()),
  status: z.enum(["Current", "Needs attention", "Archived"]),
  attention: z
    .object({
      label: z.string(),
      kind: z.enum(["expiry", "renewal", "signature", "unlinked"]),
      tone: z.enum(["warning", "destructive", "info"]),
    })
    .nullable(),
  addedAt: z.string(),
  issuedAt: z.string().nullable(),
  expiresAt: z.string().nullable(),
  source: z.enum(["Upload", "Scan", "Email", "Generated"]),
  tags: z.array(z.string()),
  fileStatus: z.enum(["pending", "ready", "failed", "deleting"]),
  previewStatus: z.enum(["pending", "ready", "failed"]),
  organizationId: z.string(),
  addedBy: z
    .object({
      id: z.string(),
      name: z.string(),
    })
    .nullable(),
});

export const documentPickerItemSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  filename: z.string(),
  kind: z.string(),
  issuer: z.string(),
  addedAt: z.string(),
});

export const documentPickerPageSchema = z.object({
  items: z.array(documentPickerItemSchema),
  total: z.number().int().nonnegative(),
  nextOffset: z.number().int().nonnegative().nullable(),
});

export const familyDocumentSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  kind: z.string(),
  people: z.array(z.string()),
  modules: z.array(z.string()),
  expiresAt: z.string().nullable(),
  addedAt: z.string(),
});

export const familyMomentSchema = z.object({
  id: z.string(),
  kind: z.enum([
    "document",
    "official_record",
    "personal_date",
    "birthday",
    "project",
    "money",
  ]),
  title: z.string(),
  detail: z.string().nullable(),
  occursOn: z.string().nullable(),
  tone: z.enum(["attention", "upcoming", "calm"]),
  personIds: z.array(z.string().uuid()),
  people: z.array(z.string()),
  destination: z.enum(["documents", "me", "projects", "money"]),
  targetId: z.string().uuid().nullable(),
  amountMinor: z.number().int().positive().nullable(),
  currency: z.string().nullable(),
});

export const familyProjectSummarySchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  outcome: z.string(),
  coverImage: z.string().nullable(),
  people: z.array(personSummarySchema),
  modules: z.array(z.string()),
  nextStep: z
    .object({
      id: z.string().uuid(),
      title: z.string(),
      dueDate: z.string().nullable(),
    })
    .nullable(),
  completedSteps: z.number().int().min(0),
  totalSteps: z.number().int().min(0),
});

export const familyDashboardSchema = z.object({
  family: z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
    logo: z.string().nullable(),
    createdAt: z.string(),
  }),
  viewer: z.object({
    userId: z.string(),
    personId: z.string().uuid(),
  }),
  today: z.string(),
  people: z.array(personSummarySchema),
  recentDocuments: z.array(familyDocumentSchema),
  attention: z.array(familyMomentSchema),
  upcoming: z.array(familyMomentSchema),
  sharedProjects: z.array(familyProjectSummarySchema),
  summary: z.object({
    people: z.number().int().min(0),
    documents: z.number().int().min(0),
    needsAttention: z.number().int().min(0),
    sharedProjects: z.number().int().min(0),
  }),
});

export const familyInboxInvitationSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  status: z.string(),
  expiresAt: z.string(),
  createdAt: z.string(),
  organizationId: z.string(),
  organizationName: z.string(),
  organizationSlug: z.string(),
  inviterName: z.string().nullable(),
});

export const lifeOsContract = {
  me: meContract,
  family: {
    bootstrap: oc
      .input(z.object({ organizationId: z.string().optional() }))
      .output(familyDashboardSchema.nullable()),
    listIncomingInvitations: oc
      .input(z.object({}))
      .output(z.array(familyInboxInvitationSchema)),
  },
  documents: {
    list: oc
      .input(z.object({ personId: z.string().uuid().optional() }))
      .output(z.array(documentRecordSchema)),
    search: oc
      .input(
        z.object({
          query: z.string().trim().max(160),
          offset: z.number().int().nonnegative(),
          limit: z.number().int().min(1).max(50),
        }),
      )
      .output(documentPickerPageSchema),
    createUpload: oc
      .input(
        z.object({
          organizationId: z.string().min(1).optional(),
          title: z.string().trim().min(1).max(160),
          kind: documentKindSchema,
          issuer: z.string().trim().min(1).max(160),
          filename: z.string().trim().min(1).max(240),
          contentType: z.enum([
            "application/pdf",
            "image/png",
            "image/jpeg",
            "image/heic",
            "image/heif",
          ]),
          sizeBytes: z
            .number()
            .int()
            .positive()
            .max(50 * 1024 * 1024),
          personIds: z.array(z.string().uuid()).max(2),
          modules: z.array(moduleSchema).max(7),
        }),
      )
      .output(
        z.object({
          documentId: z.string().uuid(),
          fileId: z.string().uuid(),
          upload: z.object({
            url: z.string().url(),
            method: z.literal("PUT"),
            headers: z.record(z.string(), z.string()),
            expiresAt: z.string(),
          }),
        }),
      ),
    completeUpload: oc
      .input(
        z.object({
          documentId: z.string().uuid(),
          fileId: z.string().uuid(),
        }),
      )
      .output(documentRecordSchema),
    setRelationships: oc
      .input(
        z.object({
          documentId: z.string().uuid(),
          personIds: z.array(z.string().uuid()).max(2),
          modules: z.array(moduleSchema).max(7),
        }),
      )
      .output(documentRecordSchema),
    getDownloadUrl: oc
      .input(
        z.object({
          documentId: z.string().uuid(),
          disposition: z.enum(["inline", "attachment"]),
        }),
      )
      .output(
        z.object({
          url: z.string().url(),
          filename: z.string(),
          expiresAt: z.string(),
        }),
      ),
    getPreviewUrl: oc.input(z.object({ documentId: z.string().uuid() })).output(
      z.object({
        status: z.enum(["pending", "ready", "failed"]),
        url: z.string().url().nullable(),
        expiresAt: z.string().nullable(),
      }),
    ),
    setArchived: oc
      .input(
        z.object({
          documentId: z.string().uuid(),
          archived: z.boolean(),
        }),
      )
      .output(documentRecordSchema),
    delete: oc
      .input(z.object({ documentId: z.string().uuid() }))
      .output(z.object({ deleted: z.literal(true) })),
  },
  fitness: fitnessContract,
  money: moneyContract,
  projects: projectsContract,
} as const;

export type LifeOsRpcClient = ContractRouterClient<typeof lifeOsContract>;
export type FamilyDashboard = z.infer<typeof familyDashboardSchema>;
export type FamilyMoment = z.infer<typeof familyMomentSchema>;
export type FamilyProjectSummary = z.infer<typeof familyProjectSummarySchema>;
export type FamilyInboxInvitation = z.infer<typeof familyInboxInvitationSchema>;
export type DocumentRecord = z.infer<typeof documentRecordSchema>;
export type DocumentKind = z.infer<typeof documentKindSchema>;
export type DocumentPickerItem = z.infer<typeof documentPickerItemSchema>;
export type DocumentPickerPage = z.infer<typeof documentPickerPageSchema>;

export function createLifeOsRpcClient(baseUrl: string): LifeOsRpcClient {
  const link = new RPCLink({
    url: `${baseUrl.replace(/\/$/, "")}/rpc`,
    fetch: (request, init) =>
      fetch(request, {
        ...init,
        credentials: "include",
      }),
  });

  return createORPCClient(link);
}

export const rpcPackage = {
  name: "@lifeos/rpc",
  transport: "orpc",
} as const;
