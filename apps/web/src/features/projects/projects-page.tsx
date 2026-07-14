import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CommandIcon, MilestoneIcon, PlusIcon, RouteIcon } from "lucide-react";
import {
  AnimatePresence,
  LayoutGroup,
  motion,
  MotionConfig,
} from "motion/react";
import { toast } from "sonner";

import type { ProjectRecord, ProjectStatus, ProjectStep } from "@lifeos/rpc";
import { Alert, AlertDescription } from "@lifeos/ui/components/alert";
import { Button } from "@lifeos/ui/components/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@lifeos/ui/components/empty";
import { Kbd } from "@lifeos/ui/components/kbd";
import { Skeleton } from "@lifeos/ui/components/skeleton";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@lifeos/ui/components/toggle-group";

import { AppHeader } from "@/components/app-header";
import {
  DocumentPickerDialog,
  type DocumentPickerChoice,
} from "@/features/projects/components/document-picker-dialog";
import {
  ManagePathDialog,
  ProjectEditorDialog,
  StepEditorDialog,
} from "@/features/projects/components/project-dialogs";
import { ProjectCard } from "@/features/projects/components/project-card";
import { ProjectFocus } from "@/features/projects/components/project-focus";
import { ProjectsActions } from "@/features/projects/components/projects-actions";
import { StepDetailSheet } from "@/features/projects/components/step-detail-sheet";
import {
  projectsQueryKey,
  useProjects,
} from "@/features/projects/hooks/use-projects";
import { usePerspective } from "@/features/perspectives/perspective-context";
import { projectEase, projectSpring } from "@/features/projects/project-motion";
import { rpcClient } from "@/lib/rpc-client";

