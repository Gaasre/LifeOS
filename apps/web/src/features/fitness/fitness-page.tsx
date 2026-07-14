import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  CalendarDaysIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CommandIcon,
  DumbbellIcon,
} from "lucide-react";
import { AnimatePresence, motion, MotionConfig } from "motion/react";
import { toast } from "sonner";

import type {
  FitnessMeal,
  FitnessSection,
  FitnessWorkout,
  PlannedFitnessMeal,
} from "@lifeos/rpc";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@lifeos/ui/components/alert";
import { Badge } from "@lifeos/ui/components/badge";
import { Button } from "@lifeos/ui/components/button";
import { Kbd } from "@lifeos/ui/components/kbd";
import { Skeleton } from "@lifeos/ui/components/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@lifeos/ui/components/tabs";

import { AppHeader } from "@/components/app-header";
import { FitnessActions } from "@/features/fitness/components/fitness-actions";
import { FitnessEditorDialogs } from "@/features/fitness/components/fitness-editor-dialogs";
import { MealDetailDialog } from "@/features/fitness/components/meal-detail-dialog";
import { MealReplacementDialog } from "@/features/fitness/components/meal-replacement-dialog";
import {
  FitnessGoals,
  FitnessMeals,
  FitnessNutrition,
  FitnessProgress,
  FitnessTraining,
  FitnessWeek,
} from "@/features/fitness/components/fitness-sections";
import { FitnessToday } from "@/features/fitness/components/fitness-today";
import { WorkoutFlowDialog } from "@/features/fitness/components/workout-flow-dialog";
import {
  addCalendarDays,
  formatCalendarDate,
  getDefaultMealSlot,
  getLocalDateKey,
} from "@/features/fitness/fitness-format";
import {
  fitnessPageVariants,
  fitnessSectionVariants,
  fitnessSpring,
  fitnessViewVariants,
} from "@/features/fitness/fitness-motion";
import "@/features/fitness/fitness-motion.css";
import type { FitnessEditorTarget } from "@/features/fitness/fitness-types";
import {
  fitnessQueryKey,
  useFitness,
} from "@/features/fitness/hooks/use-fitness";
import { usePerspective } from "@/features/perspectives/perspective-context";
import { rpcClient } from "@/lib/rpc-client";

const sectionOptions: Array<{ value: FitnessSection; label: string }> = [
  { value: "today", label: "Today" },
  { value: "week", label: "Weekly plan" },
  { value: "training", label: "Training" },
  { value: "nutrition", label: "Nutrition" },
  { value: "meals", label: "Meals" },
  { value: "goals", label: "Goals" },
  { value: "progress", label: "Progress" },
];

function FitnessLoading() {
  return (
    <div
      className="flex flex-col gap-5"
      aria-label="Loading Fitness and Nutrition"
      aria-busy
    >
      <Skeleton className="min-h-96 rounded-xl" />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(18rem,0.75fr)]">
        <Skeleton className="min-h-96 rounded-xl" />
        <Skeleton className="min-h-96 rounded-xl" />
      </div>
    </div>
  );
}

