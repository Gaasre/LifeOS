import { oc } from "@orpc/contract";
import { z } from "zod";

export const personFactKindSchema = z.enum(["personal_detail", "preference"]);
export const personFactSourceSchema = z.enum([
  "self",
  "document",
  "imported",
  "ai",
]);
export const officialRecordStatusSchema = z.enum([
  "current",
  "needs_review",
  "expired",
]);

const optionalDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a YYYY-MM-DD date.")
  .nullable();

export const personSummarySchema = z.object({
  id: z.string().uuid(),
  preferredName: z.string(),
  legalName: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  isCurrentUser: z.boolean(),
});

export const personProfileSchema = personSummarySchema.extend({
  organizationId: z.string(),
  userId: z.string().nullable(),
  birthday: z.string().nullable(),
  placeOfBirth: z.string().nullable(),
  nationality: z.string().nullable(),
  currentCity: z.string().nullable(),
  currentAddress: z.string().nullable(),
  maritalStatus: z.string().nullable(),
  languages: z.array(z.string()),
  accountEmail: z.string().email().nullable(),
  updatedAt: z.string(),
});

export const personFactSchema = z.object({
  id: z.string().uuid(),
  kind: personFactKindSchema,
  key: z.string(),
  label: z.string(),
  value: z.string(),
  source: personFactSourceSchema,
  sourceDocumentId: z.string().uuid().nullable(),
  updatedAt: z.string(),
});

export const officialRecordSchema = z.object({
  id: z.string().uuid(),
  recordType: z.string(),
  title: z.string(),
  identifier: z.string().nullable(),
  issuingAuthority: z.string().nullable(),
  country: z.string().nullable(),
  issueDate: z.string().nullable(),
  expiryDate: z.string().nullable(),
  status: officialRecordStatusSchema,
  sourceDocumentId: z.string().uuid().nullable(),
  updatedAt: z.string(),
});

export const personalDateSchema = z.object({
  id: z.string().uuid(),
  label: z.string(),
  occursOn: z.string(),
  recursAnnually: z.boolean(),
  updatedAt: z.string(),
});

export const personSourceDocumentSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  kind: z.string(),
  expiresAt: z.string().nullable(),
});

export const personDashboardSchema = z.object({
  profile: personProfileSchema,
  people: z.array(personSummarySchema),
  facts: z.array(personFactSchema),
  officialRecords: z.array(officialRecordSchema),
  personalDates: z.array(personalDateSchema),
  sourceDocuments: z.array(personSourceDocumentSchema),
});

const personTargetSchema = z.object({ personId: z.string().uuid() });

const profileUpdateInputSchema = personTargetSchema.extend({
  preferredName: z.string().trim().min(1).max(100),
  legalName: z.string().trim().max(140).nullable(),
  birthday: optionalDateSchema,
  placeOfBirth: z.string().trim().max(140).nullable(),
  nationality: z.string().trim().max(120).nullable(),
  currentCity: z.string().trim().max(140).nullable(),
  currentAddress: z.string().trim().max(500).nullable(),
  maritalStatus: z.string().trim().max(80).nullable(),
  languages: z.array(z.string().trim().min(1).max(80)).max(20),
});

const factInputSchema = personTargetSchema.extend({
  id: z.string().uuid().optional(),
  key: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9_-]+$/)
    .optional(),
  kind: personFactKindSchema,
  label: z.string().trim().min(1).max(80),
  value: z.string().trim().min(1).max(500),
  sourceDocumentId: z.string().uuid().nullable(),
});

const personalDateInputSchema = personTargetSchema.extend({
  id: z.string().uuid().optional(),
  label: z.string().trim().min(1).max(120),
  occursOn: optionalDateSchema.unwrap(),
  recursAnnually: z.boolean(),
});

const officialRecordInputSchema = personTargetSchema.extend({
  id: z.string().uuid().optional(),
  recordType: z.string().trim().min(1).max(80),
  title: z.string().trim().min(1).max(120),
  identifier: z.string().trim().max(160).nullable(),
  issuingAuthority: z.string().trim().max(160).nullable(),
  country: z.string().trim().max(120).nullable(),
  issueDate: optionalDateSchema,
  expiryDate: optionalDateSchema,
  status: officialRecordStatusSchema,
  sourceDocumentId: z.string().uuid().nullable(),
});

export const meContract = {
  bootstrap: oc
    .input(z.object({ personId: z.string().uuid().optional() }))
    .output(personDashboardSchema.nullable()),
  updateProfile: oc.input(profileUpdateInputSchema).output(personProfileSchema),
  saveFact: oc.input(factInputSchema).output(personFactSchema),
  deleteFact: oc
    .input(personTargetSchema.extend({ factId: z.string().uuid() }))
    .output(z.object({ removed: z.literal(true) })),
  saveOfficialRecord: oc
    .input(officialRecordInputSchema)
    .output(officialRecordSchema),
  deleteOfficialRecord: oc
    .input(personTargetSchema.extend({ recordId: z.string().uuid() }))
    .output(z.object({ removed: z.literal(true) })),
  savePersonalDate: oc
    .input(personalDateInputSchema)
    .output(personalDateSchema),
  deletePersonalDate: oc
    .input(personTargetSchema.extend({ dateId: z.string().uuid() }))
    .output(z.object({ removed: z.literal(true) })),
} as const;

export type PersonDashboard = z.infer<typeof personDashboardSchema>;
export type PersonSummary = z.infer<typeof personSummarySchema>;
export type PersonProfile = z.infer<typeof personProfileSchema>;
export type PersonFact = z.infer<typeof personFactSchema>;
export type PersonFactKind = z.infer<typeof personFactKindSchema>;
export type OfficialRecord = z.infer<typeof officialRecordSchema>;
export type OfficialRecordStatus = z.infer<typeof officialRecordStatusSchema>;
export type PersonalDate = z.infer<typeof personalDateSchema>;
export type PersonSourceDocument = z.infer<typeof personSourceDocumentSchema>;
