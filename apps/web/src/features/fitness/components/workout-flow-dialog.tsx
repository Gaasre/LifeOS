import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  DumbbellIcon,
  FootprintsIcon,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";

import type { FitnessWorkout } from "@lifeos/rpc";
import { Badge } from "@lifeos/ui/components/badge";
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
import { Progress } from "@lifeos/ui/components/progress";
import { Spinner } from "@lifeos/ui/components/spinner";
import { Textarea } from "@lifeos/ui/components/textarea";
import { cn } from "@lifeos/ui/lib/utils";

import {
  formatCompactNumber,
  formatPace,
  formatWorkoutType,
} from "@/features/fitness/fitness-format";
import {
  fitnessEase,
  fitnessMicroSpring,
} from "@/features/fitness/fitness-motion";
import { rpcClient } from "@/lib/rpc-client";

type SetDraft = {
  repetitions: string;
  weight: string;
  completed: boolean;
};

function optionalNumber(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function optionalText(value: string) {
  return value.trim() || null;
}

function messageFromError(error: unknown) {
  return error instanceof Error
    ? error.message
    : "The workout could not be completed.";
}

function StrengthFlow({
  workout,
  onComplete,
  isSaving,
  error,
}: {
  workout: FitnessWorkout;
  onComplete: (input: {
    effort: number | null;
    notes: string | null;
    setDrafts: Record<string, SetDraft>;
  }) => void;
  isSaving: boolean;
  error: string | null;
}) {
  const [index, setIndex] = useState(0);
  const [effort, setEffort] = useState("");
  const [notes, setNotes] = useState("");
  const [setDrafts, setSetDrafts] = useState<Record<string, SetDraft>>({});
  const exercise = workout.exercises[index] ?? null;
  const nextExercise = workout.exercises[index + 1] ?? null;
  const progress =
    workout.exercises.length > 0
      ? ((index + 1) / workout.exercises.length) * 100
      : 100;

  function setKey(exerciseId: string, setIndex: number) {
    return `${exerciseId}:${setIndex}`;
  }

  function updateSet(key: string, patch: Partial<SetDraft>) {
    setSetDrafts((current) => ({
      ...current,
      [key]: {
        repetitions: "",
        weight: "",
        completed: false,
        ...current[key],
        ...patch,
      },
    }));
  }

  function markExerciseComplete() {
    if (!exercise) return;
    setSetDrafts((current) => {
      const next = { ...current };
      for (let setIndex = 0; setIndex < exercise.targetSets; setIndex += 1) {
        const key = setKey(exercise.exerciseId, setIndex);
        next[key] = {
          repetitions: next[key]?.repetitions ?? "",
          weight: next[key]?.weight ?? "",
          completed: true,
        };
      }
      return next;
    });
  }

  if (!exercise) {
    return (
      <>
        <div className="flex min-h-0 flex-col gap-6 overflow-y-auto px-6 py-5">
          <div className="rounded-xl bg-muted/25 p-5 ring-1 ring-foreground/[0.055]">
            <p className="m-0 text-lg">{workout.title}</p>
            <p className="mt-2 mb-0 text-sm leading-relaxed text-muted-foreground">
              No exercise details are attached. You can still complete the
              session without logging anything else.
            </p>
          </div>
          <Field>
            <FieldLabel htmlFor="fitness-strength-effort">
              Perceived effort (1–10)
            </FieldLabel>
            <Input
              id="fitness-strength-effort"
              type="number"
              min="1"
              max="10"
              value={effort}
              onChange={(event) => setEffort(event.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="fitness-strength-notes">
              Optional note
            </FieldLabel>
            <Textarea
              id="fitness-strength-notes"
              value={notes}
              maxLength={500}
              onChange={(event) => setNotes(event.target.value)}
            />
          </Field>
          <FieldError>{error}</FieldError>
        </div>
        <DialogFooter className="mx-0 mb-0 rounded-none rounded-b-xl px-6 py-4">
          <Button
            size="lg"
            disabled={isSaving}
            onClick={() =>
              onComplete({
                effort: optionalNumber(effort),
                notes: optionalText(notes),
                setDrafts,
              })
            }
          >
            {isSaving ? <Spinner data-icon="inline-start" /> : <CheckIcon />}
            {isSaving ? "Finishing…" : "Finish workout"}
          </Button>
        </DialogFooter>
      </>
    );
  }

  return (
    <>
      <div className="flex min-h-0 flex-col gap-6 overflow-y-auto px-6 py-5">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-4 text-xs text-muted-foreground">
            <span>
              Exercise {index + 1} of {workout.exercises.length}
            </span>
            <span>Details are optional</span>
          </div>
          <Progress
            value={progress}
            className="h-1 [&_[data-slot=progress-indicator]]:bg-fitness-accent"
          />
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.section
            key={exercise.id}
            initial={{ opacity: 0, x: 24, filter: "blur(3px)" }}
            animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, x: -16, filter: "blur(2px)" }}
            transition={{ duration: 0.28, ease: fitnessEase }}
            className="flex flex-col gap-5"
            aria-labelledby="fitness-current-exercise"
          >
            <div className="rounded-2xl bg-fitness-accent/[0.065] p-5 ring-1 ring-fitness-accent/25 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="mb-2 text-xs font-medium tracking-[0.14em] text-fitness-accent uppercase">
                    Current exercise
                  </p>
                  <h3
                    id="fitness-current-exercise"
                    className="m-0 text-3xl font-normal tracking-[-0.025em]"
                  >
                    {exercise.name}
                  </h3>
                </div>
                <Badge variant="outline">
                  {exercise.targetSets} × {exercise.targetRepetitions}
                </Badge>
              </div>
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
                {exercise.targetWeight !== null ? (
                  <span>
                    Target {formatCompactNumber(exercise.targetWeight)} kg
                  </span>
                ) : null}
                {exercise.restSeconds !== null ? (
                  <span>Rest {exercise.restSeconds} sec</span>
                ) : null}
                {exercise.previousResult ? (
                  <span>Previous {exercise.previousResult}</span>
                ) : null}
              </div>
              {exercise.notes ? (
                <p className="mt-4 mb-0 text-sm leading-relaxed text-muted-foreground">
                  {exercise.notes}
                </p>
              ) : null}
            </div>

            <FieldGroup className="gap-3">
              {Array.from({ length: exercise.targetSets }, (_, setIndex) => {
                const key = setKey(exercise.exerciseId, setIndex);
                const draft = setDrafts[key] ?? {
                  repetitions: "",
                  weight: "",
                  completed: false,
                };
                return (
                  <motion.div
                    key={key}
                    layout
                    whileHover={{ x: 2 }}
                    transition={fitnessMicroSpring}
                    className={cn(
                      "grid grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)] items-end gap-3 rounded-xl bg-muted/18 p-3 ring-1 ring-foreground/[0.05] transition-[background-color,box-shadow] duration-200 motion-reduce:transition-none",
                      draft.completed &&
                        "bg-fitness-accent/[0.055] ring-fitness-accent/25",
                    )}
                  >
                    <div className="flex h-8 items-center gap-2 self-end pr-1">
                      <Checkbox
                        id={`${key}-complete`}
                        checked={draft.completed}
                        onCheckedChange={(checked) =>
                          updateSet(key, { completed: checked === true })
                        }
                        aria-label={`Mark set ${setIndex + 1} completed`}
                      />
                      <span className="text-sm text-muted-foreground">
                        {setIndex + 1}
                      </span>
                    </div>
                    <Field>
                      <FieldLabel htmlFor={`${key}-reps`}>Reps</FieldLabel>
                      <Input
                        id={`${key}-reps`}
                        type="number"
                        min="0"
                        inputMode="numeric"
                        value={draft.repetitions}
                        placeholder={exercise.targetRepetitions}
                        onChange={(event) =>
                          updateSet(key, { repetitions: event.target.value })
                        }
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor={`${key}-weight`}>Weight</FieldLabel>
                      <Input
                        id={`${key}-weight`}
                        type="number"
                        min="0"
                        step="0.5"
                        inputMode="decimal"
                        value={draft.weight}
                        placeholder={
                          exercise.targetWeight === null
                            ? "kg"
                            : String(exercise.targetWeight)
                        }
                        onChange={(event) =>
                          updateSet(key, { weight: event.target.value })
                        }
                      />
                    </Field>
                  </motion.div>
                );
              })}
            </FieldGroup>

            <Button variant="outline" onClick={markExerciseComplete}>
              <CheckIcon data-icon="inline-start" /> Mark exercise complete
            </Button>
          </motion.section>
        </AnimatePresence>

        <AnimatePresence mode="wait" initial={false}>
          {nextExercise ? (
            <motion.div
              key={nextExercise.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -3 }}
              transition={{ duration: 0.16, ease: fitnessEase }}
              className="rounded-xl border border-dashed border-border/75 px-4 py-3"
            >
              <p className="m-0 text-xs tracking-[0.12em] text-muted-foreground uppercase">
                Next
              </p>
              <p className="mt-1 mb-0 text-sm">{nextExercise.name}</p>
            </motion.div>
          ) : (
            <motion.div
              key="finish-fields"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18, ease: fitnessEase }}
            >
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="fitness-strength-effort-final">
                    Perceived effort (1–10)
                  </FieldLabel>
                  <Input
                    id="fitness-strength-effort-final"
                    type="number"
                    min="1"
                    max="10"
                    value={effort}
                    onChange={(event) => setEffort(event.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="fitness-strength-notes-final">
                    Optional note
                  </FieldLabel>
                  <Textarea
                    id="fitness-strength-notes-final"
                    value={notes}
                    maxLength={500}
                    onChange={(event) => setNotes(event.target.value)}
                  />
                </Field>
              </FieldGroup>
            </motion.div>
          )}
        </AnimatePresence>
        <FieldError>{error}</FieldError>
      </div>

      <DialogFooter className="mx-0 mb-0 rounded-none rounded-b-xl px-6 py-4 sm:justify-between">
        <Button
          variant="ghost"
          disabled={index === 0 || isSaving}
          onClick={() => setIndex((current) => Math.max(0, current - 1))}
        >
          <ArrowLeftIcon
            data-icon="inline-start"
            className="transition-transform duration-200 group-hover/button:-translate-x-0.5 motion-reduce:transition-none"
          />{" "}
          Back
        </Button>
        {nextExercise ? (
          <Button
            size="lg"
            onClick={() =>
              setIndex((current) =>
                Math.min(workout.exercises.length - 1, current + 1),
              )
            }
          >
            Next exercise
            <ArrowRightIcon
              data-icon="inline-end"
              className="transition-transform duration-200 group-hover/button:translate-x-0.5 motion-reduce:transition-none"
            />
          </Button>
        ) : (
          <Button
            size="lg"
            disabled={isSaving}
            onClick={() =>
              onComplete({
                effort: optionalNumber(effort),
                notes: optionalText(notes),
                setDrafts,
              })
            }
          >
            {isSaving ? <Spinner data-icon="inline-start" /> : <CheckIcon />}
            {isSaving ? "Finishing…" : "Finish workout"}
          </Button>
        )}
      </DialogFooter>
    </>
  );
}

