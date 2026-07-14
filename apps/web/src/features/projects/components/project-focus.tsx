import { Link } from "react-router-dom";
import {
  ArrowRightIcon,
  CheckIcon,
  CirclePauseIcon,
  CirclePlayIcon,
  EllipsisIcon,
  FilePlus2Icon,
  FileTextIcon,
  ListRestartIcon,
  MilestoneIcon,
  PencilIcon,
  PlusIcon,
  RouteIcon,
  UsersRoundIcon,
} from "lucide-react";
import { motion } from "motion/react";

import type { ProjectRecord, ProjectStep } from "@lifeos/rpc";
import { Badge } from "@lifeos/ui/components/badge";
import { Button } from "@lifeos/ui/components/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@lifeos/ui/components/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@lifeos/ui/components/dropdown-menu";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@lifeos/ui/components/empty";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@lifeos/ui/components/item";
import { Separator } from "@lifeos/ui/components/separator";
import { Spinner } from "@lifeos/ui/components/spinner";
import { cn } from "@lifeos/ui/lib/utils";

import {
  getCurrentStep,
  getProjectAudienceText,
  getSubsteps,
  getTopLevelSteps,
} from "@/features/projects/project-config";
import { projectEase, projectSpring } from "@/features/projects/project-motion";

function Path({
  project,
  onOpenStep,
}: {
  project: ProjectRecord;
  onOpenStep: (step: ProjectStep) => void;
}) {
  const steps = getTopLevelSteps(project);

  if (steps.length === 0) {
    return null;
  }

  const completedSegments = Math.min(
    steps.filter((step) => step.status === "completed").length,
    Math.max(steps.length - 1, 0),
  );
  const completedProgress =
    steps.length > 1 ? completedSegments / (steps.length - 1) : 0;

  return (
    <div className="-mx-2 overflow-x-auto px-2 pb-2">
      <ol
        className="relative flex min-w-max items-start"
        aria-label="Project path"
      >
        {steps.length > 1 ? (
          <>
            <Separator
              className="pointer-events-none absolute top-6 right-16 left-16 w-auto"
              aria-hidden
            />
            <motion.span
              className="pointer-events-none absolute top-6 right-16 left-16 h-px origin-left bg-project-accent/55"
              initial={false}
              animate={{ scaleX: completedProgress }}
              transition={projectSpring}
              aria-hidden
            />
          </>
        ) : null}
        {steps.map((step, index) => {
          const completed = step.status === "completed";
          const current = step.id === project.currentStepId;
          return (
            <motion.li
              key={step.id}
              className="relative"
              layout="position"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.97 }}
              transition={{
                duration: 0.22,
                delay: Math.min(index, 6) * 0.035,
                ease: projectEase,
                layout: projectSpring,
              }}
            >
              <Button
                type="button"
                variant="ghost"
                className="h-auto w-32 flex-col gap-2 py-2 whitespace-normal"
                onClick={() => onOpenStep(step)}
                aria-current={current ? "step" : undefined}
              >
                <motion.span
                  key={`${step.status}-${current ? "current" : "rest"}`}
                  className={cn(
                    "flex size-8 items-center justify-center rounded-full border text-xs transition-shadow",
                    completed && "border-border bg-muted text-foreground",
                    current &&
                      "border-project-accent bg-card text-project-accent shadow-[0_0_24px_-7px_var(--project-accent)]",
                    !completed &&
                      !current &&
                      "border-border bg-card text-muted-foreground",
                  )}
                  initial={{ scale: 0.88 }}
                  animate={{ scale: 1 }}
                  transition={projectSpring}
                  aria-hidden
                >
                  {completed ? (
                    <CheckIcon />
                  ) : current ? (
                    <span className="size-2 rounded-full bg-project-accent" />
                  ) : (
                    index + 1
                  )}
                </motion.span>
                <span className="line-clamp-2 text-center text-xs leading-snug">
                  {step.title}
                </span>
              </Button>
            </motion.li>
          );
        })}
      </ol>
    </div>
  );
}

