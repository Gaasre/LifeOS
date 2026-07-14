import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CheckIcon,
  FilePlus2Icon,
  FileTextIcon,
  MilestoneIcon,
  XIcon,
} from "lucide-react";
import { toast } from "sonner";

import type {
  PersonSummary,
  ProjectModule,
  ProjectRecord,
  ProjectStep,
} from "@lifeos/rpc";
import { Button } from "@lifeos/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@lifeos/ui/components/dialog";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@lifeos/ui/components/empty";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@lifeos/ui/components/field";
import { Input } from "@lifeos/ui/components/input";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@lifeos/ui/components/item";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@lifeos/ui/components/select";
import { Spinner } from "@lifeos/ui/components/spinner";
import { Textarea } from "@lifeos/ui/components/textarea";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@lifeos/ui/components/toggle-group";

import {
  DocumentPickerDialog,
  type DocumentPickerChoice,
} from "@/features/projects/components/document-picker-dialog";
import { projectsQueryKey } from "@/features/projects/hooks/use-projects";
import {
  getTopLevelSteps,
  projectModuleOptions,
} from "@/features/projects/project-config";
import { rpcClient } from "@/lib/rpc-client";

function nullableText(value: string) {
  return value.trim() || null;
}

const familyAudienceValue = "family";

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function knownModules(project?: ProjectRecord | null) {
  if (!project) return [];
  return project.modules.filter((module): module is ProjectModule =>
    projectModuleOptions.some((option) => option.value === module),
  );
}

