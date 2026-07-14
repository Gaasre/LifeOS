import { UsersRoundIcon } from "lucide-react";
import { motion } from "motion/react";

import type { ProjectRecord } from "@lifeos/rpc";
import { Badge } from "@lifeos/ui/components/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@lifeos/ui/components/card";
import { Progress } from "@lifeos/ui/components/progress";
import { cn } from "@lifeos/ui/lib/utils";

import {
  getCurrentStep,
  getProjectAudienceText,
  getProjectCover,
} from "@/features/projects/project-config";
import { projectSpring } from "@/features/projects/project-motion";

export function ProjectCard({
  project,
  selected,
  showAudience,
  onSelect,
}: {
  project: ProjectRecord;
  selected: boolean;
  showAudience: boolean;
  onSelect: () => void;
}) {
  const currentStep = getCurrentStep(project);
  const audienceText = getProjectAudienceText(project);
  const progress =
    project.totalSteps === 0
      ? 0
      : Math.round((project.completedSteps / project.totalSteps) * 100);

  return (
    <Card
      className="group/project relative isolate min-h-48 overflow-hidden border border-transparent ring-1 ring-foreground/[0.035] shadow-[0_24px_70px_-48px_rgb(0_0_0_/_0.95),inset_0_1px_0_rgb(255_255_255_/_0.035)] transition-[border-color,box-shadow,translate] duration-500 ease-out hover:-translate-y-1 hover:border-foreground/10 hover:ring-foreground/10 hover:shadow-[0_30px_80px_-44px_rgb(0_0_0_/_1),inset_0_1px_0_rgb(255_255_255_/_0.08)] focus-within:-translate-y-1 focus-within:ring-3 focus-within:ring-ring/50 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
      aria-current={selected ? "true" : undefined}
    >
      <button
        type="button"
        className="absolute inset-0 cursor-pointer rounded-xl outline-none"
        onClick={onSelect}
        aria-label={`Open ${project.title}`}
        aria-pressed={selected}
      />
      <img
        src={getProjectCover(project)}
        alt=""
        className={cn(
          "pointer-events-none absolute inset-0 size-full scale-[1.01] object-cover opacity-35 grayscale brightness-[0.58] saturate-0 transition-[opacity,filter,transform] duration-700 ease-out group-hover/project:scale-[1.035] group-hover/project:opacity-80 group-hover/project:grayscale-0 group-hover/project:brightness-100 group-hover/project:saturate-100 group-focus-within/project:scale-[1.035] group-focus-within/project:opacity-80 group-focus-within/project:grayscale-0 group-focus-within/project:brightness-100 group-focus-within/project:saturate-100 motion-reduce:transition-none",
          selected &&
            "scale-[1.025] opacity-70 grayscale-0 brightness-90 saturate-100",
        )}
      />
      <div
        className={cn(
          "pointer-events-none absolute inset-0 bg-linear-to-r from-card via-card/90 to-card/35 transition-opacity duration-700 ease-out group-hover/project:opacity-75 group-focus-within/project:opacity-75 motion-reduce:transition-none",
          selected && "opacity-80",
        )}
      />
      {selected ? (
        <motion.div
          layoutId="selected-project-outline"
          className="pointer-events-none absolute inset-0 rounded-xl border border-project-accent/40"
          transition={projectSpring}
          aria-hidden
        />
      ) : null}

      <CardHeader className="pointer-events-none relative">
        <CardTitle className="text-lg font-normal">{project.title}</CardTitle>
        <CardDescription className="line-clamp-1">
          {project.outcome}
        </CardDescription>
        {showAudience ? (
          <CardAction className="max-w-36">
            <Badge
              variant="outline"
              className="max-w-full"
              title={audienceText}
            >
              <UsersRoundIcon aria-hidden />
              <span className="truncate">{audienceText}</span>
            </Badge>
          </CardAction>
        ) : null}
      </CardHeader>

      <CardContent className="pointer-events-none relative mt-auto flex flex-col gap-2">
        <p className="m-0 text-xs text-muted-foreground">Next</p>
        <p className="m-0 line-clamp-1 text-sm text-foreground">
          {currentStep?.title ??
            (project.status === "completed"
              ? "Path complete"
              : "Add the first step")}
        </p>
      </CardContent>

      <CardFooter className="pointer-events-none relative gap-3 bg-card/65">
        <Progress
          value={progress}
          aria-label={`${project.completedSteps} of ${project.totalSteps} stages complete`}
        />
        <span className="shrink-0 text-xs text-muted-foreground">
          {project.completedSteps} / {project.totalSteps}
        </span>
      </CardFooter>
    </Card>
  );
}
