export type ReviewFieldStatus = "extracted" | "needs-review" | "verified";

export type EvidenceRegion = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type ReviewEvidence = {
  page: number;
  section: string;
  region: EvidenceRegion;
};

export type ReviewField = {
  id: string;
  label: string;
  value: string;
  status: ReviewFieldStatus;
  evidence: ReviewEvidence;
  multiline?: boolean;
};

export type ReviewSection = {
  id: string;
  title: string;
  fields: ReviewField[];
};

export type ReviewSuggestion = {
  id: string;
  title: string;
  description: string;
  kind: "connection" | "reminder";
};