export function ProjectEditorDialog({
  open,
  onOpenChange,
  people,
  defaultPersonIds,
  project,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  people: PersonSummary[];
  defaultPersonIds: string[];
  project?: ProjectRecord | null;
  onSaved: (project: ProjectRecord) => void;
}) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [outcome, setOutcome] = useState("");
  const [whyItMatters, setWhyItMatters] = useState("");
  const [firstStep, setFirstStep] = useState("");
  const [personIds, setPersonIds] = useState<string[]>(defaultPersonIds);
  const [modules, setModules] = useState<ProjectModule[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const isEditing = Boolean(project);
  const audienceValues =
    personIds.length === 0 ? [familyAudienceValue] : personIds;

  useEffect(() => {
    if (!open) return;
    setTitle(project?.title ?? "");
    setOutcome(project?.outcome ?? "");
    setWhyItMatters(project?.whyItMatters ?? "");
    setFirstStep("");
    setPersonIds(
      project ? project.people.map((person) => person.id) : defaultPersonIds,
    );
    setModules(knownModules(project));
    setError(null);
  }, [defaultPersonIds, open, project]);

  function changeAudience(values: string[]) {
    const selectedPeople = values.filter(
      (value) => value !== familyAudienceValue,
    );
    if (values.includes(familyAudienceValue) && selectedPeople.length > 0) {
      setPersonIds(personIds.length === 0 ? selectedPeople : []);
      return;
    }
    setPersonIds(selectedPeople);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      const saved = project
        ? await rpcClient.projects.update({
            projectId: project.id,
            title: title.trim(),
            outcome: outcome.trim(),
            whyItMatters: nullableText(whyItMatters),
            coverImage: project.coverImage,
            personIds,
            modules,
            relatedEntityIds: project.relatedEntities.map(
              (entity) => entity.id,
            ),
          })
        : await rpcClient.projects.create({
            title: title.trim(),
            outcome: outcome.trim(),
            whyItMatters: nullableText(whyItMatters),
            coverImage: null,
            firstStep: nullableText(firstStep),
            personIds,
            modules,
            relatedEntityIds: [],
          });
      await queryClient.invalidateQueries({ queryKey: projectsQueryKey });
      toast.success(isEditing ? "Project updated." : "Your path is ready.");
      onOpenChange(false);
      onSaved(saved);
    } catch (caught) {
      setError(
        errorMessage(
          caught,
          isEditing
            ? "This project could not be updated."
            : "This project could not be created.",
        ),
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-[min(90dvh,46rem)] grid-rows-[auto_minmax(0,1fr)] overflow-hidden sm:max-w-xl">
        <DialogHeader className="pr-8">
          <DialogTitle>
            {isEditing ? "Edit project" : "New project"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Keep the outcome clear and the relationships useful."
              : "Define the outcome and give yourself a clear place to begin."}
          </DialogDescription>
        </DialogHeader>

        <form
          className="grid min-h-0 grid-rows-[minmax(0,1fr)_auto] gap-4"
          onSubmit={submit}
        >
          <div className="-mx-4 min-h-0 overflow-y-auto overscroll-contain px-4">
            <FieldGroup className="pb-1">
              <Field data-invalid={Boolean(error)}>
                <FieldLabel htmlFor="project-name">Project name</FieldLabel>
                <Input
                  id="project-name"
                  value={title}
                  maxLength={160}
                  placeholder="Permanent residency"
                  aria-invalid={Boolean(error)}
                  onChange={(event) => setTitle(event.target.value)}
                />
              </Field>

              <Field data-invalid={Boolean(error)}>
                <FieldLabel htmlFor="project-outcome">
                  Goal / outcome
                </FieldLabel>
                <Textarea
                  id="project-outcome"
                  value={outcome}
                  rows={2}
                  maxLength={300}
                  placeholder="Receive German permanent residency"
                  aria-invalid={Boolean(error)}
                  onChange={(event) => setOutcome(event.target.value)}
                />
              </Field>

              <FieldSet>
                <FieldLegend variant="label">Who is this for?</FieldLegend>
                <FieldDescription>
                  Choose one or more people, or Family for shared household
                  work. This controls perspectives, not access.
                </FieldDescription>
                <ToggleGroup
                  type="multiple"
                  variant="outline"
                  value={audienceValues}
                  onValueChange={changeAudience}
                  className="w-full flex-wrap justify-start"
                  aria-label="Who this project is for"
                >
                  <ToggleGroupItem value={familyAudienceValue}>
                    Family
                  </ToggleGroupItem>
                  {people.map((person) => (
                    <ToggleGroupItem key={person.id} value={person.id}>
                      {person.preferredName}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </FieldSet>

              <FieldSet>
                <FieldLegend variant="label">Appears in</FieldLegend>
                <FieldDescription>
                  Optionally surface this project in other LifeOS modules.
                </FieldDescription>
                <ToggleGroup
                  type="multiple"
                  variant="outline"
                  value={modules}
                  onValueChange={(values) =>
                    setModules(values as ProjectModule[])
                  }
                  className="w-full flex-wrap justify-start"
                  aria-label="LifeOS modules related to this project"
                >
                  {projectModuleOptions.map((option) => (
                    <ToggleGroupItem key={option.value} value={option.value}>
                      {option.label}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </FieldSet>

              <Field>
                <FieldLabel htmlFor="project-why">Why it matters</FieldLabel>
                <Textarea
                  id="project-why"
                  value={whyItMatters}
                  rows={2}
                  maxLength={800}
                  placeholder="Optional context for future you"
                  onChange={(event) => setWhyItMatters(event.target.value)}
                />
              </Field>

              {!isEditing ? (
                <Field>
                  <FieldLabel htmlFor="project-first-step">
                    First step / next action
                  </FieldLabel>
                  <Input
                    id="project-first-step"
                    value={firstStep}
                    maxLength={180}
                    placeholder="Book the A1 exam"
                    onChange={(event) => setFirstStep(event.target.value)}
                  />
                  <FieldDescription>
                    Optional. You can shape the full path after creation.
                  </FieldDescription>
                </Field>
              ) : null}

              <FieldError>{error}</FieldError>
            </FieldGroup>
          </div>

          <DialogFooter showCloseButton>
            <Button
              type="submit"
              disabled={!title.trim() || !outcome.trim() || isSaving}
            >
              {isSaving ? <Spinner data-icon="inline-start" /> : null}
              {isSaving
                ? "Saving…"
                : isEditing
                  ? "Save project"
                  : "Create project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function StepEditorDialog({
  open,
  onOpenChange,
  projects,
  defaultProjectId,
  defaultParentStepId = null,
  step = null,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: ProjectRecord[];
  defaultProjectId: string | null;
  defaultParentStepId?: string | null;
  step?: ProjectStep | null;
  onSaved: (project: ProjectRecord) => void;
}) {
  const queryClient = useQueryClient();
  const [projectId, setProjectId] = useState(defaultProjectId ?? "");
  const [stepType, setStepType] = useState<"step" | "substep">("step");
  const [parentStepId, setParentStepId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [selectedDocuments, setSelectedDocuments] = useState<
    DocumentPickerChoice[]
  >([]);
  const [documentPickerOpen, setDocumentPickerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const isEditing = Boolean(step);

  const selectedProject = projects.find((project) => project.id === projectId);
  const parentOptions = selectedProject
    ? getTopLevelSteps(selectedProject)
    : [];

  useEffect(() => {
    if (!open) return;
    const nextProjectId =
      step?.projectId ?? defaultProjectId ?? projects[0]?.id ?? "";
    setProjectId(nextProjectId);
    setStepType(step?.parentStepId || defaultParentStepId ? "substep" : "step");
    setParentStepId(step?.parentStepId ?? defaultParentStepId ?? "");
    setTitle(step?.title ?? "");
    setDescription(step?.description ?? "");
    setDueDate(step?.dueDate ?? "");
    setSelectedDocuments(step?.documents ?? []);
    setDocumentPickerOpen(false);
    setError(null);
  }, [defaultParentStepId, defaultProjectId, open, projects, step]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    try {
      const saved = step
        ? await rpcClient.projects.updateStep({
            stepId: step.id,
            title: title.trim(),
            description: nullableText(description),
            dueDate: dueDate || null,
            documentIds: selectedDocuments.map((document) => document.id),
          })
        : await rpcClient.projects.addStep({
            projectId,
            parentStepId: stepType === "substep" ? parentStepId || null : null,
            title: title.trim(),
            description: nullableText(description),
            dueDate: dueDate || null,
            documentIds: selectedDocuments.map((document) => document.id),
          });
      await queryClient.invalidateQueries({ queryKey: projectsQueryKey });
      toast.success(isEditing ? "Step updated." : "Step added to the path.");
      onOpenChange(false);
      onSaved(saved);
    } catch (caught) {
      setError(
        errorMessage(
          caught,
          isEditing
            ? "This step could not be updated."
            : "This step could not be created.",
        ),
      );
    } finally {
      setIsSaving(false);
    }
  }

  const canSubmit =
    Boolean(projectId && title.trim()) &&
    (stepType === "step" || Boolean(parentStepId));

  return (
    <>
      <Dialog
        open={open && !documentPickerOpen}
        onOpenChange={(nextOpen) => {
          if (!documentPickerOpen) onOpenChange(nextOpen);
        }}
      >
        <DialogContent className="h-[min(90dvh,48rem)] grid-rows-[auto_minmax(0,1fr)] overflow-hidden sm:max-w-xl">
          <DialogHeader className="pr-8">
            <DialogTitle>{isEditing ? "Edit step" : "New step"}</DialogTitle>
            <DialogDescription>
              {isEditing
                ? "Keep this stage clear and ready to act on."
                : "Add one stage to the path, or one preparation item beneath it."}
            </DialogDescription>
          </DialogHeader>

          <form
            className="grid min-h-0 grid-rows-[minmax(0,1fr)_auto] gap-4"
            onSubmit={submit}
          >
            <div className="-mx-4 min-h-0 overflow-y-auto overscroll-contain px-4">
              <FieldGroup className="pb-1">
                <Field data-invalid={Boolean(error)}>
                  <FieldLabel htmlFor="project-step-title">
                    Step title
                  </FieldLabel>
                  <Input
                    id="project-step-title"
                    value={title}
                    maxLength={180}
                    placeholder="Book the A1 exam"
                    aria-invalid={Boolean(error)}
                    onChange={(event) => setTitle(event.target.value)}
                  />
                </Field>

                {!isEditing ? (
                  <Field>
                    <FieldLabel>Belongs to project</FieldLabel>
                    <Select
                      value={projectId}
                      onValueChange={(value) => {
                        setProjectId(value);
                        setParentStepId("");
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Choose a project" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {projects.map((project) => (
                            <SelectItem key={project.id} value={project.id}>
                              {project.title}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>
                ) : null}

                {!isEditing ? (
                  <FieldSet>
                    <FieldLegend variant="label">Step type</FieldLegend>
                    <ToggleGroup
                      type="single"
                      variant="outline"
                      value={stepType}
                      onValueChange={(value) => {
                        if (value === "step" || value === "substep") {
                          setStepType(value);
                        }
                      }}
                      aria-label="Choose step type"
                    >
                      <ToggleGroupItem value="step">Step</ToggleGroupItem>
                      <ToggleGroupItem value="substep">Substep</ToggleGroupItem>
                    </ToggleGroup>
                  </FieldSet>
                ) : null}

                {!isEditing && stepType === "substep" ? (
                  <Field>
                    <FieldLabel>Parent step</FieldLabel>
                    <Select
                      value={parentStepId}
                      onValueChange={setParentStepId}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Choose a path stage" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {parentOptions.map((parent) => (
                            <SelectItem key={parent.id} value={parent.id}>
                              {parent.title}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>
                ) : null}

                <Field>
                  <FieldLabel htmlFor="project-step-description">
                    Short description
                  </FieldLabel>
                  <Textarea
                    id="project-step-description"
                    value={description}
                    rows={2}
                    maxLength={800}
                    placeholder="Optional context for this stage"
                    onChange={(event) => setDescription(event.target.value)}
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="project-step-due-date">
                    Due date
                  </FieldLabel>
                  <Input
                    id="project-step-due-date"
                    type="date"
                    value={dueDate}
                    onChange={(event) => setDueDate(event.target.value)}
                  />
                </Field>

                <Field>
                  <div className="flex items-center justify-between gap-3">
                    <FieldLabel>Attached documents</FieldLabel>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setDocumentPickerOpen(true)}
                    >
                      <FilePlus2Icon data-icon="inline-start" />
                      {selectedDocuments.length > 0
                        ? `Choose files · ${selectedDocuments.length}`
                        : "Choose files"}
                    </Button>
                  </div>
                  <FieldDescription>
                    Search files already stored in Documents. Nothing is
                    duplicated.
                  </FieldDescription>
                  {selectedDocuments.length > 0 ? (
                    <FieldGroup className="gap-2">
                      {selectedDocuments.map((document) => (
                        <Item key={document.id} variant="outline" size="xs">
                          <ItemMedia variant="icon">
                            <FileTextIcon />
                          </ItemMedia>
                          <ItemContent>
                            <ItemTitle>{document.title}</ItemTitle>
                          </ItemContent>
                          <ItemActions>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-xs"
                              onClick={() =>
                                setSelectedDocuments((current) =>
                                  current.filter(
                                    (selected) => selected.id !== document.id,
                                  ),
                                )
                              }
                            >
                              <XIcon />
                              <span className="sr-only">
                                Remove {document.title}
                              </span>
                            </Button>
                          </ItemActions>
                        </Item>
                      ))}
                    </FieldGroup>
                  ) : (
                    <FieldDescription>
                      No files attached. Add only what this step needs.
                    </FieldDescription>
                  )}
                </Field>

                <FieldError>{error}</FieldError>
              </FieldGroup>
            </div>

            <DialogFooter showCloseButton>
              <Button type="submit" disabled={!canSubmit || isSaving}>
                {isSaving ? <Spinner data-icon="inline-start" /> : null}
                {isSaving ? "Saving…" : isEditing ? "Save step" : "Create step"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <DocumentPickerDialog
        open={open && documentPickerOpen}
        onOpenChange={setDocumentPickerOpen}
        title="Documents for this step"
        description="Search and choose only the files needed for this stage."
        selectedDocuments={selectedDocuments}
        maxSelection={20}
        confirmLabel="Use selected"
        onSave={async (documents) => setSelectedDocuments(documents)}
      />
    </>
  );
}

export function ManagePathDialog({
  open,
  onOpenChange,
  project,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: ProjectRecord | null;
  onSaved: (project: ProjectRecord) => void;
}) {
  const queryClient = useQueryClient();
  const initialSteps = useMemo(
    () => (project ? getTopLevelSteps(project) : []),
    [project],
  );
  const [orderedIds, setOrderedIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setOrderedIds(initialSteps.map((step) => step.id));
    setError(null);
  }, [initialSteps, open]);

  function move(index: number, direction: -1 | 1) {
    setOrderedIds((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target]!, next[index]!];
      return next;
    });
  }

  async function save() {
    if (!project) return;
    setIsSaving(true);
    setError(null);
    try {
      const saved = await rpcClient.projects.reorderSteps({
        projectId: project.id,
        stepIds: orderedIds,
      });
      await queryClient.invalidateQueries({ queryKey: projectsQueryKey });
      toast.success("Path reordered.");
      onOpenChange(false);
      onSaved(saved);
    } catch (caught) {
      setError(errorMessage(caught, "The path could not be reordered."));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-[min(82dvh,36rem)] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden sm:max-w-lg">
        <DialogHeader className="pr-8">
          <DialogTitle>Manage path</DialogTitle>
          <DialogDescription>
            Move the major stages into the order you want to follow.
          </DialogDescription>
        </DialogHeader>

        <div className="-mx-4 min-h-0 overflow-y-auto overscroll-contain px-4">
          {orderedIds.length > 0 ? (
            <ItemGroup className="gap-2">
              {orderedIds.map((stepId, index) => {
                const step = initialSteps.find((item) => item.id === stepId);
                if (!step) return null;
                return (
                  <Item key={step.id} variant="outline">
                    <ItemMedia variant="icon">
                      {step.status === "completed" ? (
                        <CheckIcon />
                      ) : (
                        <MilestoneIcon />
                      )}
                    </ItemMedia>
                    <ItemContent>
                      <ItemTitle>{step.title}</ItemTitle>
                    </ItemContent>
                    <ItemActions>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        disabled={index === 0}
                        onClick={() => move(index, -1)}
                        aria-label={`Move ${step.title} earlier`}
                      >
                        <ArrowUpIcon />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        disabled={index === orderedIds.length - 1}
                        onClick={() => move(index, 1)}
                        aria-label={`Move ${step.title} later`}
                      >
                        <ArrowDownIcon />
                      </Button>
                    </ItemActions>
                  </Item>
                );
              })}
            </ItemGroup>
          ) : (
            <Empty className="min-h-64 border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <MilestoneIcon />
                </EmptyMedia>
                <EmptyTitle>No path to reorder</EmptyTitle>
                <EmptyDescription>
                  Add the first step so you know where to begin.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
          {error ? <FieldError className="mt-3">{error}</FieldError> : null}
        </div>

        <DialogFooter showCloseButton>
          <Button
            type="button"
            disabled={!project || orderedIds.length === 0 || isSaving}
            onClick={() => void save()}
          >
            {isSaving ? <Spinner data-icon="inline-start" /> : null}
            {isSaving ? "Saving…" : "Save order"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
