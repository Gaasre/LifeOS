import { useMemo, useState } from "react";
import {
  ActivityIcon,
  ArrowRightIcon,
  CalendarCheckIcon,
  CalendarDaysIcon,
  CheckIcon,
  Clock3Icon,
  CopyIcon,
  DumbbellIcon,
  EllipsisIcon,
  FootprintsIcon,
  GaugeIcon,
  HeartPulseIcon,
  MoreHorizontalIcon,
  MoveRightIcon,
  PencilIcon,
  PlusIcon,
  ScaleIcon,
  TargetIcon,
  UtensilsIcon,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import type {
  FitnessDashboard,
  FitnessMeal,
  FitnessWorkout,
} from "@lifeos/rpc";
import { Badge } from "@lifeos/ui/components/badge";
import { Button } from "@lifeos/ui/components/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@lifeos/ui/components/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
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
import { Progress } from "@lifeos/ui/components/progress";
import { Separator } from "@lifeos/ui/components/separator";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@lifeos/ui/components/toggle-group";
import { cn } from "@lifeos/ui/lib/utils";

import {
  addCalendarDays,
  formatCalendarDate,
  formatCompactNumber,
  formatPace,
  formatWorkoutType,
} from "@/features/fitness/fitness-format";
import {
  fitnessDayVariants,
  fitnessMicroSpring,
  fitnessRise,
  fitnessStagger,
} from "@/features/fitness/fitness-motion";

function SectionHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <motion.div
      variants={fitnessRise}
      className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
    >
      <div className="flex flex-col gap-2">
        <p className="m-0 text-xs font-medium tracking-[0.16em] text-fitness-accent uppercase">
          {eyebrow}
        </p>
        <h2 className="m-0 text-[clamp(1.85rem,6vw,2.75rem)] leading-none font-normal tracking-[-0.03em]">
          {title}
        </h2>
        <p className="m-0 max-w-2xl text-base leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
      {action}
    </motion.div>
  );
}

