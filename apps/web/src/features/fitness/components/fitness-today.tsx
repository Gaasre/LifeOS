import {
  ArrowRightIcon,
  CalendarDaysIcon,
  CheckIcon,
  DumbbellIcon,
  FootprintsIcon,
  MoonStarIcon,
  PlusIcon,
  RefreshCcwIcon,
  RouteIcon,
  UtensilsIcon,
} from "lucide-react";
import { motion } from "motion/react";

import type {
  FitnessDashboard,
  FitnessSection,
  FitnessWorkout,
  PlannedFitnessMeal,
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
import { Checkbox } from "@lifeos/ui/components/checkbox";
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
import { Spinner } from "@lifeos/ui/components/spinner";

import {
  formatCompactNumber,
  formatWorkoutType,
} from "@/features/fitness/fitness-format";
import {
  fitnessMicroSpring,
  fitnessRise,
} from "@/features/fitness/fitness-motion";

function workoutIcon(workout: FitnessWorkout) {
  if (workout.type === "strength") return DumbbellIcon;
  if (workout.type === "rest") return MoonStarIcon;
  if (workout.type === "long_run" || workout.type === "intervals") {
    return RouteIcon;
  }
  return FootprintsIcon;
}

function WorkoutHero({
  workout,
  dayLabel,
  onStart,
  onAddWorkout,
}: {
  workout: FitnessWorkout | null;
  dayLabel: string;
  onStart: (workout: FitnessWorkout) => void;
  onAddWorkout: () => void;
}) {
  if (!workout) {
    return (
      <motion.div variants={fitnessRise}>
        <Card className="min-h-80 border border-border/70 bg-card/60 shadow-[0_30px_100px_-70px_rgb(0_0_0_/_0.95)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DumbbellIcon className="size-4 text-fitness-accent" />
              {dayLabel}’s workout
            </CardTitle>
          </CardHeader>
          <CardContent className="flex min-h-52 items-center justify-center">
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <CalendarDaysIcon />
                </EmptyMedia>
                <EmptyTitle>No training is planned for this day.</EmptyTitle>
                <EmptyDescription>
                  Choose a workout, add one, or leave the day open for rest.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button onClick={onAddWorkout}>
                  <PlusIcon data-icon="inline-start" /> Add workout
                </Button>
              </EmptyContent>
            </Empty>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  const Icon = workoutIcon(workout);
  const isRest = workout.type === "rest";
  const isComplete = workout.status === "completed";
  const meta =
    workout.type === "strength"
      ? [
          formatWorkoutType(workout.type),
          workout.estimatedDurationMinutes
            ? `${workout.estimatedDurationMinutes} min`
            : null,
        ]
      : isRest
        ? ["Recovery"]
        : [
            workout.plannedDistanceKm
              ? `${formatCompactNumber(workout.plannedDistanceKm)} km`
              : formatWorkoutType(workout.type),
            workout.estimatedDurationMinutes
              ? `${workout.estimatedDurationMinutes} min`
              : null,
          ];

  return (
    <motion.div variants={fitnessRise} className="group/workout">
      <Card className="relative isolate min-h-92 overflow-hidden border border-border/70 bg-card/55 py-0 shadow-[0_36px_120px_-68px_rgb(0_0_0_/_1)] ring-1 ring-foreground/[0.035] [--card-spacing:--spacing(6)] sm:min-h-104">
        <img
          src="/images/fitness-workout-hero.jpg"
          alt=""
          aria-hidden
          className="absolute inset-0 size-full scale-[1.015] object-cover opacity-64 grayscale-[0.15] saturate-[0.72] transition-transform duration-[1400ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/workout:scale-[1.035] motion-reduce:transition-none"
        />
        <div
          className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/78 to-background/25"
          aria-hidden
        />
        <div
          className="absolute inset-0 bg-gradient-to-t from-background/82 via-transparent to-background/28"
          aria-hidden
        />
        <div
          className="fitness-horizon-glow absolute top-[14%] right-[5%] size-56 rounded-full bg-fitness-accent/18 blur-3xl sm:size-80"
          aria-hidden
        />

        <CardHeader className="relative z-10 pt-(--card-spacing)">
          <div className="flex items-center gap-2 text-xs font-medium tracking-[0.16em] text-fitness-accent uppercase">
            <Icon className="size-4" />
            {dayLabel}’s workout
          </div>
          <CardAction>
            <Badge
              variant="outline"
              className="bg-background/30 backdrop-blur-sm"
            >
              {isComplete ? "Completed" : isRest ? "Recovery" : "Planned"}
            </Badge>
          </CardAction>
        </CardHeader>

        <CardContent className="relative z-10 flex flex-1 flex-col justify-end gap-5 pb-7 sm:max-w-2xl">
          <div className="flex flex-col gap-3">
            <CardTitle className="text-[clamp(2.2rem,8vw,4.2rem)] leading-[0.96] font-normal tracking-[-0.045em]">
              {workout.title}
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2 text-base text-foreground/90 sm:text-lg">
              {meta.filter(Boolean).map((item, index) => (
                <span key={item} className="flex items-center gap-2">
                  {index > 0 ? (
                    <span className="text-fitness-accent/70">·</span>
                  ) : null}
                  {item}
                </span>
              ))}
            </div>
            <CardDescription className="max-w-lg text-base leading-relaxed text-muted-foreground/90">
              {workout.summary ??
                (isRest
                  ? "No planned training. Keep the space open."
                  : "A focused session with only the work that matters today.")}
            </CardDescription>
          </div>

          {workout.exercises.length > 0 ? (
            <div className="flex flex-wrap gap-2" aria-label="Workout overview">
              {workout.exercises.slice(0, 3).map((exercise) => (
                <Badge
                  key={exercise.id}
                  variant="secondary"
                  className="bg-background/30 font-normal backdrop-blur-sm"
                >
                  {exercise.name}
                </Badge>
              ))}
            </div>
          ) : null}
        </CardContent>

        <CardFooter className="relative z-10 justify-between border-border/55 bg-background/28 backdrop-blur-md">
          <p className="m-0 text-sm text-muted-foreground">
            {isComplete
              ? "Logged without extra pressure."
              : isRest
                ? "Rest is part of the plan."
                : "Details are optional — completion is enough."}
          </p>
          {!isRest && !isComplete ? (
            <Button size="lg" onClick={() => onStart(workout)}>
              <Icon data-icon="inline-start" />
              {workout.type === "strength" ? "Start workout" : "Start run"}
            </Button>
          ) : null}
        </CardFooter>
      </Card>
    </motion.div>
  );
}

function MealsForDay({
  meals,
  dayLabel,
  pendingMealId,
  onToggle,
  onOpenMeal,
  onReplaceMeal,
  onAddMeal,
}: {
  meals: PlannedFitnessMeal[];
  dayLabel: string;
  pendingMealId: string | null;
  onToggle: (meal: PlannedFitnessMeal) => void;
  onOpenMeal: (meal: PlannedFitnessMeal) => void;
  onReplaceMeal: (meal: PlannedFitnessMeal) => void;
  onAddMeal: () => void;
}) {
  return (
    <motion.div variants={fitnessRise} className="min-w-0">
      <Card className="h-full border border-border/70 bg-card/55 shadow-[0_28px_90px_-68px_rgb(0_0_0_/_0.95)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UtensilsIcon className="size-4 text-fitness-accent" />
            Meals for {dayLabel.toLowerCase()}
          </CardTitle>
          <CardDescription>
            A simple sequence. Open a meal only when you need the details.
          </CardDescription>
          <CardAction>
            <Button variant="ghost" size="sm" onClick={onAddMeal}>
              <PlusIcon data-icon="inline-start" /> Add
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          {meals.length === 0 ? (
            <Empty className="min-h-72">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <UtensilsIcon />
                </EmptyMedia>
                <EmptyTitle>No meals are planned for this day.</EmptyTitle>
                <EmptyDescription>
                  Add one from Meals or create a simple reusable meal.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button variant="outline" onClick={onAddMeal}>
                  Add from meals
                </Button>
              </EmptyContent>
            </Empty>
          ) : (
            <div className="flex flex-col">
              {meals.map((meal, index) => {
                const checked = meal.status === "eaten";
                const pending = pendingMealId === meal.id;
                return (
                  <div key={meal.id}>
                    {index > 0 ? <Separator /> : null}
                    <motion.div
                      layout
                      whileHover={{ x: 3 }}
                      whileTap={{ scale: 0.995 }}
                      className="group/meal-row -mx-2 flex items-center gap-4 rounded-lg px-2 py-4 transition-colors duration-200 hover:bg-muted/20 first:pt-1 last:pb-1 motion-reduce:transition-none"
                      transition={fitnessMicroSpring}
                    >
                      <div className="relative flex size-6 shrink-0 items-center justify-center">
                        {pending ? (
                          <Spinner className="size-4 text-fitness-accent" />
                        ) : (
                          <Checkbox
                            checked={checked}
                            onCheckedChange={() => onToggle(meal)}
                            aria-label={`${checked ? "Mark" : "Mark"} ${meal.title} ${checked ? "planned" : "eaten"}`}
                          />
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-auto min-w-0 flex-1 justify-start p-0 text-left hover:bg-transparent"
                        onClick={() => onOpenMeal(meal)}
                      >
                        <span className="flex min-w-0 flex-1 flex-col items-start gap-1">
                          <span className="text-xs font-medium tracking-[0.12em] text-fitness-accent uppercase">
                            {meal.slot}
                          </span>
                          <span className="truncate text-base font-normal text-foreground">
                            {meal.title}
                          </span>
                          <span className="text-sm font-normal text-muted-foreground">
                            {meal.calories === null
                              ? "Nutrition not entered"
                              : `${formatCompactNumber(meal.calories, 0)} kcal`}
                            {meal.protein === null
                              ? ""
                              : ` · ${formatCompactNumber(meal.protein, 0)} g protein`}
                          </span>
                        </span>
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="[&_svg]:transition-transform [&_svg]:duration-300 hover:[&_svg]:rotate-90 motion-reduce:[&_svg]:transition-none"
                        onClick={() => onReplaceMeal(meal)}
                        aria-label={`Replace ${meal.title}`}
                      >
                        <RefreshCcwIcon />
                      </Button>
                      <motion.div
                        initial={false}
                        animate={{
                          opacity: checked ? 1 : 0,
                          scale: checked ? 1 : 0.75,
                        }}
                        transition={fitnessMicroSpring}
                        className="flex size-7 shrink-0 items-center justify-center rounded-full bg-fitness-accent/12 text-fitness-accent"
                        aria-hidden
                      >
                        <CheckIcon className="size-3.5" />
                      </motion.div>
                    </motion.div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

function DailyTargets({
  dashboard,
  onNavigate,
}: {
  dashboard: FitnessDashboard;
  onNavigate: (section: FitnessSection) => void;
}) {
  const { targets } = dashboard.today;
  const calorieProgress =
    targets.calorieTarget > 0
      ? Math.min(100, (targets.loggedCalories / targets.calorieTarget) * 100)
      : 0;
  const proteinProgress =
    targets.proteinTarget > 0
      ? Math.min(100, (targets.loggedProtein / targets.proteinTarget) * 100)
      : 0;
  const weight = dashboard.progress.weight;
  const weightGoal = dashboard.goals.find((goal) => goal.type === "weight");

  return (
    <motion.div variants={fitnessRise} className="min-w-0">
      <Card className="h-full border border-border/70 bg-card/45 shadow-[0_28px_90px_-68px_rgb(0_0_0_/_0.95)]">
        <CardHeader>
          <CardTitle>Daily targets</CardTitle>
          <CardDescription>
            Useful context, kept in the background.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-7">
          <div className="flex flex-col gap-3">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="m-0 text-xs tracking-[0.12em] text-muted-foreground uppercase">
                  Calories logged
                </p>
                <p className="mt-1 mb-0 text-2xl font-normal tracking-[-0.02em]">
                  {formatCompactNumber(targets.loggedCalories, 0)}
                  <span className="ml-1 text-sm text-muted-foreground">
                    / {formatCompactNumber(targets.calorieTarget, 0)} kcal
                  </span>
                </p>
              </div>
              <span className="text-sm text-muted-foreground">
                {Math.round(calorieProgress)}%
              </span>
            </div>
            <Progress
              value={calorieProgress}
              className="fitness-progress-sheen relative h-1.5 bg-muted/70 [&_[data-slot=progress-indicator]]:bg-fitness-accent"
              aria-label={`${Math.round(calorieProgress)} percent of calorie target logged`}
            />
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="m-0 text-xs tracking-[0.12em] text-muted-foreground uppercase">
                  Protein logged
                </p>
                <p className="mt-1 mb-0 text-2xl font-normal tracking-[-0.02em]">
                  {formatCompactNumber(targets.loggedProtein, 0)}
                  <span className="ml-1 text-sm text-muted-foreground">
                    / {formatCompactNumber(targets.proteinTarget, 0)} g
                  </span>
                </p>
              </div>
              <span className="text-sm text-muted-foreground">
                {Math.round(proteinProgress)}%
              </span>
            </div>
            <Progress
              value={proteinProgress}
              className="relative h-1.5 bg-muted/70 [&_[data-slot=progress-indicator]]:bg-fitness-accent"
              aria-label={`${Math.round(proteinProgress)} percent of protein target logged`}
            />
          </div>

          {weight && weightGoal ? (
            <div className="rounded-xl bg-muted/28 p-4 ring-1 ring-foreground/[0.055]">
              <p className="m-0 text-xs tracking-[0.12em] text-muted-foreground uppercase">
                Current direction
              </p>
              <p className="mt-2 mb-0 text-base">
                On the way to {formatCompactNumber(weightGoal.targetValue)}{" "}
                {weightGoal.unit}
              </p>
              <p className="mt-1 mb-0 text-sm text-muted-foreground">
                {formatCompactNumber(weight.current)} {weight.unit} now · calm
                weekly trend
              </p>
            </div>
          ) : null}
        </CardContent>
        <CardFooter className="justify-end">
          <Button variant="ghost" onClick={() => onNavigate("week")}>
            Weekly plan
            <ArrowRightIcon
              data-icon="inline-end"
              className="transition-transform duration-200 group-hover/button:translate-x-0.5 motion-reduce:transition-none"
            />
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
}

export function FitnessToday({
  dashboard,
  dayLabel,
  pendingMealId,
  onStartWorkout,
  onAddWorkout,
  onAddMeal,
  onOpenMeal,
  onReplaceMeal,
  onToggleMeal,
  onNavigate,
}: {
  dashboard: FitnessDashboard;
  dayLabel: string;
  pendingMealId: string | null;
  onStartWorkout: (workout: FitnessWorkout) => void;
  onAddWorkout: () => void;
  onAddMeal: () => void;
  onOpenMeal: (meal: PlannedFitnessMeal) => void;
  onReplaceMeal: (meal: PlannedFitnessMeal) => void;
  onToggleMeal: (meal: PlannedFitnessMeal) => void;
  onNavigate: (section: FitnessSection) => void;
}) {
  return (
    <motion.div
      className="flex flex-col gap-5"
      initial="hidden"
      animate="visible"
    >
      <WorkoutHero
        workout={dashboard.today.workout}
        dayLabel={dayLabel}
        onStart={onStartWorkout}
        onAddWorkout={onAddWorkout}
      />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(18rem,0.75fr)]">
        <MealsForDay
          meals={dashboard.today.meals}
          dayLabel={dayLabel}
          pendingMealId={pendingMealId}
          onToggle={onToggleMeal}
          onOpenMeal={onOpenMeal}
          onReplaceMeal={onReplaceMeal}
          onAddMeal={onAddMeal}
        />
        <DailyTargets dashboard={dashboard} onNavigate={onNavigate} />
      </div>
    </motion.div>
  );
}
