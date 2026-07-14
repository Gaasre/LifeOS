import { oc } from "@orpc/contract";
import { z } from "zod";

export const fitnessDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a YYYY-MM-DD date.");

export const fitnessWorkoutTypeSchema = z.enum([
  "strength",
  "easy_run",
  "long_run",
  "intervals",
  "tempo_run",
  "recovery_run",
  "rest",
]);

export const fitnessGoalTypeSchema = z.enum([
  "weight",
  "training_consistency",
  "strength",
  "running_distance",
  "running_event",
]);

export const fitnessPlanStatusSchema = z.enum([
  "active",
  "paused",
  "completed",
]);

export const trainingPlanTypeSchema = z.enum(["strength", "running", "mixed"]);

export const plannedWorkoutStatusSchema = z.enum([
  "planned",
  "completed",
  "skipped",
]);

export const mealSlotSchema = z.enum([
  "breakfast",
  "lunch",
  "snack",
  "dinner",
  "other",
]);

export const plannedMealStatusSchema = z.enum(["planned", "eaten", "skipped"]);

export const fitnessExerciseSchema = z.object({
  id: z.string().uuid(),
  exerciseId: z.string().uuid(),
  name: z.string(),
  muscleGroup: z.string().nullable(),
  equipment: z.string().nullable(),
  position: z.number().int().nonnegative(),
  targetSets: z.number().int().positive(),
  targetRepetitions: z.string(),
  targetWeight: z.number().nonnegative().nullable(),
  restSeconds: z.number().int().nonnegative().nullable(),
  notes: z.string().nullable(),
  previousResult: z.string().nullable(),
});

export const fitnessWorkoutSchema = z.object({
  id: z.string().uuid(),
  trainingPlanId: z.string().uuid().nullable(),
  title: z.string(),
  type: fitnessWorkoutTypeSchema,
  date: fitnessDateSchema,
  estimatedDurationMinutes: z.number().int().positive().nullable(),
  summary: z.string().nullable(),
  plannedDistanceKm: z.number().positive().nullable(),
  targetPaceSecondsPerKm: z.number().int().positive().nullable(),
  intervalStructure: z.string().nullable(),
  status: plannedWorkoutStatusSchema,
  exercises: z.array(fitnessExerciseSchema),
});

export const plannedMealViewSchema = z.object({
  id: z.string().uuid(),
  mealId: z.string().uuid().nullable(),
  slot: mealSlotSchema,
  title: z.string(),
  servings: z.number().positive(),
  calories: z.number().int().nonnegative().nullable(),
  protein: z.number().int().nonnegative().nullable(),
  preparationMinutes: z.number().int().nonnegative().nullable(),
  image: z.string().nullable(),
  status: plannedMealStatusSchema,
});

export const fitnessMealSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  image: z.string().nullable(),
  caloriesPerServing: z.number().int().nonnegative().nullable(),
  proteinPerServing: z.number().int().nonnegative().nullable(),
  preparationMinutes: z.number().int().nonnegative().nullable(),
  servings: z.number().int().positive(),
  favourite: z.boolean(),
  tags: z.array(z.string()),
  dietaryNotes: z.string().nullable(),
  ingredients: z.array(
    z.object({
      id: z.string().uuid(),
      name: z.string(),
      quantity: z.number().positive().nullable(),
      unit: z.string().nullable(),
      optional: z.boolean(),
      position: z.number().int().nonnegative(),
    }),
  ),
  steps: z.array(
    z.object({
      id: z.string().uuid(),
      instruction: z.string(),
      position: z.number().int().nonnegative(),
    }),
  ),
});

export const fitnessTrainingPlanSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  type: trainingPlanTypeSchema,
  goal: z.string().nullable(),
  weeklyFrequency: z.number().int().positive(),
  startDate: fitnessDateSchema,
  endDate: fitnessDateSchema.nullable(),
  status: fitnessPlanStatusSchema,
});

export const fitnessNutritionPlanSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  goal: z.string().nullable(),
  calorieTarget: z.number().int().positive(),
  proteinTarget: z.number().int().nonnegative(),
  mealsPerDay: z.number().int().positive(),
  startDate: fitnessDateSchema,
  endDate: fitnessDateSchema.nullable(),
  status: fitnessPlanStatusSchema,
});

export const fitnessGoalSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  type: fitnessGoalTypeSchema,
  startingValue: z.number().nullable(),
  targetValue: z.number(),
  currentValue: z.number().nullable(),
  unit: z.string(),
  targetDate: fitnessDateSchema.nullable(),
  status: z.enum(["active", "paused", "completed"]),
  progress: z.number().min(0).max(100).nullable(),
});

