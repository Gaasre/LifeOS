import { useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";

import type { FitnessDashboard, FitnessWorkoutType } from "@lifeos/rpc";
import { Button } from "@lifeos/ui/components/button";
import { Checkbox } from "@lifeos/ui/components/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@lifeos/ui/components/dialog";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@lifeos/ui/components/field";
import { Input } from "@lifeos/ui/components/input";
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

import { formatWorkoutType } from "@/features/fitness/fitness-format";
import type { FitnessEditorTarget } from "@/features/fitness/fitness-types";
import { rpcClient } from "@/lib/rpc-client";

const noPlanValue = "none";

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }
  return fallback;
}

function optionalNumber(value: string) {
  const clean = value.trim();
  if (!clean) return null;
  const parsed = Number(clean);
  return Number.isFinite(parsed) ? parsed : null;
}

function optionalText(value: string) {
  const clean = value.trim();
  return clean || null;
}

function EditorDialog({
  title,
  description,
  onClose,
  children,
}: {
  title: string;
  description: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="grid max-h-[min(92dvh,52rem)] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0 sm:max-w-xl">
        <DialogHeader className="border-b px-6 py-5 pr-12">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}

function FormFooter({
  onCancel,
  isSaving,
  label,
}: {
  onCancel: () => void;
  isSaving: boolean;
  label: string;
}) {
  return (
    <DialogFooter className="mx-0 mb-0 rounded-none rounded-b-xl px-6 py-4">
      <Button type="button" variant="outline" onClick={onCancel}>
        Cancel
      </Button>
      <Button type="submit" disabled={isSaving}>
        {isSaving ? <Spinner data-icon="inline-start" /> : null}
        {isSaving ? "Saving…" : label}
      </Button>
    </DialogFooter>
  );
}

function WorkoutEditor({
  dashboard,
  date,
  replaceWorkoutId,
  onClose,
  onSaved,
}: {
  dashboard: FitnessDashboard;
  date: string;
  replaceWorkoutId?: string | null;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<FitnessWorkoutType>("strength");
  const [trainingPlanId, setTrainingPlanId] = useState(
    dashboard.training.plans[0]?.id ?? noPlanValue,
  );
  const [plannedDate, setPlannedDate] = useState(date);
  const [duration, setDuration] = useState("");
  const [distance, setDistance] = useState("");
  const [summary, setSummary] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const isRun = type !== "strength" && type !== "rest";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim()) return;
    setError(null);
    setIsSaving(true);
    try {
      await rpcClient.fitness.createWorkout({
        personId: dashboard.person.id,
        trainingPlanId: trainingPlanId === noPlanValue ? null : trainingPlanId,
        title: title.trim(),
        type,
        date: plannedDate,
        estimatedDurationMinutes:
          type === "rest" ? null : optionalNumber(duration),
        summary: optionalText(summary),
        plannedDistanceKm: isRun ? optionalNumber(distance) : null,
      });
      if (replaceWorkoutId) {
        await rpcClient.fitness.setWorkoutStatus({
          workoutId: replaceWorkoutId,
          status: "skipped",
        });
      }
      toast.success(
        replaceWorkoutId ? "Workout replaced." : "Workout planned.",
      );
      await onSaved();
      onClose();
    } catch (caught) {
      setError(errorMessage(caught, "The workout could not be planned."));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <EditorDialog
      title={replaceWorkoutId ? "Replace workout" : "Plan a workout"}
      description="Keep the plan light. Details can remain optional until the session starts."
      onClose={onClose}
    >
      <form className="contents" onSubmit={submit}>
        <FieldGroup className="min-h-0 overflow-y-auto px-6 py-5">
          <Field>
            <FieldLabel htmlFor="fitness-workout-title">
              Workout name
            </FieldLabel>
            <Input
              id="fitness-workout-title"
              value={title}
              maxLength={160}
              autoFocus
              placeholder="Upper body"
              onChange={(event) => setTitle(event.target.value)}
              required
            />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field>
              <FieldLabel>Training type</FieldLabel>
              <Select
                value={type}
                onValueChange={(value) => setType(value as FitnessWorkoutType)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {(
                      [
                        "strength",
                        "easy_run",
                        "long_run",
                        "intervals",
                        "tempo_run",
                        "recovery_run",
                        "rest",
                      ] as FitnessWorkoutType[]
                    ).map((value) => (
                      <SelectItem key={value} value={value}>
                        {formatWorkoutType(value)}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="fitness-workout-date">Date</FieldLabel>
              <Input
                id="fitness-workout-date"
                type="date"
                value={plannedDate}
                onChange={(event) => setPlannedDate(event.target.value)}
                required
              />
            </Field>
          </div>
          <Field>
            <FieldLabel>Training plan</FieldLabel>
            <Select value={trainingPlanId} onValueChange={setTrainingPlanId}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value={noPlanValue}>No plan</SelectItem>
                  {dashboard.training.plans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.title}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          {type !== "rest" ? (
            <div className="grid gap-5 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="fitness-workout-duration">
                  Estimated minutes
                </FieldLabel>
                <Input
                  id="fitness-workout-duration"
                  type="number"
                  min="1"
                  inputMode="numeric"
                  value={duration}
                  onChange={(event) => setDuration(event.target.value)}
                />
              </Field>
              {isRun ? (
                <Field>
                  <FieldLabel htmlFor="fitness-workout-distance">
                    Planned distance (km)
                  </FieldLabel>
                  <Input
                    id="fitness-workout-distance"
                    type="number"
                    min="0.1"
                    step="0.1"
                    inputMode="decimal"
                    value={distance}
                    onChange={(event) => setDistance(event.target.value)}
                  />
                </Field>
              ) : null}
            </div>
          ) : null}
          <Field>
            <FieldLabel htmlFor="fitness-workout-summary">
              Short summary
            </FieldLabel>
            <Textarea
              id="fitness-workout-summary"
              value={summary}
              maxLength={500}
              placeholder="Three exercises · Moderate session"
              onChange={(event) => setSummary(event.target.value)}
            />
            <FieldDescription>
              One useful line for the Today screen is enough.
            </FieldDescription>
          </Field>
          <FieldError>{error}</FieldError>
        </FieldGroup>
        <FormFooter
          onCancel={onClose}
          isSaving={isSaving}
          label={replaceWorkoutId ? "Replace workout" : "Plan workout"}
        />
      </form>
    </EditorDialog>
  );
}

function TrainingPlanEditor({
  dashboard,
  date,
  onClose,
  onSaved,
}: {
  dashboard: FitnessDashboard;
  date: string;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<"strength" | "running" | "mixed">(
    "strength",
  );
  const [frequency, setFrequency] = useState("");
  const [goal, setGoal] = useState("");
  const [startDate, setStartDate] = useState(date);
  const [endDate, setEndDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSaving(true);
    try {
      await rpcClient.fitness.createTrainingPlan({
        personId: dashboard.person.id,
        title: title.trim(),
        type,
        weeklyFrequency: Number(frequency),
        goal: optionalText(goal),
        startDate,
        endDate: optionalText(endDate),
      });
      toast.success("Training plan created.");
      await onSaved();
      onClose();
    } catch (caught) {
      setError(errorMessage(caught, "The training plan could not be created."));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <EditorDialog
      title="Create a training plan"
      description={`This plan will belong to ${dashboard.person.preferredName}. Add individual workout days after saving.`}
      onClose={onClose}
    >
      <form className="contents" onSubmit={submit}>
        <FieldGroup className="min-h-0 overflow-y-auto px-6 py-5">
          <Field>
            <FieldLabel htmlFor="fitness-plan-title">Plan name</FieldLabel>
            <Input
              id="fitness-plan-title"
              value={title}
              maxLength={160}
              autoFocus
              placeholder="Three-day training plan"
              onChange={(event) => setTitle(event.target.value)}
              required
            />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field>
              <FieldLabel>Plan type</FieldLabel>
              <Select
                value={type}
                onValueChange={(value) =>
                  setType(value as "strength" | "running" | "mixed")
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="strength">Strength</SelectItem>
                    <SelectItem value="running">Running</SelectItem>
                    <SelectItem value="mixed">Mixed</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="fitness-plan-frequency">
                Sessions per week
              </FieldLabel>
              <Input
                id="fitness-plan-frequency"
                type="number"
                min="1"
                max="14"
                value={frequency}
                onChange={(event) => setFrequency(event.target.value)}
                required
              />
            </Field>
          </div>
          <Field>
            <FieldLabel htmlFor="fitness-plan-goal">Goal</FieldLabel>
            <Textarea
              id="fitness-plan-goal"
              value={goal}
              maxLength={500}
              placeholder="Build strength consistently without crowding out running."
              onChange={(event) => setGoal(event.target.value)}
            />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="fitness-plan-start">Start date</FieldLabel>
              <Input
                id="fitness-plan-start"
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="fitness-plan-end">End date</FieldLabel>
              <Input
                id="fitness-plan-end"
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
              />
            </Field>
          </div>
          <FieldError>{error}</FieldError>
        </FieldGroup>
        <FormFooter
          onCancel={onClose}
          isSaving={isSaving}
          label="Create plan"
        />
      </form>
    </EditorDialog>
  );
}

function NutritionPlanEditor({
  dashboard,
  date,
  onClose,
  onSaved,
}: {
  dashboard: FitnessDashboard;
  date: string;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const current = dashboard.nutrition.activePlan;
  const [title, setTitle] = useState(current?.title ?? "");
  const [calories, setCalories] = useState(
    current ? String(current.calorieTarget) : "",
  );
  const [protein, setProtein] = useState(
    current ? String(current.proteinTarget) : "",
  );
  const [meals, setMeals] = useState(
    current ? String(current.mealsPerDay) : "",
  );
  const [goal, setGoal] = useState(current?.goal ?? "");
  const [startDate, setStartDate] = useState(date);
  const [endDate, setEndDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSaving(true);
    try {
      await rpcClient.fitness.createNutritionPlan({
        personId: dashboard.person.id,
        title: title.trim(),
        calorieTarget: Number(calories),
        proteinTarget: Number(protein),
        mealsPerDay: Number(meals),
        goal: optionalText(goal),
        startDate,
        endDate: optionalText(endDate),
      });
      toast.success("Nutrition plan saved.");
      await onSaved();
      onClose();
    } catch (caught) {
      setError(errorMessage(caught, "The nutrition plan could not be saved."));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <EditorDialog
      title={current ? "Adjust nutrition plan" : "Create nutrition plan"}
      description="Set only the targets that help you decide what to eat today."
      onClose={onClose}
    >
      <form className="contents" onSubmit={submit}>
        <FieldGroup className="min-h-0 overflow-y-auto px-6 py-5">
          <Field>
            <FieldLabel htmlFor="fitness-nutrition-title">Plan name</FieldLabel>
            <Input
              id="fitness-nutrition-title"
              value={title}
              maxLength={160}
              autoFocus
              placeholder="Daily nutrition plan"
              onChange={(event) => setTitle(event.target.value)}
              required
            />
          </Field>
          <div className="grid gap-5 sm:grid-cols-3">
            <Field>
              <FieldLabel htmlFor="fitness-calorie-target">Calories</FieldLabel>
              <Input
                id="fitness-calorie-target"
                type="number"
                min="500"
                max="10000"
                value={calories}
                onChange={(event) => setCalories(event.target.value)}
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="fitness-protein-target">
                Protein (g)
              </FieldLabel>
              <Input
                id="fitness-protein-target"
                type="number"
                min="0"
                max="1000"
                value={protein}
                onChange={(event) => setProtein(event.target.value)}
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="fitness-meals-target">
                Meals / day
              </FieldLabel>
              <Input
                id="fitness-meals-target"
                type="number"
                min="1"
                max="12"
                value={meals}
                onChange={(event) => setMeals(event.target.value)}
                required
              />
            </Field>
          </div>
          <Field>
            <FieldLabel htmlFor="fitness-nutrition-goal">Goal</FieldLabel>
            <Textarea
              id="fitness-nutrition-goal"
              value={goal}
              maxLength={500}
              placeholder="Support steady weight gain and training."
              onChange={(event) => setGoal(event.target.value)}
            />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="fitness-nutrition-start">
                Start date
              </FieldLabel>
              <Input
                id="fitness-nutrition-start"
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="fitness-nutrition-end">End date</FieldLabel>
              <Input
                id="fitness-nutrition-end"
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
              />
            </Field>
          </div>
          <FieldError>{error}</FieldError>
        </FieldGroup>
        <FormFooter onCancel={onClose} isSaving={isSaving} label="Save plan" />
      </form>
    </EditorDialog>
  );
}

function MealEditor({
  dashboard,
  onClose,
  onSaved,
}: {
  dashboard: FitnessDashboard;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [preparationMinutes, setPreparationMinutes] = useState("");
  const [servings, setServings] = useState("1");
  const [tags, setTags] = useState("");
  const [ingredients, setIngredients] = useState("");
  const [steps, setSteps] = useState("");
  const [dietaryNotes, setDietaryNotes] = useState("");
  const [favourite, setFavourite] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSaving(true);
    try {
      await rpcClient.fitness.createMeal({
        personId: dashboard.person.id,
        title: title.trim(),
        description: optionalText(description),
        caloriesPerServing: optionalNumber(calories),
        proteinPerServing: optionalNumber(protein),
        preparationMinutes: optionalNumber(preparationMinutes),
        servings: Number(servings),
        favourite,
        tags: tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        dietaryNotes: optionalText(dietaryNotes),
        ingredients: ingredients
          .split("\n")
          .map((name) => name.trim())
          .filter(Boolean)
          .map((name) => ({
            name,
            quantity: null,
            unit: null,
            optional: false,
          })),
        steps: steps
          .split("\n")
          .map((step) => step.trim())
          .filter(Boolean),
      });
      toast.success("Meal added to the library.");
      await onSaved();
      onClose();
    } catch (caught) {
      setError(errorMessage(caught, "The meal could not be created."));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <EditorDialog
      title="Create a reusable meal"
      description={`Save a meal ${dashboard.person.preferredName} can realistically repeat.`}
      onClose={onClose}
    >
      <form className="contents" onSubmit={submit}>
        <FieldGroup className="min-h-0 overflow-y-auto px-6 py-5">
          <Field>
            <FieldLabel htmlFor="fitness-meal-title">Meal name</FieldLabel>
            <Input
              id="fitness-meal-title"
              value={title}
              maxLength={160}
              autoFocus
              placeholder="Chicken rice bowl"
              onChange={(event) => setTitle(event.target.value)}
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="fitness-meal-description">
              Description
            </FieldLabel>
            <Textarea
              id="fitness-meal-description"
              value={description}
              maxLength={800}
              onChange={(event) => setDescription(event.target.value)}
            />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <Field>
              <FieldLabel htmlFor="fitness-meal-calories">Calories</FieldLabel>
              <Input
                id="fitness-meal-calories"
                type="number"
                min="0"
                value={calories}
                onChange={(event) => setCalories(event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="fitness-meal-protein">
                Protein (g)
              </FieldLabel>
              <Input
                id="fitness-meal-protein"
                type="number"
                min="0"
                value={protein}
                onChange={(event) => setProtein(event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="fitness-meal-time">Minutes</FieldLabel>
              <Input
                id="fitness-meal-time"
                type="number"
                min="0"
                value={preparationMinutes}
                onChange={(event) => setPreparationMinutes(event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="fitness-meal-servings">Servings</FieldLabel>
              <Input
                id="fitness-meal-servings"
                type="number"
                min="1"
                max="50"
                value={servings}
                onChange={(event) => setServings(event.target.value)}
                required
              />
            </Field>
          </div>
          <Field>
            <FieldLabel htmlFor="fitness-meal-tags">Tags</FieldLabel>
            <Input
              id="fitness-meal-tags"
              value={tags}
              placeholder="work lunch, post-workout, for two"
              onChange={(event) => setTags(event.target.value)}
            />
            <FieldDescription>
              Separate a few useful groups with commas.
            </FieldDescription>
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="fitness-meal-ingredients">
                Ingredients
              </FieldLabel>
              <Textarea
                id="fitness-meal-ingredients"
                value={ingredients}
                placeholder={"200 g chicken\n1 cup rice\nMixed vegetables"}
                onChange={(event) => setIngredients(event.target.value)}
              />
              <FieldDescription>One ingredient per line.</FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="fitness-meal-steps">Steps</FieldLabel>
              <Textarea
                id="fitness-meal-steps"
                value={steps}
                placeholder={
                  "Cook the rice.\nSeason and cook the chicken.\nAssemble the bowl."
                }
                onChange={(event) => setSteps(event.target.value)}
              />
              <FieldDescription>One short step per line.</FieldDescription>
            </Field>
          </div>
          <Field>
            <FieldLabel htmlFor="fitness-meal-dietary">
              Dietary notes
            </FieldLabel>
            <Textarea
              id="fitness-meal-dietary"
              value={dietaryNotes}
              maxLength={500}
              placeholder="Use lactose-free milk. Cheese is tolerated."
              onChange={(event) => setDietaryNotes(event.target.value)}
            />
          </Field>
          <Field orientation="horizontal">
            <Checkbox
              id="fitness-meal-favourite"
              checked={favourite}
              onCheckedChange={(checked) => setFavourite(checked === true)}
            />
            <FieldLabel htmlFor="fitness-meal-favourite">Favourite</FieldLabel>
          </Field>
          <FieldError>{error}</FieldError>
        </FieldGroup>
        <FormFooter
          onCancel={onClose}
          isSaving={isSaving}
          label="Create meal"
        />
      </form>
    </EditorDialog>
  );
}

function WeightEditor({
  dashboard,
  date,
  onClose,
  onSaved,
}: {
  dashboard: FitnessDashboard;
  date: string;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const current = dashboard.progress.weight;
  const [weight, setWeight] = useState(current ? String(current.current) : "");
  const [entryDate, setEntryDate] = useState(date);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSaving(true);
    try {
      await rpcClient.fitness.logWeight({
        personId: dashboard.person.id,
        weight: Number(weight),
        date: entryDate,
        notes: optionalText(notes),
      });
      toast.success("Weight logged.");
      await onSaved();
      onClose();
    } catch (caught) {
      setError(errorMessage(caught, "The weight entry could not be saved."));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <EditorDialog
      title="Log weight"
      description="A weekly measurement is enough. Daily fluctuations do not need a reaction."
      onClose={onClose}
    >
      <form className="contents" onSubmit={submit}>
        <FieldGroup className="min-h-0 overflow-y-auto px-6 py-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="fitness-weight-value">
                Weight ({current?.unit ?? "kg"})
              </FieldLabel>
              <Input
                id="fitness-weight-value"
                type="number"
                min="1"
                max="1000"
                step="0.1"
                inputMode="decimal"
                value={weight}
                autoFocus
                onChange={(event) => setWeight(event.target.value)}
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="fitness-weight-date">Date</FieldLabel>
              <Input
                id="fitness-weight-date"
                type="date"
                value={entryDate}
                onChange={(event) => setEntryDate(event.target.value)}
                required
              />
            </Field>
          </div>
          <Field>
            <FieldLabel htmlFor="fitness-weight-notes">
              Optional note
            </FieldLabel>
            <Textarea
              id="fitness-weight-notes"
              value={notes}
              maxLength={500}
              onChange={(event) => setNotes(event.target.value)}
            />
          </Field>
          <FieldError>{error}</FieldError>
        </FieldGroup>
        <FormFooter onCancel={onClose} isSaving={isSaving} label="Log weight" />
      </form>
    </EditorDialog>
  );
}

function GoalEditor({
  dashboard,
  date,
  onClose,
  onSaved,
}: {
  dashboard: FitnessDashboard;
  date: string;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<
    | "weight"
    | "training_consistency"
    | "strength"
    | "running_distance"
    | "running_event"
  >("weight");
  const [startingValue, setStartingValue] = useState("");
  const [targetValue, setTargetValue] = useState("");
  const [unit, setUnit] = useState("kg");
  const [targetDate, setTargetDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  function updateType(value: typeof type) {
    setType(value);
    if (value === "training_consistency") setUnit("workouts / week");
    else if (value === "running_distance" || value === "running_event") {
      setUnit("km");
    } else setUnit("kg");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSaving(true);
    try {
      await rpcClient.fitness.saveGoal({
        personId: dashboard.person.id,
        title: title.trim(),
        type,
        startingValue: optionalNumber(startingValue),
        targetValue: Number(targetValue),
        unit: unit.trim(),
        targetDate: optionalText(targetDate),
      });
      toast.success("Goal added.");
      await onSaved();
      onClose();
    } catch (caught) {
      setError(errorMessage(caught, "The goal could not be added."));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <EditorDialog
      title="Add a goal"
      description="Choose one useful outcome. Milestones can emerge from the recorded progress."
      onClose={onClose}
    >
      <form className="contents" onSubmit={submit}>
        <FieldGroup className="min-h-0 overflow-y-auto px-6 py-5">
          <Field>
            <FieldLabel htmlFor="fitness-goal-title">Goal</FieldLabel>
            <Input
              id="fitness-goal-title"
              value={title}
              maxLength={160}
              autoFocus
              placeholder="Run 10 km comfortably"
              onChange={(event) => setTitle(event.target.value)}
              required
            />
          </Field>
          <Field>
            <FieldLabel>Goal type</FieldLabel>
            <Select
              value={type}
              onValueChange={(value) => updateType(value as typeof type)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="weight">Weight</SelectItem>
                  <SelectItem value="training_consistency">
                    Training consistency
                  </SelectItem>
                  <SelectItem value="strength">Strength</SelectItem>
                  <SelectItem value="running_distance">
                    Running distance
                  </SelectItem>
                  <SelectItem value="running_event">Running event</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          <div className="grid gap-5 sm:grid-cols-3">
            <Field>
              <FieldLabel htmlFor="fitness-goal-start">
                Starting value
              </FieldLabel>
              <Input
                id="fitness-goal-start"
                type="number"
                min="0"
                step="0.1"
                value={startingValue}
                onChange={(event) => setStartingValue(event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="fitness-goal-target">
                Target value
              </FieldLabel>
              <Input
                id="fitness-goal-target"
                type="number"
                min="0.1"
                step="0.1"
                value={targetValue}
                onChange={(event) => setTargetValue(event.target.value)}
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="fitness-goal-unit">Unit</FieldLabel>
              <Input
                id="fitness-goal-unit"
                value={unit}
                maxLength={40}
                onChange={(event) => setUnit(event.target.value)}
                required
              />
            </Field>
          </div>
          <Field>
            <FieldLabel htmlFor="fitness-goal-date">Target date</FieldLabel>
            <Input
              id="fitness-goal-date"
              type="date"
              min={date}
              value={targetDate}
              onChange={(event) => setTargetDate(event.target.value)}
            />
          </Field>
          <FieldError>{error}</FieldError>
        </FieldGroup>
        <FormFooter onCancel={onClose} isSaving={isSaving} label="Add goal" />
      </form>
    </EditorDialog>
  );
}

export function FitnessEditorDialogs({
  target,
  dashboard,
  selectedDate,
  onClose,
  onSaved,
}: {
  target: FitnessEditorTarget | null;
  dashboard: FitnessDashboard;
  selectedDate: string;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  if (!target) return null;

  if (target.kind === "workout") {
    return (
      <WorkoutEditor
        key={`${target.kind}-${target.date ?? selectedDate}-${target.replaceWorkoutId ?? "new"}`}
        dashboard={dashboard}
        date={target.date ?? selectedDate}
        {...(target.replaceWorkoutId !== undefined
          ? { replaceWorkoutId: target.replaceWorkoutId }
          : {})}
        onClose={onClose}
        onSaved={onSaved}
      />
    );
  }
  if (target.kind === "training-plan") {
    return (
      <TrainingPlanEditor
        dashboard={dashboard}
        date={selectedDate}
        onClose={onClose}
        onSaved={onSaved}
      />
    );
  }
  if (target.kind === "nutrition-plan") {
    return (
      <NutritionPlanEditor
        dashboard={dashboard}
        date={selectedDate}
        onClose={onClose}
        onSaved={onSaved}
      />
    );
  }
  if (target.kind === "meal") {
    return (
      <MealEditor dashboard={dashboard} onClose={onClose} onSaved={onSaved} />
    );
  }
  if (target.kind === "weight") {
    return (
      <WeightEditor
        dashboard={dashboard}
        date={selectedDate}
        onClose={onClose}
        onSaved={onSaved}
      />
    );
  }
  return (
    <GoalEditor
      dashboard={dashboard}
      date={selectedDate}
      onClose={onClose}
      onSaved={onSaved}
    />
  );
}