function DayActions({
  day,
  onMoveWorkout,
  onCopyMeals,
  onReplaceWorkout,
  onSkipWorkout,
  onCompleteDay,
}: {
  day: FitnessDashboard["week"][number];
  onMoveWorkout: (workoutId: string, date: string) => void;
  onCopyMeals: (sourceDate: string, targetDate: string) => void;
  onReplaceWorkout: (date: string, workoutId: string | null) => void;
  onSkipWorkout: (workoutId: string) => void;
  onCompleteDay: (date: string) => void;
}) {
  const tomorrow = addCalendarDays(day.date, 1);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className="[&_svg]:transition-transform [&_svg]:duration-200 aria-expanded:[&_svg]:rotate-90 motion-reduce:[&_svg]:transition-none"
          aria-label={`Actions for ${day.weekday}`}
        >
          <MoreHorizontalIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{day.weekday}</DropdownMenuLabel>
          <DropdownMenuItem
            onSelect={() => onReplaceWorkout(day.date, day.workout?.id ?? null)}
          >
            <PencilIcon />
            {day.workout ? "Replace workout" : "Choose workout"}
          </DropdownMenuItem>
          {day.workout ? (
            <DropdownMenuItem
              onSelect={() => onMoveWorkout(day.workout!.id, tomorrow)}
            >
              <MoveRightIcon /> Move workout to tomorrow
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onSelect={() => onCopyMeals(day.date, tomorrow)}>
            <CopyIcon /> Copy meals to tomorrow
          </DropdownMenuItem>
          {day.workout && day.workout.status !== "completed" ? (
            <DropdownMenuItem onSelect={() => onSkipWorkout(day.workout!.id)}>
              <EllipsisIcon /> Skip workout
            </DropdownMenuItem>
          ) : null}
          {!day.completed ? (
            <DropdownMenuItem onSelect={() => onCompleteDay(day.date)}>
              <CalendarCheckIcon /> Mark day complete
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function FitnessWeek({
  dashboard,
  onOpenDay,
  onAddWorkout,
  onMoveWorkout,
  onCopyMeals,
  onReplaceWorkout,
  onSkipWorkout,
  onCompleteDay,
}: {
  dashboard: FitnessDashboard;
  onOpenDay: (date: string) => void;
  onAddWorkout: (date?: string) => void;
  onMoveWorkout: (workoutId: string, date: string) => void;
  onCopyMeals: (sourceDate: string, targetDate: string) => void;
  onReplaceWorkout: (date: string, workoutId: string | null) => void;
  onSkipWorkout: (workoutId: string) => void;
  onCompleteDay: (date: string) => void;
}) {
  return (
    <motion.div
      className="flex flex-col gap-7"
      initial="hidden"
      animate="visible"
    >
      <SectionHeading
        eyebrow={dashboard.weekLabel}
        title="Weekly plan"
        description="Training and nutrition at a glance, with only enough detail to make the next day easy."
        action={
          <Button variant="outline" onClick={() => onAddWorkout()}>
            <PlusIcon data-icon="inline-start" /> Add workout
          </Button>
        }
      />

      <motion.div variants={fitnessRise}>
        <motion.div
          variants={fitnessStagger}
          className="grid gap-3 sm:grid-cols-2 xl:grid-cols-7"
        >
          {dashboard.week.map((day) => (
            <motion.article
              key={day.date}
              variants={fitnessDayVariants}
              whileHover={{ y: -3 }}
              transition={fitnessMicroSpring}
              className="group/day h-full rounded-xl"
            >
              <Card
                size="sm"
                className={cn(
                  "relative h-full min-h-52 border border-border/70 bg-card/45 transition-[background-color,border-color,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/day:border-fitness-accent/30 group-hover/day:bg-card/60 group-hover/day:shadow-[0_20px_50px_-34px_rgb(0_0_0_/_0.95)] group-focus-within/day:border-fitness-accent/35 motion-reduce:transition-none",
                  day.isToday &&
                    "bg-fitness-accent/[0.065] ring-1 ring-fitness-accent/35",
                )}
              >
                <span
                  className="absolute inset-x-3 top-0 h-px origin-left scale-x-0 bg-gradient-to-r from-transparent via-fitness-accent/80 to-transparent opacity-0 transition-[transform,opacity] duration-300 group-hover/day:scale-x-100 group-hover/day:opacity-100 group-focus-within/day:scale-x-100 group-focus-within/day:opacity-100 motion-reduce:transition-none"
                  aria-hidden
                />
                <CardHeader>
                  <CardTitle className="font-sans text-sm font-normal">
                    {day.weekday}
                  </CardTitle>
                  <CardDescription>{day.shortDate}</CardDescription>
                  <CardAction>
                    <DayActions
                      day={day}
                      onMoveWorkout={onMoveWorkout}
                      onCopyMeals={onCopyMeals}
                      onReplaceWorkout={onReplaceWorkout}
                      onSkipWorkout={onSkipWorkout}
                      onCompleteDay={onCompleteDay}
                    />
                  </CardAction>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <p className="m-0 text-xs tracking-[0.1em] text-muted-foreground uppercase">
                      Training
                    </p>
                    <p className="m-0 text-base leading-snug">
                      {day.workout?.title ?? "Open day"}
                    </p>
                    <p className="m-0 text-sm text-muted-foreground">
                      {day.workout
                        ? day.workout.type === "rest"
                          ? "Recovery"
                          : formatWorkoutType(day.workout.type)
                        : "No workout planned"}
                    </p>
                  </div>
                  <div className="mt-auto flex flex-col gap-1.5">
                    <p className="m-0 text-xs tracking-[0.1em] text-muted-foreground uppercase">
                      Nutrition
                    </p>
                    <p className="m-0 text-sm">
                      {day.calorieTarget
                        ? `${formatCompactNumber(day.calorieTarget, 0)} kcal`
                        : "No target"}
                    </p>
                    <p className="m-0 text-xs text-muted-foreground">
                      {day.mealPlanStatus === "complete"
                        ? "Meals logged"
                        : day.mealPlanStatus === "partly_logged"
                          ? "Partly logged"
                          : day.mealPlanStatus === "planned"
                            ? "Meals planned"
                            : "No meals planned"}
                    </p>
                  </div>
                </CardContent>
                <CardFooter className="justify-between">
                  {day.completed ? (
                    <Badge variant="outline">
                      <CheckIcon /> Complete
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      {day.isToday ? "Today" : "Open"}
                    </span>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onOpenDay(day.date)}
                  >
                    Open
                    <ArrowRightIcon
                      data-icon="inline-end"
                      className="transition-transform duration-200 group-hover/button:translate-x-0.5 motion-reduce:transition-none"
                    />
                  </Button>
                </CardFooter>
              </Card>
            </motion.article>
          ))}
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

function PlanSummary({
  title,
  description,
  frequency,
}: {
  title: string;
  description: string | null;
  frequency: number;
}) {
  return (
    <div className="rounded-xl bg-muted/24 p-4 ring-1 ring-foreground/[0.055]">
      <p className="m-0 text-base">{title}</p>
      <p className="mt-1 mb-0 text-sm text-muted-foreground">
        {frequency} sessions / week
      </p>
      {description ? (
        <p className="mt-3 mb-0 text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      ) : null}
    </div>
  );
}

export function FitnessTraining({
  dashboard,
  onCreatePlan,
  onAddWorkout,
  onStartWorkout,
}: {
  dashboard: FitnessDashboard;
  onCreatePlan: () => void;
  onAddWorkout: () => void;
  onStartWorkout: (workout: FitnessWorkout) => void;
}) {
  const strengthPlan = dashboard.training.plans.find(
    (plan) => plan.type === "strength" || plan.type === "mixed",
  );
  const runningPlan = dashboard.training.plans.find(
    (plan) => plan.type === "running" || plan.type === "mixed",
  );
  const strengthSessions = dashboard.training.recentSessions.filter(
    (session) => session.type === "strength",
  );
  const runningSessions = dashboard.training.recentSessions.filter(
    (session) => session.type !== "strength" && session.type !== "rest",
  );
  const currentStrengthWorkouts = dashboard.week
    .map((day) => day.workout)
    .filter(
      (workout): workout is FitnessWorkout => workout?.type === "strength",
    );
  const currentRunningWorkouts = dashboard.week
    .map((day) => day.workout)
    .filter(
      (workout): workout is FitnessWorkout =>
        Boolean(workout) &&
        workout?.type !== "strength" &&
        workout?.type !== "rest",
    );
  const exerciseLibrary = Array.from(
    new Map(
      currentStrengthWorkouts
        .flatMap((workout) => workout.exercises)
        .map((exercise) => [exercise.exerciseId, exercise]),
    ).values(),
  );

  return (
    <motion.div
      className="flex flex-col gap-7"
      initial="hidden"
      animate="visible"
    >
      <SectionHeading
        eyebrow="Two connected paths"
        title="Training"
        description="Strength and running stay separate enough to remain focused, while sharing one calm weekly rhythm."
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={onCreatePlan}>
              <PlusIcon data-icon="inline-start" /> New plan
            </Button>
            <Button onClick={onAddWorkout}>
              <CalendarDaysIcon data-icon="inline-start" /> Plan workout
            </Button>
          </div>
        }
      />

      <div className="grid gap-5 xl:grid-cols-2">
        <motion.div variants={fitnessRise}>
          <Card className="h-full border border-border/70 bg-card/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl font-normal">
                <DumbbellIcon className="size-5 text-fitness-accent" /> Strength
              </CardTitle>
              <CardDescription>
                Current plan, this week, and only the records that help the next
                session.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              {strengthPlan ? (
                <PlanSummary
                  title={strengthPlan.title}
                  description={strengthPlan.goal}
                  frequency={strengthPlan.weeklyFrequency}
                />
              ) : (
                <Empty>
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <DumbbellIcon />
                    </EmptyMedia>
                    <EmptyTitle>No strength plan yet</EmptyTitle>
                    <EmptyDescription>
                      Create a simple weekly plan for strength or mixed
                      training.
                    </EmptyDescription>
                  </EmptyHeader>
                  <EmptyContent>
                    <Button variant="outline" onClick={onCreatePlan}>
                      Create plan
                    </Button>
                  </EmptyContent>
                </Empty>
              )}

              {currentStrengthWorkouts.length > 0 ? (
                <div className="flex flex-col gap-3">
                  <p className="m-0 text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
                    This week
                  </p>
                  {currentStrengthWorkouts.map((workout, index) => (
                    <div key={workout.id}>
                      {index > 0 ? <Separator /> : null}
                      <div className="-mx-2 flex items-center justify-between gap-4 rounded-lg px-2 py-3 transition-[background-color,transform] duration-200 hover:translate-x-0.5 hover:bg-muted/20 motion-reduce:transition-none motion-reduce:hover:transform-none">
                        <div>
                          <p className="m-0 text-base">{workout.title}</p>
                          <p className="mt-1 mb-0 text-sm text-muted-foreground">
                            {formatCalendarDate(workout.date, { short: true })}
                            {workout.estimatedDurationMinutes
                              ? ` · ${workout.estimatedDurationMinutes} min`
                              : ""}
                          </p>
                        </div>
                        {workout.status === "planned" ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onStartWorkout(workout)}
                          >
                            Start
                            <ArrowRightIcon
                              data-icon="inline-end"
                              className="transition-transform duration-200 group-hover/button:translate-x-0.5 motion-reduce:transition-none"
                            />
                          </Button>
                        ) : (
                          <Badge variant="outline">{workout.status}</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              {exerciseLibrary.length > 0 ? (
                <div className="flex flex-col gap-3">
                  <p className="m-0 text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
                    Exercise library in this plan
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {exerciseLibrary.map((exercise) => (
                      <div
                        key={exercise.exerciseId}
                        className="rounded-lg bg-muted/20 p-3 ring-1 ring-foreground/[0.05]"
                      >
                        <p className="m-0 text-sm">{exercise.name}</p>
                        <p className="mt-1 mb-0 text-xs text-muted-foreground">
                          {exercise.targetSets} × {exercise.targetRepetitions}
                          {exercise.targetWeight !== null
                            ? ` · ${formatCompactNumber(exercise.targetWeight)} kg`
                            : ""}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {dashboard.progress.strength.length > 0 ? (
                <div className="flex flex-col gap-2">
                  <p className="m-0 text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
                    Recent records
                  </p>
                  {dashboard.progress.strength.slice(0, 3).map((record) => (
                    <div
                      key={record.exerciseId}
                      className="flex items-center justify-between gap-4 py-1.5"
                    >
                      <span className="text-sm">{record.name}</span>
                      <span className="text-sm text-muted-foreground">
                        {formatCompactNumber(record.currentWeight)}{" "}
                        {record.unit}
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}

              {strengthSessions.length > 0 ? (
                <div className="flex flex-col gap-2">
                  <p className="m-0 text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
                    Workout history
                  </p>
                  {strengthSessions.slice(0, 3).map((session, index) => (
                    <div key={session.id}>
                      {index > 0 ? <Separator /> : null}
                      <div className="flex items-center justify-between gap-4 py-2.5">
                        <span className="text-sm">{session.title}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatCalendarDate(session.date, { short: true })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </CardContent>
            <CardFooter className="text-sm text-muted-foreground">
              {strengthSessions.length} recent strength sessions recorded
            </CardFooter>
          </Card>
        </motion.div>

        <motion.div variants={fitnessRise}>
          <Card className="h-full border border-border/70 bg-card/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl font-normal">
                <FootprintsIcon className="size-5 text-fitness-accent" />{" "}
                Running
              </CardTitle>
              <CardDescription>
                Distance and pace without GPS maps, routes, or extra noise.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              {runningPlan ? (
                <PlanSummary
                  title={runningPlan.title}
                  description={runningPlan.goal}
                  frequency={runningPlan.weeklyFrequency}
                />
              ) : (
                <Empty>
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <FootprintsIcon />
                    </EmptyMedia>
                    <EmptyTitle>No running plan yet</EmptyTitle>
                    <EmptyDescription>
                      Create a simple distance plan when running belongs in the
                      week.
                    </EmptyDescription>
                  </EmptyHeader>
                  <EmptyContent>
                    <Button variant="outline" onClick={onCreatePlan}>
                      Create plan
                    </Button>
                  </EmptyContent>
                </Empty>
              )}

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-muted/20 p-4 ring-1 ring-foreground/[0.05]">
                  <p className="m-0 text-xs text-muted-foreground">
                    Longest recent run
                  </p>
                  <p className="mt-2 mb-0 text-2xl">
                    {formatCompactNumber(
                      dashboard.progress.running.longestDistanceKm,
                    )}{" "}
                    km
                  </p>
                </div>
                <div className="rounded-xl bg-muted/20 p-4 ring-1 ring-foreground/[0.05]">
                  <p className="m-0 text-xs text-muted-foreground">
                    Recent average pace
                  </p>
                  <p className="mt-2 mb-0 text-2xl">
                    {formatPace(
                      dashboard.progress.running.recentAveragePaceSecondsPerKm,
                    )}
                  </p>
                </div>
                <div className="rounded-xl bg-muted/20 p-4 ring-1 ring-foreground/[0.05]">
                  <p className="m-0 text-xs text-muted-foreground">This week</p>
                  <p className="mt-2 mb-0 text-2xl">
                    {formatCompactNumber(
                      dashboard.progress.running.weeklyDistanceKm,
                    )}{" "}
                    km
                  </p>
                </div>
              </div>

              {currentRunningWorkouts.length > 0 ? (
                <div className="flex flex-col gap-2">
                  <p className="m-0 text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
                    This week’s sessions
                  </p>
                  {currentRunningWorkouts.map((workout, index) => (
                    <div key={workout.id}>
                      {index > 0 ? <Separator /> : null}
                      <div className="-mx-2 flex items-center justify-between gap-4 rounded-lg px-2 py-3 transition-[background-color,transform] duration-200 hover:translate-x-0.5 hover:bg-muted/20 motion-reduce:transition-none motion-reduce:hover:transform-none">
                        <div>
                          <p className="m-0 text-sm">{workout.title}</p>
                          <p className="mt-1 mb-0 text-xs text-muted-foreground">
                            {formatCalendarDate(workout.date, { short: true })}
                            {workout.plannedDistanceKm === null
                              ? ""
                              : ` · ${formatCompactNumber(workout.plannedDistanceKm)} km`}
                          </p>
                        </div>
                        {workout.status === "planned" ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onStartWorkout(workout)}
                          >
                            Start
                            <ArrowRightIcon
                              data-icon="inline-end"
                              className="transition-transform duration-200 group-hover/button:translate-x-0.5 motion-reduce:transition-none"
                            />
                          </Button>
                        ) : (
                          <Badge variant="outline">{workout.status}</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="flex flex-col gap-2">
                <p className="m-0 text-xs font-medium tracking-[0.12em] text-muted-foreground uppercase">
                  Recent runs
                </p>
                {runningSessions.length === 0 ? (
                  <p className="m-0 text-sm text-muted-foreground">
                    No completed runs yet.
                  </p>
                ) : (
                  runningSessions.slice(0, 5).map((session, index) => (
                    <div key={session.id}>
                      {index > 0 ? <Separator /> : null}
                      <div className="flex items-center justify-between gap-4 py-3">
                        <div>
                          <p className="m-0 text-sm">{session.title}</p>
                          <p className="mt-1 mb-0 text-xs text-muted-foreground">
                            {formatCalendarDate(session.date, { short: true })}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="m-0 text-sm">
                            {session.actualDistanceKm
                              ? `${formatCompactNumber(session.actualDistanceKm)} km`
                              : "Completed"}
                          </p>
                          <p className="mt-1 mb-0 text-xs text-muted-foreground">
                            {formatPace(session.averagePaceSecondsPerKm)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}

export function FitnessNutrition({
  dashboard,
  onCreatePlan,
}: {
  dashboard: FitnessDashboard;
  onCreatePlan: () => void;
}) {
  const plan = dashboard.nutrition.activePlan;
  const consistency = dashboard.progress.consistency;
  const adherence =
    consistency.nutritionDays > 0
      ? (consistency.nutritionDaysOnTarget / consistency.nutritionDays) * 100
      : 0;

  return (
    <motion.div
      className="flex flex-col gap-7"
      initial="hidden"
      animate="visible"
    >
      <SectionHeading
        eyebrow="Targets, not micromanagement"
        title="Nutrition"
        description="A practical calorie and protein target with four simple meals — no giant food database required."
        action={
          <Button onClick={onCreatePlan}>
            <PlusIcon data-icon="inline-start" />{" "}
            {plan ? "Adjust plan" : "Create plan"}
          </Button>
        }
      />

      {plan ? (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
          <motion.div variants={fitnessRise}>
            <Card className="h-full border border-border/70 bg-card/50">
              <CardHeader>
                <CardTitle className="text-xl font-normal">
                  {plan.title}
                </CardTitle>
                <CardDescription>
                  {plan.goal ?? "A steady, practical daily plan."}
                </CardDescription>
                <CardAction>
                  <Badge variant="outline">Active</Badge>
                </CardAction>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-muted/22 p-5 ring-1 ring-foreground/[0.05]">
                  <p className="m-0 text-xs text-muted-foreground">Calories</p>
                  <p className="mt-2 mb-0 text-3xl tracking-[-0.03em]">
                    {formatCompactNumber(plan.calorieTarget, 0)}
                    <span className="ml-1 text-sm text-muted-foreground">
                      kcal
                    </span>
                  </p>
                </div>
                <div className="rounded-xl bg-muted/22 p-5 ring-1 ring-foreground/[0.05]">
                  <p className="m-0 text-xs text-muted-foreground">Protein</p>
                  <p className="mt-2 mb-0 text-3xl tracking-[-0.03em]">
                    {formatCompactNumber(plan.proteinTarget, 0)}
                    <span className="ml-1 text-sm text-muted-foreground">
                      g
                    </span>
                  </p>
                </div>
                <div className="rounded-xl bg-muted/22 p-5 ring-1 ring-foreground/[0.05]">
                  <p className="m-0 text-xs text-muted-foreground">Meals</p>
                  <p className="mt-2 mb-0 text-3xl tracking-[-0.03em]">
                    {plan.mealsPerDay}
                    <span className="ml-1 text-sm text-muted-foreground">
                      / day
                    </span>
                  </p>
                </div>
              </CardContent>
              <CardFooter className="justify-between text-sm text-muted-foreground">
                <span>
                  Effective{" "}
                  {formatCalendarDate(plan.startDate, { short: true })}
                </span>
                <span>
                  {plan.endDate
                    ? `Ends ${formatCalendarDate(plan.endDate, { short: true })}`
                    : "No end date"}
                </span>
              </CardFooter>
            </Card>
          </motion.div>

          <motion.div variants={fitnessRise}>
            <Card className="h-full border border-border/70 bg-card/45">
              <CardHeader>
                <CardTitle>Simple adherence</CardTitle>
                <CardDescription>
                  Days near the calorie target in the recent window.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex items-end justify-between gap-4">
                  <p className="m-0 text-3xl tracking-[-0.03em]">
                    {consistency.nutritionDaysOnTarget}
                    <span className="ml-1 text-base text-muted-foreground">
                      of {consistency.nutritionDays} days
                    </span>
                  </p>
                  <span className="text-sm text-muted-foreground">
                    {Math.round(adherence)}%
                  </span>
                </div>
                <Progress
                  value={adherence}
                  className="h-1.5 [&_[data-slot=progress-indicator]]:bg-fitness-accent"
                />
                <p className="m-0 text-sm leading-relaxed text-muted-foreground">
                  {adherence >= 70
                    ? "On track. Keep the plan steady."
                    : "Slightly below plan. More data will make the trend clearer."}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      ) : (
        <motion.div variants={fitnessRise}>
          <Card className="border border-border/70 bg-card/45">
            <CardContent>
              <Empty className="min-h-80">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <UtensilsIcon />
                  </EmptyMedia>
                  <EmptyTitle>
                    Set a calorie and protein target to start planning meals.
                  </EmptyTitle>
                  <EmptyDescription>
                    Carbohydrate and fat targets stay optional in this first
                    version.
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <Button onClick={onCreatePlan}>Create nutrition plan</Button>
                </EmptyContent>
              </Empty>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
}

export function FitnessMeals({
  dashboard,
  onCreateMeal,
  onOpenMeal,
  onAddMeal,
}: {
  dashboard: FitnessDashboard;
  onCreateMeal: () => void;
  onOpenMeal: (meal: FitnessMeal) => void;
  onAddMeal: (meal: FitnessMeal) => void;
}) {
  const [filter, setFilter] = useState("all");
  const filters = [
    ["all", "All"],
    ["favourites", "Favourites"],
    ["breakfast", "Breakfasts"],
    ["shakes", "Shakes"],
    ["two", "For two"],
  ] as const;
  const visibleMeals = useMemo(
    () =>
      dashboard.meals.filter((meal) => {
        if (filter === "all") return true;
        if (filter === "favourites") return meal.favourite;
        const tags = meal.tags.join(" ").toLowerCase();
        if (filter === "breakfast") return tags.includes("breakfast");
        if (filter === "shakes") return tags.includes("shake");
        return tags.includes("two");
      }),
    [dashboard.meals, filter],
  );

  return (
    <motion.div
      className="flex flex-col gap-7"
      initial="hidden"
      animate="visible"
    >
      <SectionHeading
        eyebrow="Repeatable by design"
        title="Meals"
        description="A small personal library of meals worth making again. Groceries stays in its own module."
        action={
          <Button onClick={onCreateMeal}>
            <PlusIcon data-icon="inline-start" /> Create meal
          </Button>
        }
      />

      <motion.div variants={fitnessRise} className="overflow-x-auto pb-1">
        <ToggleGroup
          type="single"
          variant="outline"
          value={filter}
          onValueChange={(value) => value && setFilter(value)}
          aria-label="Filter reusable meals"
        >
          {filters.map(([value, label]) => (
            <ToggleGroupItem key={value} value={value}>
              {label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </motion.div>

      {visibleMeals.length === 0 ? (
        <motion.div variants={fitnessRise}>
          <Empty className="min-h-72 border border-border/70 bg-card/35">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <UtensilsIcon />
              </EmptyMedia>
              <EmptyTitle>No meals in this group yet.</EmptyTitle>
              <EmptyDescription>
                Create a simple meal you can realistically repeat.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button variant="outline" onClick={onCreateMeal}>
                Create meal
              </Button>
            </EmptyContent>
          </Empty>
        </motion.div>
      ) : (
        <div className="relative grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence initial={false} mode="popLayout">
            {visibleMeals.map((meal) => (
              <motion.div
                key={meal.id}
                layout
                initial={{ opacity: 0, y: 7, scale: 0.985 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.98 }}
                whileHover={{ y: -3 }}
                transition={fitnessMicroSpring}
                className="group/meal h-full rounded-xl"
              >
                <Card className="h-full border border-border/70 bg-card/48 transition-[background-color,border-color,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/meal:border-fitness-accent/30 group-hover/meal:bg-card/58 group-hover/meal:shadow-[0_20px_55px_-38px_rgb(0_0_0_/_0.95)] motion-reduce:transition-none">
                  <CardHeader>
                    <CardTitle className="text-lg font-normal">
                      {meal.title}
                    </CardTitle>
                    <CardDescription className="line-clamp-2">
                      {meal.description ?? "A simple reusable meal."}
                    </CardDescription>
                    {meal.favourite ? (
                      <CardAction>
                        <Badge variant="outline">Favourite</Badge>
                      </CardAction>
                    ) : null}
                  </CardHeader>
                  <CardContent className="flex flex-col gap-4">
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary">
                        {meal.caloriesPerServing === null
                          ? "No calories"
                          : `${meal.caloriesPerServing} kcal`}
                      </Badge>
                      <Badge variant="secondary">
                        {meal.proteinPerServing === null
                          ? "No protein"
                          : `${meal.proteinPerServing} g protein`}
                      </Badge>
                      <Badge variant="secondary">
                        <Clock3Icon /> {meal.preparationMinutes ?? "—"} min
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {meal.tags.slice(0, 3).map((tag) => (
                        <Badge
                          key={tag}
                          variant="outline"
                          className="font-normal"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    {meal.servings > 1 ? (
                      <p className="m-0 text-sm text-muted-foreground">
                        Suitable for {meal.servings} servings.
                      </p>
                    ) : null}
                  </CardContent>
                  <CardFooter className="justify-between">
                    <Button variant="ghost" onClick={() => onOpenMeal(meal)}>
                      Details
                      <ArrowRightIcon
                        data-icon="inline-end"
                        className="transition-transform duration-200 group-hover/button:translate-x-0.5 motion-reduce:transition-none"
                      />
                    </Button>
                    <Button variant="outline" onClick={() => onAddMeal(meal)}>
                      <PlusIcon data-icon="inline-start" /> Add to day
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}

export function FitnessGoals({
  dashboard,
  onCreateGoal,
  onLogWeight,
}: {
  dashboard: FitnessDashboard;
  onCreateGoal: () => void;
  onLogWeight: () => void;
}) {
  return (
    <motion.div
      className="flex flex-col gap-7"
      initial="hidden"
      animate="visible"
    >
      <SectionHeading
        eyebrow="Outcome focused"
        title="Goals"
        description="A few useful destinations without badges, points, or streak pressure."
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={onLogWeight}>
              <ScaleIcon data-icon="inline-start" /> Log weight
            </Button>
            <Button onClick={onCreateGoal}>
              <PlusIcon data-icon="inline-start" /> Add goal
            </Button>
          </div>
        }
      />

      {dashboard.goals.length === 0 ? (
        <motion.div variants={fitnessRise}>
          <Empty className="min-h-72 border border-border/70 bg-card/35">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <TargetIcon />
              </EmptyMedia>
              <EmptyTitle>No goals yet</EmptyTitle>
              <EmptyDescription>
                Add one clear outcome for weight, strength, consistency, or
                running.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button onClick={onCreateGoal}>Add goal</Button>
            </EmptyContent>
          </Empty>
        </motion.div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {dashboard.goals.map((goal) => (
            <motion.div key={goal.id} variants={fitnessRise}>
              <Card className="h-full border border-border/70 bg-card/48">
                <CardHeader>
                  <CardTitle className="text-lg font-normal">
                    {goal.title}
                  </CardTitle>
                  <CardDescription>
                    {goal.type.replaceAll("_", " ")}
                  </CardDescription>
                  <CardAction>
                    <Badge variant="outline">{goal.status}</Badge>
                  </CardAction>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <div className="flex items-end justify-between gap-4">
                    <p className="m-0 text-2xl tracking-[-0.02em]">
                      {goal.currentValue === null
                        ? "No recent data"
                        : `${formatCompactNumber(goal.currentValue)} ${goal.unit}`}
                    </p>
                    {goal.progress !== null ? (
                      <span className="text-sm text-muted-foreground">
                        {Math.round(goal.progress)}%
                      </span>
                    ) : null}
                  </div>
                  <Progress
                    value={goal.progress ?? 0}
                    className="h-1.5 [&_[data-slot=progress-indicator]]:bg-fitness-accent"
                  />
                  <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
                    <span>
                      {goal.startingValue === null
                        ? "Start not set"
                        : `Started at ${formatCompactNumber(goal.startingValue)} ${goal.unit}`}
                    </span>
                    <span>
                      Target {formatCompactNumber(goal.targetValue)} {goal.unit}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

function WeightSparkline({
  trend,
}: {
  trend: NonNullable<FitnessDashboard["progress"]["weight"]>["trend"];
}) {
  if (trend.length < 2) return null;
  const width = 520;
  const height = 150;
  const values = trend.map((point) => point.value);
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const range = Math.max(0.2, maximum - minimum);
  const points = trend
    .map((point, index) => {
      const x = 12 + (index / (trend.length - 1)) * (width - 24);
      const y = height - 14 - ((point.value - minimum) / range) * (height - 28);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-36 w-full overflow-visible"
      role="img"
      aria-label={`Weight trend from ${formatCompactNumber(values[0]!)} to ${formatCompactNumber(values.at(-1)!)} kilograms`}
    >
      <defs>
        <linearGradient id="fitness-weight-fill" x1="0" y1="0" x2="0" y2="1">
          <stop
            offset="0%"
            stopColor="var(--fitness-accent)"
            stopOpacity="0.22"
          />
          <stop
            offset="100%"
            stopColor="var(--fitness-accent)"
            stopOpacity="0"
          />
        </linearGradient>
      </defs>
      <polyline
        points={`12,${height - 10} ${points} ${width - 12},${height - 10}`}
        fill="url(#fitness-weight-fill)"
        stroke="none"
      />
      <motion.polyline
        points={points}
        fill="none"
        stroke="var(--fitness-accent)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 0.9 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      />
    </svg>
  );
}

export function FitnessProgress({
  dashboard,
}: {
  dashboard: FitnessDashboard;
}) {
  const weight = dashboard.progress.weight;
  const consistency = dashboard.progress.consistency;
  const workoutConsistency =
    consistency.plannedWorkouts > 0
      ? (consistency.completedWorkouts / consistency.plannedWorkouts) * 100
      : 0;
  const nutritionConsistency =
    consistency.nutritionDays > 0
      ? (consistency.nutritionDaysOnTarget / consistency.nutritionDays) * 100
      : 0;

  return (
    <motion.div
      className="flex flex-col gap-7"
      initial="hidden"
      animate="visible"
    >
      <SectionHeading
        eyebrow="Only decision-useful trends"
        title="Progress"
        description="Enough context to see whether the plan is working, without turning daily fluctuations into alarms."
      />

      {!weight &&
      dashboard.progress.strength.length === 0 &&
      dashboard.progress.running.longestDistanceKm === 0 ? (
        <motion.div variants={fitnessRise}>
          <Empty className="min-h-72 border border-border/70 bg-card/35">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ActivityIcon />
              </EmptyMedia>
              <EmptyTitle>
                Progress will appear after a few workouts, runs, or
                measurements.
              </EmptyTitle>
              <EmptyDescription>
                The module will prefer weekly direction over noisy daily
                changes.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </motion.div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-12">
          {weight ? (
            <motion.div variants={fitnessRise} className="xl:col-span-7">
              <Card className="h-full border border-border/70 bg-card/48">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl font-normal">
                    <ScaleIcon className="size-5 text-fitness-accent" /> Weight
                    trend
                  </CardTitle>
                  <CardDescription>
                    Weekly measurements, read as a direction rather than a
                    verdict.
                  </CardDescription>
                  <CardAction>
                    <Badge variant="outline">
                      {weight.changeSinceStart >= 0 ? "+" : ""}
                      {formatCompactNumber(weight.changeSinceStart)}{" "}
                      {weight.unit}
                    </Badge>
                  </CardAction>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                    <p className="m-0 text-4xl tracking-[-0.04em]">
                      {formatCompactNumber(weight.current)} {weight.unit}
                    </p>
                    <p className="m-0 text-sm text-muted-foreground">
                      Started {formatCompactNumber(weight.starting)}{" "}
                      {weight.unit}
                      {weight.target === null
                        ? ""
                        : ` · Target ${formatCompactNumber(weight.target)} ${weight.unit}`}
                    </p>
                  </div>
                  <WeightSparkline trend={weight.trend} />
                </CardContent>
              </Card>
            </motion.div>
          ) : null}

          <motion.div variants={fitnessRise} className="xl:col-span-5">
            <Card className="h-full border border-border/70 bg-card/45">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl font-normal">
                  <CalendarCheckIcon className="size-5 text-fitness-accent" />{" "}
                  Consistency
                </CardTitle>
                <CardDescription>
                  Neutral plan completion, without streak pressure.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-6">
                <div className="flex flex-col gap-3">
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <p className="m-0 text-sm">Training</p>
                      <p className="mt-1 mb-0 text-sm text-muted-foreground">
                        {consistency.completedWorkouts} of{" "}
                        {consistency.plannedWorkouts} planned sessions completed
                      </p>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {Math.round(workoutConsistency)}%
                    </span>
                  </div>
                  <Progress
                    value={workoutConsistency}
                    className="h-1.5 [&_[data-slot=progress-indicator]]:bg-fitness-accent"
                  />
                </div>
                <div className="flex flex-col gap-3">
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <p className="m-0 text-sm">Nutrition</p>
                      <p className="mt-1 mb-0 text-sm text-muted-foreground">
                        Target reached on {consistency.nutritionDaysOnTarget} of{" "}
                        {consistency.nutritionDays} days
                      </p>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {Math.round(nutritionConsistency)}%
                    </span>
                  </div>
                  <Progress
                    value={nutritionConsistency}
                    className="h-1.5 [&_[data-slot=progress-indicator]]:bg-fitness-accent"
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={fitnessRise} className="xl:col-span-6">
            <Card className="h-full border border-border/70 bg-card/45">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl font-normal">
                  <GaugeIcon className="size-5 text-fitness-accent" /> Strength
                </CardTitle>
                <CardDescription>
                  A small set of key movements, not a chart for every exercise.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {dashboard.progress.strength.length === 0 ? (
                  <p className="m-0 text-sm text-muted-foreground">
                    No strength results recorded yet.
                  </p>
                ) : (
                  dashboard.progress.strength.map((record, index) => (
                    <div key={record.exerciseId}>
                      {index > 0 ? <Separator /> : null}
                      <div className="flex items-center justify-between gap-4 py-3">
                        <div>
                          <p className="m-0 text-sm">{record.name}</p>
                          <p className="mt-1 mb-0 text-xs text-muted-foreground">
                            {record.previousWeight === null
                              ? "First result"
                              : `Previous ${formatCompactNumber(record.previousWeight)} ${record.unit}`}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="m-0 text-lg">
                            {formatCompactNumber(record.currentWeight)}{" "}
                            {record.unit}
                          </p>
                          <p className="mt-1 mb-0 text-xs text-muted-foreground">
                            {record.direction === "up"
                              ? "Moving up"
                              : record.direction === "down"
                                ? "Slightly lower"
                                : "Steady"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={fitnessRise} className="xl:col-span-6">
            <Card className="h-full border border-border/70 bg-card/45">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl font-normal">
                  <HeartPulseIcon className="size-5 text-fitness-accent" />{" "}
                  Running
                </CardTitle>
                <CardDescription>
                  Distance and pace trends that inform the next week.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-muted/20 p-4 ring-1 ring-foreground/[0.05]">
                  <p className="m-0 text-xs text-muted-foreground">
                    Longest distance
                  </p>
                  <p className="mt-2 mb-0 text-2xl">
                    {formatCompactNumber(
                      dashboard.progress.running.longestDistanceKm,
                    )}{" "}
                    km
                  </p>
                </div>
                <div className="rounded-xl bg-muted/20 p-4 ring-1 ring-foreground/[0.05]">
                  <p className="m-0 text-xs text-muted-foreground">
                    Average pace
                  </p>
                  <p className="mt-2 mb-0 text-xl">
                    {formatPace(
                      dashboard.progress.running.recentAveragePaceSecondsPerKm,
                    )}
                  </p>
                </div>
                <div className="rounded-xl bg-muted/20 p-4 ring-1 ring-foreground/[0.05]">
                  <p className="m-0 text-xs text-muted-foreground">
                    Weekly distance
                  </p>
                  <p className="mt-2 mb-0 text-2xl">
                    {formatCompactNumber(
                      dashboard.progress.running.weeklyDistanceKm,
                    )}{" "}
                    km
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