export const fitnessDashboardSchema = z.object({
  person: z.object({
    id: z.string().uuid(),
    preferredName: z.string(),
    isCurrentUser: z.boolean(),
  }),
  date: fitnessDateSchema,
  weekLabel: z.string(),
  profile: z
    .object({
      heightCm: z.number().int().positive().nullable(),
      preferredWeightUnit: z.string(),
      preferredDistanceUnit: z.string(),
      activityLevel: z.string().nullable(),
      notes: z.string().nullable(),
    })
    .nullable(),
  today: z.object({
    workout: fitnessWorkoutSchema.nullable(),
    meals: z.array(plannedMealViewSchema),
    targets: z.object({
      calorieTarget: z.number().int().nonnegative(),
      proteinTarget: z.number().int().nonnegative(),
      loggedCalories: z.number().int().nonnegative(),
      loggedProtein: z.number().int().nonnegative(),
    }),
  }),
  week: z.array(
    z.object({
      date: fitnessDateSchema,
      weekday: z.string(),
      shortDate: z.string(),
      isToday: z.boolean(),
      workout: fitnessWorkoutSchema.nullable(),
      calorieTarget: z.number().int().nonnegative().nullable(),
      mealPlanStatus: z.enum([
        "no_plan",
        "planned",
        "partly_logged",
        "complete",
      ]),
      completed: z.boolean(),
    }),
  ),
  training: z.object({
    plans: z.array(fitnessTrainingPlanSchema),
    recentSessions: z.array(
      z.object({
        id: z.string().uuid(),
        title: z.string(),
        type: fitnessWorkoutTypeSchema,
        date: fitnessDateSchema,
        status: plannedWorkoutStatusSchema,
        actualDistanceKm: z.number().positive().nullable(),
        durationMinutes: z.number().int().positive().nullable(),
        averagePaceSecondsPerKm: z.number().int().positive().nullable(),
      }),
    ),
  }),
  nutrition: z.object({
    activePlan: fitnessNutritionPlanSchema.nullable(),
  }),
  meals: z.array(fitnessMealSchema),
  goals: z.array(fitnessGoalSchema),
  progress: z.object({
    weight: z
      .object({
        current: z.number(),
        starting: z.number(),
        target: z.number().nullable(),
        unit: z.string(),
        changeSinceStart: z.number(),
        trend: z.array(
          z.object({
            date: fitnessDateSchema,
            value: z.number(),
          }),
        ),
      })
      .nullable(),
    strength: z.array(
      z.object({
        exerciseId: z.string().uuid(),
        name: z.string(),
        currentWeight: z.number(),
        previousWeight: z.number().nullable(),
        unit: z.string(),
        direction: z.enum(["up", "steady", "down"]),
      }),
    ),
    running: z.object({
      longestDistanceKm: z.number().nonnegative(),
      recentAveragePaceSecondsPerKm: z.number().int().positive().nullable(),
      weeklyDistanceKm: z.number().nonnegative(),
      lastRunDate: fitnessDateSchema.nullable(),
    }),
    consistency: z.object({
      plannedWorkouts: z.number().int().nonnegative(),
      completedWorkouts: z.number().int().nonnegative(),
      nutritionDays: z.number().int().nonnegative(),
      nutritionDaysOnTarget: z.number().int().nonnegative(),
    }),
  }),
});

const optionalTextSchema = (max: number) =>
  z.string().trim().max(max).nullable();

const operationResultSchema = z.object({ ok: z.literal(true) });

