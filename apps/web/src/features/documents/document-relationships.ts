import type { LifeDocument } from "@/features/documents/types";

export const documentModuleOptions = [
  { value: "home", label: "Home" },
  { value: "money", label: "Money" },
  { value: "health", label: "Health" },
  { value: "work", label: "Work" },
  { value: "travel", label: "Travel" },
  { value: "projects", label: "Projects" },
  { value: "memories", label: "Memories" },
] as const;

export type DocumentModuleValue =
  (typeof documentModuleOptions)[number]["value"];

export function documentModules(document: LifeDocument) {
  const available = new Set<DocumentModuleValue>(
    documentModuleOptions.map((option) => option.value),
  );
  return document.areas
    .map((area) => area.toLowerCase())
    .filter((module): module is DocumentModuleValue =>
      available.has(module as DocumentModuleValue),
    );
}