function actionError(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function FitnessPage() {
  const queryClient = useQueryClient();
  const { perspective } = usePerspective();
  const personId =
    perspective.kind === "person" ? perspective.personId : undefined;
  const currentDate = useMemo(() => getLocalDateKey(), []);
  const [selectedDate, setSelectedDate] = useState(currentDate);
  const [section, setSection] = useState<FitnessSection>("today");
  const [commandOpen, setCommandOpen] = useState(false);
  const [editor, setEditor] = useState<FitnessEditorTarget | null>(null);
  const [activeWorkout, setActiveWorkout] = useState<FitnessWorkout | null>(
    null,
  );
  const [activeMeal, setActiveMeal] = useState<FitnessMeal | null>(null);
  const [replacementMeal, setReplacementMeal] =
    useState<PlannedFitnessMeal | null>(null);
  const [isReplacingMeal, setIsReplacingMeal] = useState(false);
  const [pendingMealId, setPendingMealId] = useState<string | null>(null);
  const fitnessQuery = useFitness(personId, selectedDate);
  const dashboard = fitnessQuery.data;

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen((open) => !open);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: fitnessQueryKey });
  }

  function navigate(next: FitnessSection) {
    setSection(next);
    window.requestAnimationFrame(() => {
      document.getElementById("fitness-content")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }

  async function toggleMeal(meal: PlannedFitnessMeal) {
    setPendingMealId(meal.id);
    try {
      await rpcClient.fitness.setMealStatus({
        plannedMealId: meal.id,
        status: meal.status === "eaten" ? "planned" : "eaten",
      });
      await refresh();
    } catch (error) {
      toast.error(actionError(error, "The meal status could not be updated."));
    } finally {
      setPendingMealId(null);
    }
  }

  function openPlannedMeal(meal: PlannedFitnessMeal) {
    const libraryMeal = dashboard?.meals.find(
      (candidate) => candidate.id === meal.mealId,
    );
    if (!libraryMeal) {
      toast.info("This is a simple day entry without a saved recipe.");
      return;
    }
    setActiveMeal(libraryMeal);
  }

  async function addMealToDay(meal: FitnessMeal) {
    if (!dashboard) return;
    try {
      await rpcClient.fitness.addMealToDay({
        personId: dashboard.person.id,
        mealId: meal.id,
        date: selectedDate,
        slot: getDefaultMealSlot(meal.title, meal.tags),
      });
      toast.success(
        `${meal.title} added to ${formatCalendarDate(selectedDate, { short: true })}.`,
      );
      setActiveMeal(null);
      await refresh();
    } catch (error) {
      toast.error(actionError(error, "The meal could not be added."));
    }
  }

  async function replaceMeal(meal: FitnessMeal) {
    if (!replacementMeal) return;
    setIsReplacingMeal(true);
    try {
      await rpcClient.fitness.replacePlannedMeal({
        plannedMealId: replacementMeal.id,
        mealId: meal.id,
      });
      toast.success(`${replacementMeal.title} replaced with ${meal.title}.`);
      setReplacementMeal(null);
      await refresh();
    } catch (error) {
      toast.error(
        actionError(error, "The planned meal could not be replaced."),
      );
    } finally {
      setIsReplacingMeal(false);
    }
  }

  async function moveWorkout(workoutId: string, date: string) {
    try {
      await rpcClient.fitness.moveWorkout({ workoutId, date });
      toast.success(
        `Workout moved to ${formatCalendarDate(date, { short: true })}.`,
      );
      await refresh();
    } catch (error) {
      toast.error(actionError(error, "The workout could not be moved."));
    }
  }

  async function copyMeals(sourceDate: string, targetDate: string) {
    if (!dashboard) return;
    try {
      await rpcClient.fitness.copyDayMeals({
        personId: dashboard.person.id,
        sourceDate,
        targetDate,
      });
      toast.success(
        `Meals copied to ${formatCalendarDate(targetDate, { short: true })}.`,
      );
      await refresh();
    } catch (error) {
      toast.error(actionError(error, "The meals could not be copied."));
    }
  }

  async function skipWorkout(workoutId: string) {
    try {
      await rpcClient.fitness.setWorkoutStatus({
        workoutId,
        status: "skipped",
      });
      toast.success("Workout left out of the plan.");
      await refresh();
    } catch (error) {
      toast.error(actionError(error, "The workout could not be updated."));
    }
  }

  async function completeDay(date: string) {
    if (!dashboard) return;
    try {
      const day = await rpcClient.fitness.bootstrap({
        personId: dashboard.person.id,
        date,
      });
      await Promise.all(
        day.today.meals
          .filter((meal) => meal.status !== "eaten")
          .map((meal) =>
            rpcClient.fitness.setMealStatus({
              plannedMealId: meal.id,
              status: "eaten",
            }),
          ),
      );
      if (day.today.workout?.status === "planned") {
        await rpcClient.fitness.completeWorkout({
          workoutId: day.today.workout.id,
          perceivedEffort: null,
          actualDistanceKm: null,
          durationMinutes: null,
          notes: null,
          exerciseLogs: [],
        });
      }
      toast.success(
        `${formatCalendarDate(date, { short: true })} marked complete.`,
      );
      await refresh();
    } catch (error) {
      toast.error(actionError(error, "The day could not be completed."));
    }
  }

  function openDay(date: string) {
    setSelectedDate(date);
    navigate("today");
  }

  function renderSection() {
    if (!dashboard) return null;
    if (section === "today") {
      return (
        <FitnessToday
          dashboard={dashboard}
          dayLabel={
            selectedDate === currentDate
              ? "Today"
              : formatCalendarDate(selectedDate)
          }
          pendingMealId={pendingMealId}
          onStartWorkout={setActiveWorkout}
          onAddWorkout={() =>
            setEditor({ kind: "workout", date: selectedDate })
          }
          onAddMeal={() => navigate("meals")}
          onOpenMeal={openPlannedMeal}
          onReplaceMeal={setReplacementMeal}
          onToggleMeal={(meal) => void toggleMeal(meal)}
          onNavigate={navigate}
        />
      );
    }
    if (section === "week") {
      return (
        <FitnessWeek
          dashboard={dashboard}
          onOpenDay={openDay}
          onAddWorkout={(date) =>
            setEditor({ kind: "workout", date: date ?? selectedDate })
          }
          onMoveWorkout={(workoutId, date) => void moveWorkout(workoutId, date)}
          onCopyMeals={(sourceDate, targetDate) =>
            void copyMeals(sourceDate, targetDate)
          }
          onReplaceWorkout={(date, replaceWorkoutId) =>
            setEditor({ kind: "workout", date, replaceWorkoutId })
          }
          onSkipWorkout={(workoutId) => void skipWorkout(workoutId)}
          onCompleteDay={(date) => void completeDay(date)}
        />
      );
    }
    if (section === "training") {
      return (
        <FitnessTraining
          dashboard={dashboard}
          onCreatePlan={() => setEditor({ kind: "training-plan" })}
          onAddWorkout={() =>
            setEditor({ kind: "workout", date: selectedDate })
          }
          onStartWorkout={setActiveWorkout}
        />
      );
    }
    if (section === "nutrition") {
      return (
        <FitnessNutrition
          dashboard={dashboard}
          onCreatePlan={() => setEditor({ kind: "nutrition-plan" })}
        />
      );
    }
    if (section === "meals") {
      return (
        <FitnessMeals
          dashboard={dashboard}
          onCreateMeal={() => setEditor({ kind: "meal" })}
          onOpenMeal={setActiveMeal}
          onAddMeal={(meal) => void addMealToDay(meal)}
        />
      );
    }
    if (section === "goals") {
      return (
        <FitnessGoals
          dashboard={dashboard}
          onCreateGoal={() => setEditor({ kind: "goal" })}
          onLogWeight={() => setEditor({ kind: "weight" })}
        />
      );
    }
    return <FitnessProgress dashboard={dashboard} />;
  }

  return (
    <MotionConfig reducedMotion="user">
      <motion.main
        className="fitness-module dark min-h-screen overflow-x-hidden bg-background text-foreground"
        initial="hidden"
        animate="visible"
        variants={fitnessPageVariants}
      >
        <div className="mx-auto w-full max-w-[92rem] px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
          <AppHeader section="Fitness & Nutrition" />

          <motion.section
            className="mt-12 mb-8 flex flex-col gap-6 lg:mt-18 lg:flex-row lg:items-end lg:justify-between lg:pl-32"
            aria-labelledby="fitness-title"
            variants={fitnessSectionVariants}
          >
            <div>
              <p className="mb-3 flex items-center gap-2 text-xs font-medium tracking-[0.14em] text-fitness-accent uppercase">
                <DumbbellIcon className="size-4" /> Execute the plan
              </p>
              <h1
                id="fitness-title"
                className="m-0 text-[clamp(2.25rem,8vw,3.5rem)] leading-[1.01] font-normal tracking-[-0.035em]"
              >
                Fitness & Nutrition
              </h1>
              <p className="mt-3 mb-0 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                Eat well. Train with purpose. See the direction without the
                noise.
              </p>
              {dashboard ? (
                <Badge variant="outline" className="mt-4 bg-card/35">
                  <CalendarDaysIcon /> {dashboard.weekLabel}
                </Badge>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex h-9 items-center rounded-lg border border-border bg-card/45 p-0.5">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Previous day"
                  onClick={() =>
                    setSelectedDate((date) => addCalendarDays(date, -1))
                  }
                >
                  <ChevronLeftIcon className="transition-transform duration-200 group-hover/button:-translate-x-0.5 motion-reduce:transition-none" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="relative min-w-24 overflow-hidden px-2 font-normal"
                  onClick={() => setSelectedDate(currentDate)}
                  title="Return to today"
                >
                  <AnimatePresence mode="popLayout" initial={false}>
                    <motion.span
                      key={selectedDate}
                      className="inline-flex"
                      initial={{ opacity: 0, y: 3 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -3 }}
                      transition={{ duration: 0.16 }}
                    >
                      {selectedDate === currentDate
                        ? "Today"
                        : formatCalendarDate(selectedDate, { short: true })}
                    </motion.span>
                  </AnimatePresence>
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Next day"
                  onClick={() =>
                    setSelectedDate((date) => addCalendarDays(date, 1))
                  }
                >
                  <ChevronRightIcon className="transition-transform duration-200 group-hover/button:translate-x-0.5 motion-reduce:transition-none" />
                </Button>
              </div>
            </div>
          </motion.section>

          <Tabs
            value={section}
            onValueChange={(value) => navigate(value as FitnessSection)}
          >
            <motion.div
              className="mb-6 overflow-x-auto border-b border-border/70 pb-1 lg:ml-32"
              variants={fitnessSectionVariants}
            >
              <TabsList variant="line" className="h-10 min-w-max gap-5">
                {sectionOptions.map(({ value, label }) => (
                  <TabsTrigger
                    key={value}
                    value={value}
                    className="px-0 pb-3 font-normal after:hidden"
                  >
                    {label}
                    {section === value ? (
                      <motion.span
                        layoutId="fitness-active-section"
                        className="absolute inset-x-0 -bottom-[5px] h-0.5 rounded-full bg-foreground"
                        transition={fitnessSpring}
                        aria-hidden
                      />
                    ) : null}
                  </TabsTrigger>
                ))}
              </TabsList>
            </motion.div>
          </Tabs>

          <div id="fitness-content" className="scroll-mt-6 pb-16 lg:pl-32">
            {!personId ? (
              <Alert>
                <AlertTitle>Choose a person</AlertTitle>
                <AlertDescription>
                  Fitness and nutrition plans belong to a person. Choose one
                  from the perspective selector in the top navigation.
                </AlertDescription>
              </Alert>
            ) : null}
            {personId && fitnessQuery.isPending ? <FitnessLoading /> : null}
            {fitnessQuery.isError && !dashboard ? (
              <Alert variant="destructive">
                <AlertTitle>
                  Fitness and Nutrition could not be loaded
                </AlertTitle>
                <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
                  <span>
                    {fitnessQuery.error instanceof Error
                      ? fitnessQuery.error.message
                      : "Try again in a moment."}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void fitnessQuery.refetch()}
                  >
                    Try again
                  </Button>
                </AlertDescription>
              </Alert>
            ) : null}
            <AnimatePresence mode="wait" initial={false}>
              {dashboard ? (
                <motion.div
                  key={`${section}-${dashboard.person.id}-${selectedDate}`}
                  variants={fitnessViewVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  {renderSection()}
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </div>

        <motion.div
          className="fixed right-4 bottom-4 sm:right-6 sm:bottom-6"
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.97 }}
          transition={fitnessSpring}
        >
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="rounded-full shadow-lg"
            onClick={() => setCommandOpen(true)}
          >
            <CommandIcon data-icon="inline-start" />
            Actions
            <Kbd className="ml-1 hidden sm:inline-flex">⌘ K</Kbd>
          </Button>
        </motion.div>

        <FitnessActions
          open={commandOpen}
          onOpenChange={setCommandOpen}
          canCreate={Boolean(dashboard)}
          onEdit={setEditor}
          onNavigate={navigate}
        />

        {dashboard ? (
          <>
            <FitnessEditorDialogs
              target={editor}
              dashboard={dashboard}
              selectedDate={selectedDate}
              onClose={() => setEditor(null)}
              onSaved={refresh}
            />
            <WorkoutFlowDialog
              workout={activeWorkout}
              onOpenChange={(open) => !open && setActiveWorkout(null)}
              onCompleted={refresh}
            />
            <MealDetailDialog
              meal={activeMeal}
              onOpenChange={(open) => !open && setActiveMeal(null)}
              onAddToDay={(meal) => void addMealToDay(meal)}
            />
            <MealReplacementDialog
              plannedMeal={replacementMeal}
              meals={dashboard.meals}
              isSaving={isReplacingMeal}
              onOpenChange={(open) => !open && setReplacementMeal(null)}
              onChoose={(meal) => void replaceMeal(meal)}
            />
          </>
        ) : null}

        <span className="sr-only" aria-live="polite">
          {dashboard
            ? `Showing fitness and nutrition for ${dashboard.person.preferredName}`
            : "Choose a person to view fitness and nutrition"}
        </span>
      </motion.main>
    </MotionConfig>
  );
}