export const fitnessContract = {
  bootstrap: oc
    .input(
      z.object({
        personId: z.string().uuid().optional(),
        date: fitnessDateSchema,
      }),
    )
    .output(fitnessDashboardSchema),
  setMealStatus: oc
    .input(
      z.object({
        plannedMealId: z.string().uuid(),
        status: plannedMealStatusSchema,
      }),
    )
    .output(operationResultSchema),
  replacePlannedMeal: oc
    .input(
      z.object({
        plannedMealId: z.string().uuid(),
        mealId: z.string().uuid(),
      }),
    )
    .output(operationResultSchema),
  setWorkoutStatus: oc
    .input(
      z.object({
        workoutId: z.string().uuid(),
        status: z.enum(["planned", "skipped"]),
      }),
    )
    .output(operationResultSchema),
  completeWorkout: oc
    .input(
      z.object({
        workoutId: z.string().uuid(),
        perceivedEffort: z.number().int().min(1).max(10).nullable(),
        actualDistanceKm: z.number().positive().nullable(),
        durationMinutes: z.number().int().positive().nullable(),
        notes: optionalTextSchema(500),
        exerciseLogs: z
          .array(
            z.object({
              exerciseId: z.string().uuid(),
              repetitions: z.number().int().nonnegative().nullable(),
              weight: z.number().nonnegative().nullable(),
              completed: z.boolean(),
            }),
          )
          .max(30),
      }),
    )
    .output(operationResultSchema),
  logWeight: oc
    .input(
      z.object({
        personId: z.string().uuid(),
        weight: z.number().positive().max(1000),
        date: fitnessDateSchema,
        notes: optionalTextSchema(500),
      }),
    )
    .output(z.object({ id: z.string().uuid() })),
  createTrainingPlan: oc
    .input(
      z.object({
        personId: z.string().uuid(),
        title: z.string().trim().min(1).max(160),
        type: trainingPlanTypeSchema,
        weeklyFrequency: z.number().int().min(1).max(14),
        goal: optionalTextSchema(500),
        startDate: fitnessDateSchema,
        endDate: fitnessDateSchema.nullable(),
      }),
    )
    .output(z.object({ id: z.string().uuid() })),
  createWorkout: oc
    .input(
      z.object({
        personId: z.string().uuid(),
        trainingPlanId: z.string().uuid().nullable(),
        title: z.string().trim().min(1).max(160),
        type: fitnessWorkoutTypeSchema,
        date: fitnessDateSchema,
        estimatedDurationMinutes: z.number().int().positive().nullable(),
        summary: optionalTextSchema(500),
        plannedDistanceKm: z.number().positive().nullable(),
      }),
    )
    .output(z.object({ id: z.string().uuid() })),
  moveWorkout: oc
    .input(
      z.object({
        workoutId: z.string().uuid(),
        date: fitnessDateSchema,
      }),
    )
    .output(operationResultSchema),
  createNutritionPlan: oc
    .input(
      z.object({
        personId: z.string().uuid(),
        title: z.string().trim().min(1).max(160),
        calorieTarget: z.number().int().min(500).max(10000),
        proteinTarget: z.number().int().min(0).max(1000),
        mealsPerDay: z.number().int().min(1).max(12),
        goal: optionalTextSchema(500),
        startDate: fitnessDateSchema,
        endDate: fitnessDateSchema.nullable(),
      }),
    )
    .output(z.object({ id: z.string().uuid() })),
  createMeal: oc
    .input(
      z.object({
        personId: z.string().uuid(),
        title: z.string().trim().min(1).max(160),
        description: optionalTextSchema(800),
        caloriesPerServing: z.number().int().nonnegative().nullable(),
        proteinPerServing: z.number().int().nonnegative().nullable(),
        preparationMinutes: z.number().int().nonnegative().nullable(),
        servings: z.number().int().min(1).max(50),
        favourite: z.boolean(),
        tags: z.array(z.string().trim().min(1).max(60)).max(12),
        dietaryNotes: optionalTextSchema(500),
        ingredients: z
          .array(
            z.object({
              name: z.string().trim().min(1).max(160),
              quantity: z.number().positive().nullable(),
              unit: z.string().trim().max(40).nullable(),
              optional: z.boolean(),
            }),
          )
          .max(40),
        steps: z.array(z.string().trim().min(1).max(800)).max(30),
      }),
    )
    .output(z.object({ id: z.string().uuid() })),
  addMealToDay: oc
    .input(
      z.object({
        personId: z.string().uuid(),
        mealId: z.string().uuid(),
        date: fitnessDateSchema,
        slot: mealSlotSchema,
      }),
    )
    .output(z.object({ id: z.string().uuid() })),
  copyDayMeals: oc
    .input(
      z.object({
        personId: z.string().uuid(),
        sourceDate: fitnessDateSchema,
        targetDate: fitnessDateSchema,
      }),
    )
    .output(operationResultSchema),
  saveGoal: oc
    .input(
      z.object({
        personId: z.string().uuid(),
        title: z.string().trim().min(1).max(160),
        type: fitnessGoalTypeSchema,
        startingValue: z.number().nonnegative().nullable(),
        targetValue: z.number().positive(),
        unit: z.string().trim().min(1).max(40),
        targetDate: fitnessDateSchema.nullable(),
      }),
    )
    .output(z.object({ id: z.string().uuid() })),
} as const;

export type FitnessDashboard = z.infer<typeof fitnessDashboardSchema>;
export type FitnessWorkout = z.infer<typeof fitnessWorkoutSchema>;
export type FitnessMeal = z.infer<typeof fitnessMealSchema>;
export type PlannedFitnessMeal = z.infer<typeof plannedMealViewSchema>;
export type FitnessGoal = z.infer<typeof fitnessGoalSchema>;
export type FitnessWorkoutType = z.infer<typeof fitnessWorkoutTypeSchema>;
export type FitnessSection =
  "today" | "week" | "training" | "nutrition" | "meals" | "goals" | "progress";
