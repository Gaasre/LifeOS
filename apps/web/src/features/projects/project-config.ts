import type { ProjectModule, ProjectRecord, ProjectStep } from "@lifeos/rpc";

export const projectModuleOptions: Array<{
  value: ProjectModule;
  label: string;
}> = [
  { value: "home", label: "Home" },
  { value: "work", label: "Work" },
  { value: "travel", label: "Travel" },
  { value: "money", label: "Money" },
  { value: "health", label: "Health" },
  { value: "memories", label: "Memories" },
];

const projectCoverByModule: Partial<Record<ProjectModule, string>> = {
  home: "/images/home.jpg",
  work: "/images/work.jpg",
  travel: "/images/travel.jpg",
  money: "/images/money.jpg",
  health: "/images/health.jpg",
  memories: "/images/memories.jpg",
};

export function getProjectCover(project: ProjectRecord) {
  if (project.coverImage) return project.coverImage;
  const relatedModule = project.modules.find(
    (module): module is ProjectModule => module in projectCoverByModule,
  );
  return relatedModule
    ? projectCoverByModule[relatedModule]
    : "/images/projects.jpg";
}

export function getProjectAudienceText(project: Pick<ProjectRecord, "people">) {
  const names = project.people.map((person) => person.preferredName);
  if (names.length === 0) return "For the Family";
  if (names.length === 1) return `For ${names[0]}`;
  if (names.length === 2) return `For ${names[0]} & ${names[1]}`;
  return `For ${names.slice(0, -1).join(", ")} & ${names.at(-1)}`;
}

export function getTopLevelSteps(project: ProjectRecord) {
  return project.steps
    .filter((step) => step.parentStepId === null)
    .sort((left, right) => left.position - right.position);
}

export function getSubsteps(project: ProjectRecord, stepId: string) {
  return project.steps
    .filter((step) => step.parentStepId === stepId)
    .sort((left, right) => left.position - right.position);
}

export function getCurrentStep(project: ProjectRecord) {
  return (
    project.steps.find((step) => step.id === project.currentStepId) ?? null
  );
}

export function formatDueDate(step: ProjectStep) {
  if (!step.dueDate) return null;
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${step.dueDate}T00:00:00.000Z`));
}
