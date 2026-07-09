export const LIFEOS_ENTITY_TYPES = [
  "people",
  "homes",
  "trips",
  "documents",
  "projects",
  "finances",
  "memories",
  "goals",
] as const;

export type LifeOsEntityType = (typeof LIFEOS_ENTITY_TYPES)[number];