function RunFlow({
  workout,
  onComplete,
  isSaving,
  error,
}: {
  workout: FitnessWorkout;
  onComplete: (input: {
    effort: number | null;
    distance: number | null;
    duration: number | null;
    notes: string | null;
  }) => void;
  isSaving: boolean;
  error: string | null;
}) {
  const [distance, setDistance] = useState(
    workout.plannedDistanceKm === null ? "" : String(workout.plannedDistanceKm),
  );
  const [duration, setDuration] = useState(
    workout.estimatedDurationMinutes === null
      ? ""
      : String(workout.estimatedDurationMinutes),
  );
  const [effort, setEffort] = useState("");
  const [notes, setNotes] = useState("");
  const pace = useMemo(() => {
    const distanceValue = optionalNumber(distance);
    const durationValue = optionalNumber(duration);
    if (!distanceValue || !durationValue) return null;
    return Math.round((durationValue * 60) / distanceValue);
  }, [distance, duration]);

  return (
    <>
      <div className="flex min-h-0 flex-col gap-6 overflow-y-auto px-6 py-5">
        <div className="rounded-2xl bg-fitness-accent/[0.065] p-6 ring-1 ring-fitness-accent/25">
          <p className="mb-2 text-xs font-medium tracking-[0.14em] text-fitness-accent uppercase">
            {formatWorkoutType(workout.type)}
          </p>
          <h3 className="m-0 text-3xl font-normal tracking-[-0.025em]">
            {workout.title}
          </h3>
          <p className="mt-3 mb-0 max-w-lg text-sm leading-relaxed text-muted-foreground">
            {workout.summary ??
              "Run comfortably and record only what is useful."}
          </p>
        </div>

        <FieldGroup>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="fitness-run-distance">
                Distance (km)
              </FieldLabel>
              <Input
                id="fitness-run-distance"
                type="number"
                min="0.1"
                step="0.1"
                inputMode="decimal"
                value={distance}
                onChange={(event) => setDistance(event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="fitness-run-duration">
                Duration (minutes)
              </FieldLabel>
              <Input
                id="fitness-run-duration"
                type="number"
                min="1"
                inputMode="numeric"
                value={duration}
                onChange={(event) => setDuration(event.target.value)}
              />
            </Field>
          </div>
          <Field>
            <FieldLabel htmlFor="fitness-run-effort">
              Perceived effort (1–10)
            </FieldLabel>
            <Input
              id="fitness-run-effort"
              type="number"
              min="1"
              max="10"
              value={effort}
              onChange={(event) => setEffort(event.target.value)}
            />
            <FieldDescription>
              {pace === null
                ? "Distance, time, and effort can all be left blank."
                : `Calculated average pace: ${formatPace(pace)}`}
            </FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="fitness-run-notes">Optional note</FieldLabel>
            <Textarea
              id="fitness-run-notes"
              value={notes}
              maxLength={500}
              placeholder="Felt comfortable after the first kilometre."
              onChange={(event) => setNotes(event.target.value)}
            />
          </Field>
          <FieldError>{error}</FieldError>
        </FieldGroup>
      </div>
      <DialogFooter className="mx-0 mb-0 rounded-none rounded-b-xl px-6 py-4">
        <Button
          size="lg"
          disabled={isSaving}
          onClick={() =>
            onComplete({
              effort: optionalNumber(effort),
              distance: optionalNumber(distance),
              duration: optionalNumber(duration),
              notes: optionalText(notes),
            })
          }
        >
          {isSaving ? <Spinner data-icon="inline-start" /> : <CheckIcon />}
          {isSaving ? "Finishing…" : "Finish run"}
        </Button>
      </DialogFooter>
    </>
  );
}

export function WorkoutFlowDialog({
  workout,
  onOpenChange,
  onCompleted,
}: {
  workout: FitnessWorkout | null;
  onOpenChange: (open: boolean) => void;
  onCompleted: () => void | Promise<void>;
}) {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    setIsSaving(false);
  }, [workout?.id]);

  if (!workout || workout.type === "rest") return null;
  const activeWorkout = workout;
  const isStrength = workout.type === "strength";

  async function complete(input: {
    effort: number | null;
    distance?: number | null;
    duration?: number | null;
    notes?: string | null;
    setDrafts?: Record<string, SetDraft>;
  }) {
    setError(null);
    setIsSaving(true);
    try {
      const exerciseLogs = activeWorkout.exercises.flatMap((exercise) =>
        Array.from({ length: exercise.targetSets }, (_, setIndex) => {
          const draft = input.setDrafts?.[`${exercise.exerciseId}:${setIndex}`];
          if (
            !draft ||
            (!draft.completed &&
              !draft.repetitions.trim() &&
              !draft.weight.trim())
          ) {
            return [];
          }
          return [
            {
              exerciseId: exercise.exerciseId,
              repetitions: optionalNumber(draft.repetitions),
              weight: optionalNumber(draft.weight),
              completed: draft.completed,
            },
          ];
        }).flat(),
      );
      await rpcClient.fitness.completeWorkout({
        workoutId: activeWorkout.id,
        perceivedEffort: input.effort,
        actualDistanceKm: input.distance ?? null,
        durationMinutes: input.duration ?? null,
        notes: input.notes ?? null,
        exerciseLogs,
      });
      toast.success(isStrength ? "Workout completed." : "Run completed.");
      await onCompleted();
      onOpenChange(false);
    } catch (caught) {
      setError(messageFromError(caught));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={Boolean(workout)} onOpenChange={onOpenChange}>
      <DialogContent
        className="grid max-h-[min(94dvh,58rem)] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0 sm:max-w-2xl"
        showCloseButton={!isSaving}
      >
        <DialogHeader className="border-b px-6 py-5 pr-12">
          <DialogTitle className="flex items-center gap-2">
            {isStrength ? (
              <DumbbellIcon className="size-4 text-fitness-accent" />
            ) : (
              <FootprintsIcon className="size-4 text-fitness-accent" />
            )}
            {workout.title}
          </DialogTitle>
          <DialogDescription>
            {isStrength
              ? "One exercise at a time. Repetitions and weight are optional."
              : "Log the run after it is done; no route or GPS tracking required."}
          </DialogDescription>
        </DialogHeader>
        {isStrength ? (
          <StrengthFlow
            workout={workout}
            isSaving={isSaving}
            error={error}
            onComplete={(input) => void complete({ ...input })}
          />
        ) : (
          <RunFlow
            workout={workout}
            isSaving={isSaving}
            error={error}
            onComplete={(input) => void complete(input)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
