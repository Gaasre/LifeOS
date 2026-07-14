export const DOCUMENT_AREAS = [
  "Home",
  "Money",
  "Health",
  "Work",
  "Travel",
  "Projects",
  "Memories",
] as const;

export const DOCUMENT_KINDS = [
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
] as const;

export const DOCUMENT_STATUSES = [
  "Current",
  "Needs attention",
  "Archived",
] as const;

export type DocumentArea = (typeof DOCUMENT_AREAS)[number];
export type DocumentKind = (typeof DOCUMENT_KINDS)[number];
export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];
export type DocumentMediaType = "PDF" | "Image";
export type DocumentSource = "Upload" | "Scan" | "Email" | "Generated";
export type DocumentFileStatus = "pending" | "ready" | "failed" | "deleting";
export type DocumentPreviewStatus = "pending" | "ready" | "failed";
export type DocumentSort =
  "recently-added" | "title" | "oldest" | "expiring-soon";
export type FilterValue = string | number | boolean;

export type DocumentAttention = {
  label: string;
  kind: "expiry" | "renewal" | "signature" | "unlinked";
  tone: "warning" | "destructive" | "info";
};

export type LifeDocument = {
  id: string;
  title: string;
  filename: string;
  mediaType: DocumentMediaType;
  mimeType: string;
  pageCount?: number;
  sizeMb: number;
  kind: DocumentKind;
  issuer: string;
  areas: DocumentArea[];
  people: string[];
  personIds: string[];
  status: DocumentStatus;
  attention?: DocumentAttention;
  addedAt: string;
  issuedAt?: string;
  expiresAt?: string;
  source: DocumentSource;
  tags: string[];
  fileStatus: DocumentFileStatus;
  previewStatus: DocumentPreviewStatus;
  organizationId: string;
  addedBy: { id: string; name: string } | null;
};
