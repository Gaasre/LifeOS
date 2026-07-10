export const DOCUMENT_AREAS = [
  "Me",
  "Family",
  "Home",
  "Money",
  "Health",
  "Work",
  "Travel",
  "Projects",
] as const;

export const DOCUMENT_KINDS = [
  "Contract",
  "Identity",
  "Tax",
  "Policy",
  "Receipt",
  "Medical",
  "Itinerary",
] as const;

export const DOCUMENT_STATUSES = [
  "Current",
  "Needs attention",
  "Needs review",
  "Archived",
] as const;

export type DocumentArea = (typeof DOCUMENT_AREAS)[number];
export type DocumentKind = (typeof DOCUMENT_KINDS)[number];
export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];
export type DocumentMediaType = "PDF" | "Image";
export type DocumentSource = "Upload" | "Scan" | "Email" | "Generated";
export type DocumentSensitivity = "Standard" | "Private" | "Sensitive";
export type DocumentReviewState = "ready" | "in-progress" | "reviewed";
export type DocumentSort =
  "recently-added" | "title" | "oldest" | "expiring-soon";
export type FilterValue = string | number | boolean;

export type DocumentAttention = {
  label: string;
  kind: "expiry" | "renewal" | "signature" | "review" | "unlinked";
  tone: "warning" | "destructive" | "info";
};

export type DocumentReview = {
  state: DocumentReviewState;
};

export type LifeDocument = {
  id: string;
  title: string;
  filename: string;
  preview: string;
  mediaType: DocumentMediaType;
  mimeType: string;
  pageCount?: number;
  sizeMb: number;
  kind: DocumentKind;
  issuer: string;
  areas: DocumentArea[];
  people: string[];
  status: DocumentStatus;
  attention?: DocumentAttention;
  review?: DocumentReview;
  addedAt: string;
  issuedAt?: string;
  expiresAt?: string;
  source: DocumentSource;
  sensitivity: DocumentSensitivity;
  availableOffline: boolean;
  tags: string[];
};