export function ProjectFocus({
  project,
  showAudience,
  onOpenStep,
  onAddStep,
  onEditProject,
  onManagePath,
  onAttachStepDocuments,
  onAttachProjectDocuments,
  onToggleStatus,
  isChangingStatus,
}: {
  project: ProjectRecord;
  showAudience: boolean;
  onOpenStep: (step: ProjectStep) => void;
  onAddStep: (parentStepId?: string) => void;
  onEditProject: () => void;
  onManagePath: () => void;
  onAttachStepDocuments: (step: ProjectStep) => void;
  onAttachProjectDocuments: () => void;
  onToggleStatus: () => void;
  isChangingStatus: boolean;
}) {
  const topLevelSteps = getTopLevelSteps(project);
  const currentStep = getCurrentStep(project);
  const substeps = currentStep ? getSubsteps(project, currentStep.id) : [];
  const audienceText = getProjectAudienceText(project);

  return (
    <Card className="min-h-[39rem] bg-card/70 backdrop-blur-xl">
      <CardHeader className="px-5 sm:px-6">
        <CardTitle className="text-[clamp(1.65rem,4vw,2rem)] font-normal tracking-[-0.02em]">
          {project.title}
        </CardTitle>
        <CardDescription className="text-base">
          {project.outcome}
        </CardDescription>
        {showAudience ? (
          <Badge variant="outline" className="mt-2">
            <UsersRoundIcon aria-hidden />
            {audienceText}
          </Badge>
        ) : null}
        <CardAction>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`More options for ${project.title}`}
              >
                <EllipsisIcon />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuGroup>
                <DropdownMenuItem onSelect={onEditProject}>
                  <PencilIcon />
                  Edit project
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => onAddStep()}>
                  <PlusIcon />
                  Add step
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={onManagePath}>
                  <ListRestartIcon />
                  Manage path
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={onAttachProjectDocuments}>
                  <FilePlus2Icon />
                  Project documents
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem
                  disabled={isChangingStatus || project.status === "completed"}
                  onSelect={onToggleStatus}
                >
                  {project.status === "paused" ? (
                    <CirclePlayIcon />
                  ) : (
                    <CirclePauseIcon />
                  )}
                  {project.status === "paused"
                    ? "Resume project"
                    : "Pause project"}
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardAction>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-9 px-5 pb-6 sm:px-6">
        {currentStep ? (
          <motion.section
            key={currentStep.id}
            className="flex flex-col gap-3"
            aria-labelledby="next-step-title"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, ease: projectEase }}
          >
            <p
              id="next-step-title"
              className="m-0 text-sm text-muted-foreground"
            >
              Next step
            </p>
            <motion.div
              whileHover={{ x: 2 }}
              whileTap={{ scale: 0.995 }}
              transition={projectSpring}
            >
              <Item
                asChild
                variant="muted"
                className="min-h-20 cursor-pointer px-4 py-4"
              >
                <button type="button" onClick={() => onOpenStep(currentStep)}>
                  <ItemMedia
                    variant="icon"
                    className="flex size-11 rounded-full bg-project-accent/10 text-project-accent"
                  >
                    <MilestoneIcon />
                  </ItemMedia>
                  <ItemContent>
                    <ItemTitle className="text-lg font-normal">
                      {currentStep.title}
                    </ItemTitle>
                  </ItemContent>
                  <ItemActions>
                    <ArrowRightIcon />
                  </ItemActions>
                </button>
              </Item>
            </motion.div>
          </motion.section>
        ) : topLevelSteps.length === 0 ? (
          <Empty className="min-h-48 border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <RouteIcon />
              </EmptyMedia>
              <EmptyTitle>Add the first step</EmptyTitle>
              <EmptyDescription>
                Add the first step so you know where to begin.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button
                type="button"
                variant="outline"
                onClick={() => onAddStep()}
              >
                <PlusIcon data-icon="inline-start" />
                Add first step
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          <Empty className="min-h-48 border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <CheckIcon />
              </EmptyMedia>
              <EmptyTitle>Path complete</EmptyTitle>
              <EmptyDescription>
                Every stage in this project has been completed.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}

        {currentStep ? (
          <section
            className="flex flex-col gap-3"
            aria-labelledby="before-start-title"
          >
            <div className="flex items-center justify-between gap-3">
              <p
                id="before-start-title"
                className="m-0 text-sm text-muted-foreground"
              >
                Before you start
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onAddStep(currentStep.id)}
              >
                <PlusIcon data-icon="inline-start" />
                Add
              </Button>
            </div>
            {substeps.length > 0 ? (
              <ItemGroup className="grid gap-2 sm:grid-cols-3">
                {substeps.map((substep, index) => (
                  <Item key={substep.id} variant="outline" size="sm">
                    <ItemMedia
                      variant="icon"
                      className="flex size-7 rounded-full border text-xs text-muted-foreground"
                    >
                      {substep.status === "completed" ? (
                        <CheckIcon />
                      ) : (
                        index + 1
                      )}
                    </ItemMedia>
                    <ItemContent>
                      <ItemTitle>{substep.title}</ItemTitle>
                    </ItemContent>
                  </Item>
                ))}
              </ItemGroup>
            ) : (
              <p className="m-0 text-sm text-muted-foreground">
                No preparation needed yet. Add a small item only if it helps you
                begin.
              </p>
            )}
          </section>
        ) : null}

        {currentStep ? (
          <section
            className="flex flex-col gap-3"
            aria-labelledby="step-documents-title"
          >
            <div className="flex items-center justify-between gap-3">
              <p
                id="step-documents-title"
                className="m-0 text-sm text-muted-foreground"
              >
                Attached documents
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onAttachStepDocuments(currentStep)}
              >
                <FilePlus2Icon data-icon="inline-start" />
                Attach
              </Button>
            </div>
            {currentStep.documents.length > 0 ? (
              <ItemGroup className="grid gap-2 sm:grid-cols-2">
                {currentStep.documents.map((document) => (
                  <Item key={document.id} asChild variant="outline">
                    <Link to={`/documents?document=${document.id}`}>
                      <ItemMedia variant="icon">
                        <FileTextIcon />
                      </ItemMedia>
                      <ItemContent>
                        <ItemTitle>{document.title}</ItemTitle>
                      </ItemContent>
                    </Link>
                  </Item>
                ))}
              </ItemGroup>
            ) : (
              <p className="m-0 text-sm text-muted-foreground">
                Attach anything you will need before starting.
              </p>
            )}
          </section>
        ) : null}

        {topLevelSteps.length > 0 ? (
          <section
            className="mt-auto flex flex-col gap-3"
            aria-labelledby="project-path-title"
          >
            <p
              id="project-path-title"
              className="m-0 text-sm text-muted-foreground"
            >
              Your path
            </p>
            <Path project={project} onOpenStep={onOpenStep} />
          </section>
        ) : null}

        {isChangingStatus ? (
          <span className="sr-only" role="status">
            <Spinner /> Updating project status
          </span>
        ) : null}
      </CardContent>
    </Card>
  );
}