type EditorMode = "new" | "edit";
type DocumentTarget = { kind: "project" } | { kind: "step"; stepId: string };

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function ProjectsPage() {
  const queryClient = useQueryClient();
  const {
    people,
    perspective,
    selectedPerson,
    viewerPersonId,
    isPending: isPerspectivePending,
  } = usePerspective();
  const perspectivePersonId =
    perspective.kind === "person" ? perspective.personId : undefined;
  const projectsQuery = useProjects(perspectivePersonId, !isPerspectivePending);
  const projects = projectsQuery.data ?? [];

  const [filter, setFilter] = useState<ProjectStatus>("active");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null,
  );
  const [projectEditorOpen, setProjectEditorOpen] = useState(false);
  const [projectEditorMode, setProjectEditorMode] = useState<EditorMode>("new");
  const [stepEditorOpen, setStepEditorOpen] = useState(false);
  const [stepToEditId, setStepToEditId] = useState<string | null>(null);
  const [defaultParentStepId, setDefaultParentStepId] = useState<string | null>(
    null,
  );
  const [managePathOpen, setManagePathOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [stepDetailOpen, setStepDetailOpen] = useState(false);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [documentTarget, setDocumentTarget] = useState<DocumentTarget | null>(
    null,
  );
  const [isSavingStep, setIsSavingStep] = useState(false);
  const [isChangingStatus, setIsChangingStatus] = useState(false);

  const visibleProjects = useMemo(
    () => projects.filter((project) => project.status === filter),
    [filter, projects],
  );
  const selectedProject =
    visibleProjects.find((project) => project.id === selectedProjectId) ??
    visibleProjects[0] ??
    null;
  const selectedStep =
    selectedProject?.steps.find((step) => step.id === selectedStepId) ?? null;
  const stepToEdit =
    selectedProject?.steps.find((step) => step.id === stepToEditId) ?? null;
  const targetStep =
    documentTarget?.kind === "step"
      ? (selectedProject?.steps.find(
          (step) => step.id === documentTarget.stepId,
        ) ?? null)
      : null;

  const defaultPersonIds = useMemo(
    () =>
      perspectivePersonId
        ? [perspectivePersonId]
        : viewerPersonId
          ? [viewerPersonId]
          : [],
    [perspectivePersonId, viewerPersonId],
  );
  const perspectiveLabel =
    perspective.kind === "family"
      ? "Family"
      : (selectedPerson?.preferredName ?? "Personal");

  useEffect(() => {
    if (
      selectedProjectId &&
      visibleProjects.some((project) => project.id === selectedProjectId)
    ) {
      return;
    }
    setSelectedProjectId(visibleProjects[0]?.id ?? null);
  }, [selectedProjectId, visibleProjects]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setActionsOpen((open) => !open);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  function acceptProject(project: ProjectRecord) {
    setSelectedProjectId(project.id);
  }

  function openNewProject() {
    setProjectEditorMode("new");
    setProjectEditorOpen(true);
  }

  function openEditProject() {
    if (!selectedProject) return;
    setProjectEditorMode("edit");
    setProjectEditorOpen(true);
  }

  function openNewStep(parentStepId: string | null = null) {
    if (!selectedProject) return;
    setStepToEditId(null);
    setDefaultParentStepId(parentStepId);
    setStepEditorOpen(true);
  }

  function openEditStep(step: ProjectStep) {
    setStepDetailOpen(false);
    setStepToEditId(step.id);
    setDefaultParentStepId(null);
    setStepEditorOpen(true);
  }

  function openStep(step: ProjectStep) {
    setSelectedStepId(step.id);
    setStepDetailOpen(true);
  }

  function openStepDocuments(step: ProjectStep) {
    setStepDetailOpen(false);
    setDocumentTarget({ kind: "step", stepId: step.id });
  }

  async function refreshProjects() {
    await queryClient.invalidateQueries({ queryKey: projectsQueryKey });
  }

  async function toggleProjectStatus() {
    if (!selectedProject || selectedProject.status === "completed") return;
    setIsChangingStatus(true);
    try {
      const status = selectedProject.status === "paused" ? "active" : "paused";
      const saved = await rpcClient.projects.setStatus({
        projectId: selectedProject.id,
        status,
      });
      acceptProject(saved);
      await refreshProjects();
      toast.success(
        status === "paused" ? "Project paused." : "Project resumed.",
      );
    } catch (error) {
      toast.error(
        getErrorMessage(error, "The project status could not be changed."),
      );
    } finally {
      setIsChangingStatus(false);
    }
  }

  async function toggleStep(step: ProjectStep, completed?: boolean) {
    const nextCompleted = completed ?? step.status !== "completed";
    setIsSavingStep(true);
    try {
      const saved = await rpcClient.projects.setStepCompleted({
        stepId: step.id,
        completed: nextCompleted,
      });
      acceptProject(saved);
      await refreshProjects();
      toast.success(
        nextCompleted
          ? "Step complete. The path moved forward."
          : "Step reopened.",
      );
    } catch (error) {
      toast.error(getErrorMessage(error, "This step could not be updated."));
    } finally {
      setIsSavingStep(false);
    }
  }

  async function saveDocuments(documents: DocumentPickerChoice[]) {
    if (!selectedProject || !documentTarget) return;
    const documentIds = documents.map((document) => document.id);
    if (documentTarget.kind === "project") {
      const saved = await rpcClient.projects.setProjectDocuments({
        projectId: selectedProject.id,
        documentIds,
      });
      acceptProject(saved);
      await refreshProjects();
      toast.success("Project documents updated.");
      return;
    }

    if (!targetStep) return;
    const saved = await rpcClient.projects.updateStep({
      stepId: targetStep.id,
      title: targetStep.title,
      description: targetStep.description,
      dueDate: targetStep.dueDate,
      documentIds,
    });
    acceptProject(saved);
    await refreshProjects();
    toast.success("Step documents updated.");
  }

  const documentPickerTitle =
    documentTarget?.kind === "project"
      ? "Project documents"
      : "Documents for this step";
  const documentPickerDescription =
    documentTarget?.kind === "project"
      ? "Link references that are useful throughout the whole path."
      : "Choose only the files needed for this stage.";
  const selectedDocuments =
    documentTarget?.kind === "project"
      ? (selectedProject?.documents ?? [])
      : (targetStep?.documents ?? []);

  return (
    <MotionConfig reducedMotion="user">
      <main className="dark min-h-screen overflow-x-hidden bg-background text-foreground">
        <div className="mx-auto w-full max-w-[92rem] px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
          <AppHeader section="Projects" />

          <div className="mt-12 flex min-w-0 flex-col gap-8 lg:mt-18 lg:pl-32">
            <motion.section
              className="flex min-w-0 flex-col gap-2"
              aria-labelledby="projects-title"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.32, ease: projectEase }}
            >
              <p className="m-0 text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
                {perspectiveLabel} perspective
              </p>
              <h1
                id="projects-title"
                className="m-0 text-[clamp(2.25rem,8vw,3.2rem)] leading-[1.02] font-normal tracking-[-0.025em]"
              >
                Projects
              </h1>
              <p className="m-0 text-base text-muted-foreground sm:text-lg">
                {perspective.kind === "family"
                  ? "Clear paths for what matters across your Family."
                  : `Clear paths for what matters to ${perspectiveLabel}.`}
              </p>
            </motion.section>

            <motion.section
              className="flex min-w-0 flex-col gap-5"
              aria-label="Project workspace"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.32, delay: 0.06, ease: projectEase }}
            >
              <div className="flex items-center justify-between gap-4">
                <p className="m-0 text-sm text-muted-foreground">
                  {filter === "active"
                    ? "Active paths"
                    : filter === "paused"
                      ? "Paused paths"
                      : "Completed paths"}
                </p>
                <ToggleGroup
                  type="single"
                  variant="outline"
                  size="sm"
                  value={filter}
                  onValueChange={(value) => {
                    if (
                      value === "active" ||
                      value === "paused" ||
                      value === "completed"
                    ) {
                      setFilter(value);
                    }
                  }}
                  aria-label="Filter projects by status"
                >
                  <ToggleGroupItem value="active">Active</ToggleGroupItem>
                  <ToggleGroupItem value="paused">Paused</ToggleGroupItem>
                  <ToggleGroupItem value="completed">Completed</ToggleGroupItem>
                </ToggleGroup>
              </div>

              <motion.div
                layout
                className="relative min-h-[30rem]"
                transition={{ layout: projectSpring }}
              >
                <AnimatePresence initial={false} mode="popLayout">
                  {projectsQuery.isPending || isPerspectivePending ? (
                    <motion.div
                      key="projects-loading"
                      className="w-full"
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.18, ease: projectEase }}
                    >
                      <div className="grid gap-5 lg:grid-cols-[minmax(17rem,23rem)_minmax(0,1fr)]">
                        <div className="flex flex-col gap-3">
                          {Array.from({ length: 3 }, (_, index) => (
                            <Skeleton
                              key={index}
                              className="h-48 w-full rounded-xl"
                            />
                          ))}
                        </div>
                        <Skeleton className="min-h-[39rem] w-full rounded-xl" />
                      </div>
                    </motion.div>
                  ) : projectsQuery.isError ? (
                    <motion.div
                      key="projects-error"
                      className="w-full"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.22, ease: projectEase }}
                    >
                      <Alert>
                        <AlertDescription className="flex items-center justify-between gap-4">
                          <span>Projects could not be loaded right now.</span>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => void projectsQuery.refetch()}
                          >
                            Try again
                          </Button>
                        </AlertDescription>
                      </Alert>
                    </motion.div>
                  ) : visibleProjects.length === 0 ? (
                    <motion.div
                      key={`projects-empty-${filter}`}
                      className="w-full"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.22, ease: projectEase }}
                    >
                      <Empty className="min-h-[30rem] border">
                        <EmptyHeader>
                          <EmptyMedia variant="icon">
                            {filter === "active" ? (
                              <RouteIcon />
                            ) : (
                              <MilestoneIcon />
                            )}
                          </EmptyMedia>
                          <EmptyTitle>
                            {filter === "active"
                              ? "Create a clear path"
                              : `No ${filter} projects`}
                          </EmptyTitle>
                          <EmptyDescription>
                            {filter === "active"
                              ? "Create a clear path for something that matters."
                              : "There is nothing in this view yet."}
                          </EmptyDescription>
                        </EmptyHeader>
                        {filter === "active" ? (
                          <EmptyContent>
                            <Button type="button" onClick={openNewProject}>
                              <PlusIcon data-icon="inline-start" />
                              New project
                            </Button>
                          </EmptyContent>
                        ) : null}
                      </Empty>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="projects-ready"
                      className="w-full"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.26, ease: projectEase }}
                    >
                      <LayoutGroup id="projects-workspace">
                        <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(17rem,23rem)_minmax(0,1fr)] xl:grid-cols-[minmax(19rem,25rem)_minmax(0,1fr)]">
                          <div className="relative flex min-w-0 flex-col gap-3">
                            <AnimatePresence mode="popLayout">
                              {visibleProjects.map((project, index) => (
                                <motion.div
                                  key={project.id}
                                  layout="position"
                                  initial={{ opacity: 0, y: 8 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.985 }}
                                  transition={{
                                    duration: 0.24,
                                    delay: Math.min(index, 5) * 0.035,
                                    ease: projectEase,
                                    layout: projectSpring,
                                  }}
                                >
                                  <ProjectCard
                                    project={project}
                                    selected={
                                      project.id === selectedProject?.id
                                    }
                                    showAudience={perspective.kind === "family"}
                                    onSelect={() =>
                                      setSelectedProjectId(project.id)
                                    }
                                  />
                                </motion.div>
                              ))}
                            </AnimatePresence>
                          </div>
                          <div className="min-w-0">
                            <AnimatePresence initial={false} mode="wait">
                              {selectedProject ? (
                                <motion.div
                                  key={selectedProject.id}
                                  initial={{ opacity: 0, x: 8 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  exit={{ opacity: 0, x: -4 }}
                                  transition={{
                                    duration: 0.2,
                                    ease: projectEase,
                                  }}
                                >
                                  <ProjectFocus
                                    project={selectedProject}
                                    showAudience={perspective.kind === "family"}
                                    onOpenStep={openStep}
                                    onAddStep={(parentStepId) =>
                                      openNewStep(parentStepId ?? null)
                                    }
                                    onEditProject={openEditProject}
                                    onManagePath={() => setManagePathOpen(true)}
                                    onAttachStepDocuments={openStepDocuments}
                                    onAttachProjectDocuments={() =>
                                      setDocumentTarget({ kind: "project" })
                                    }
                                    onToggleStatus={() =>
                                      void toggleProjectStatus()
                                    }
                                    isChangingStatus={isChangingStatus}
                                  />
                                </motion.div>
                              ) : null}
                            </AnimatePresence>
                          </div>
                        </div>
                      </LayoutGroup>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </motion.section>
          </div>
        </div>

        <motion.div
          className="fixed right-4 bottom-4 sm:right-6 sm:bottom-6"
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.97 }}
          transition={projectSpring}
        >
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="rounded-full shadow-lg"
            onClick={() => setActionsOpen(true)}
          >
            <CommandIcon data-icon="inline-start" />
            Actions
            <Kbd className="ml-1 hidden sm:inline-flex">⌘ K</Kbd>
          </Button>
        </motion.div>

        <ProjectsActions
          open={actionsOpen}
          onOpenChange={setActionsOpen}
          hasProject={Boolean(selectedProject)}
          onNewProject={openNewProject}
          onNewStep={() => openNewStep()}
          onEditProject={openEditProject}
          onManagePath={() => setManagePathOpen(true)}
          onProjectDocuments={() => setDocumentTarget({ kind: "project" })}
        />

        <ProjectEditorDialog
          open={projectEditorOpen}
          onOpenChange={setProjectEditorOpen}
          people={people}
          defaultPersonIds={defaultPersonIds}
          project={projectEditorMode === "edit" ? selectedProject : null}
          onSaved={acceptProject}
        />

        <StepEditorDialog
          open={stepEditorOpen}
          onOpenChange={setStepEditorOpen}
          projects={projects}
          defaultProjectId={selectedProject?.id ?? null}
          defaultParentStepId={defaultParentStepId}
          step={stepToEdit}
          onSaved={acceptProject}
        />

        <ManagePathDialog
          open={managePathOpen}
          onOpenChange={setManagePathOpen}
          project={selectedProject}
          onSaved={acceptProject}
        />

        <DocumentPickerDialog
          open={Boolean(documentTarget)}
          onOpenChange={(open) => {
            if (!open) setDocumentTarget(null);
          }}
          title={documentPickerTitle}
          description={documentPickerDescription}
          selectedDocuments={selectedDocuments}
          maxSelection={documentTarget?.kind === "project" ? 30 : 20}
          onSave={saveDocuments}
        />

        <StepDetailSheet
          project={selectedProject}
          step={selectedStep}
          open={stepDetailOpen}
          onOpenChange={setStepDetailOpen}
          onEdit={openEditStep}
          onAttachDocuments={openStepDocuments}
          onToggleStep={(step) => void toggleStep(step)}
          onToggleSubstep={(step, completed) =>
            void toggleStep(step, completed)
          }
          isSaving={isSavingStep}
        />
      </main>
    </MotionConfig>
  );
}
