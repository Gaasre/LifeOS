import { requireHouseholdMembership } from "@lifeos/access";
import {
  type DatabaseTransaction,
  dailyNutritionPlans,
  db,
  exerciseSets,
  fitnessGoals,
  fitnessProfiles,
  mealIngredients,
  meals,
  mealSteps,
  nutritionPlans,
  people,
  plannedExercises,
  plannedMeals,
  plannedWorkouts,
  runSessions,
  strengthExercises,
  trainingPlans,
  weightEntries,
  workoutSessions,
} from "@lifeos/db";
import { and, asc, desc, eq, gte, inArray, lte } from "drizzle-orm";

const DAY_MS = 86_400_000;

type WorkoutType = typeof plannedWorkouts.$inferInsert.workoutType;
type MealSlot = typeof plannedMeals.$inferInsert.slot;
type GoalType = typeof fitnessGoals.$inferInsert.type;

export class FitnessServiceError extends Error {
  constructor(
    public readonly code: "NOT_FOUND" | "BAD_REQUEST" | "INTERNAL",
    message: string,
  ) {
    super(message);
    this.name = "FitnessServiceError";
  }
}

function dateAtNoon(value: string) {
  return new Date(`${value}T12:00:00.000Z`);
}

function formatDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function addDays(value: string, amount: number) {
  return formatDate(new Date(dateAtNoon(value).getTime() + amount * DAY_MS));
}

function getWeekDates(value: string) {
  const date = dateAtNoon(value);
  const mondayOffset = (date.getUTCDay() + 6) % 7;
  const monday = formatDate(new Date(date.getTime() - mondayOffset * DAY_MS));
  return Array.from({ length: 7 }, (_, index) => addDays(monday, index));
}

function optionalText(value: string | null) {
  return value?.trim() || null;
}

function asNumber(value: string | null) {
  return value === null ? null : Number(value);
}

function clamp(value: number, minimum = 0, maximum = 100) {
  return Math.min(maximum, Math.max(minimum, value));
}

function round(value: number, precision = 1) {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

function paceLabel(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.round(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${remainder} /km`;
}

async function resolvePerson(actorUserId: string, requestedPersonId?: string) {
  const membership = await requireHouseholdMembership(actorUserId);
  const [person] = await db
    .select()
    .from(people)
    .where(
      and(
        eq(people.organizationId, membership.organization.id),
        requestedPersonId
          ? eq(people.id, requestedPersonId)
          : eq(people.userId, actorUserId),
      ),
    )
    .limit(1);

  if (!person) {
    throw new FitnessServiceError(
      "NOT_FOUND",
      requestedPersonId
        ? "That person could not be found in your Family."
        : "Your person profile could not be found.",
    );
  }

  return {
    membership,
    person,
    isCurrentUser: person.userId === actorUserId,
  };
}

async function requireWorkout(actorUserId: string, workoutId: string) {
  const membership = await requireHouseholdMembership(actorUserId);
  const [row] = await db
    .select({ workout: plannedWorkouts })
    .from(plannedWorkouts)
    .innerJoin(people, eq(plannedWorkouts.personId, people.id))
    .where(
      and(
        eq(plannedWorkouts.id, workoutId),
        eq(people.organizationId, membership.organization.id),
      ),
    )
    .limit(1);
  if (!row) {
    throw new FitnessServiceError("NOT_FOUND", "Workout not found.");
  }
  return row.workout;
}

async function requireMeal(actorUserId: string, mealId: string) {
  const membership = await requireHouseholdMembership(actorUserId);
  const [row] = await db
    .select({ meal: meals })
    .from(meals)
    .innerJoin(people, eq(meals.personId, people.id))
    .where(
      and(
        eq(meals.id, mealId),
        eq(people.organizationId, membership.organization.id),
      ),
    )
    .limit(1);
  if (!row) {
    throw new FitnessServiceError("NOT_FOUND", "Meal not found.");
  }
  return row.meal;
}

const starterSchedule: Array<{
  title: string;
  type: WorkoutType;
  duration: number | null;
  summary: string;
  distance: number | null;
  plan: "strength" | "running";
}> = [
  {
    title: "Upper body",
    type: "strength",
    duration: 45,
    summary: "3 exercises · Moderate session",
    distance: null,
    plan: "strength",
  },
  {
    title: "Easy run",
    type: "easy_run",
    duration: 35,
    summary: "Comfortable, conversational pace",
    distance: 4.5,
    plan: "running",
  },
  {
    title: "Lower body",
    type: "strength",
    duration: 50,
    summary: "3 exercises · Controlled effort",
    distance: null,
    plan: "strength",
  },
  {
    title: "Recovery day",
    type: "rest",
    duration: null,
    summary: "No planned training",
    distance: null,
    plan: "running",
  },
  {
    title: "Tempo run",
    type: "tempo_run",
    duration: 38,
    summary: "Easy start · Steady middle",
    distance: 5,
    plan: "running",
  },
  {
    title: "Full body",
    type: "strength",
    duration: 55,
    summary: "3 exercises · Smooth technique",
    distance: null,
    plan: "strength",
  },
  {
    title: "Long run",
    type: "long_run",
    duration: 50,
    summary: "Comfortable pace · Finish with energy",
    distance: 6,
    plan: "running",
  },
];

const starterMeals = [
  {
    title: "Eggs and sourdough",
    description: "Soft eggs, toasted sourdough and avocado.",
    calories: 520,
    protein: 28,
    minutes: 10,
    servings: 1,
    favourite: true,
    tags: ["Quick breakfasts", "Favourites"],
    dietaryNotes: "Naturally milk-free; cheese is optional.",
  },
  {
    title: "Chicken rice bowl",
    description: "Chicken, rice and crisp vegetables with a simple dressing.",
    calories: 720,
    protein: 48,
    minutes: 25,
    servings: 1,
    favourite: true,
    tags: ["Work lunches", "Post-workout meals"],
    dietaryNotes: "Milk-free.",
  },
  {
    title: "Banana peanut-butter shake",
    description: "A practical high-calorie shake for busy days.",
    calories: 560,
    protein: 30,
    minutes: 5,
    servings: 1,
    favourite: true,
    tags: ["High-calorie shakes", "Post-workout meals"],
    dietaryNotes: "Use lactose-free milk and a tolerated protein powder.",
  },
  {
    title: "Salmon pasta",
    description: "Salmon, pasta, spinach and lemon.",
    calories: 760,
    protein: 44,
    minutes: 25,
    servings: 1,
    favourite: true,
    tags: ["Easy dinners"],
    dietaryNotes: "Use olive oil or lactose-free cream.",
  },
  {
    title: "Overnight oats with berries",
    description: "Oats, berries and nut butter prepared the night before.",
    calories: 610,
    protein: 32,
    minutes: 8,
    servings: 1,
    favourite: false,
    tags: ["Quick breakfasts"],
    dietaryNotes: "Use lactose-free milk.",
  },
  {
    title: "Pesto chicken pasta for two",
    description: "A repeatable shared dinner with chicken, pasta and pesto.",
    calories: 780,
    protein: 46,
    minutes: 30,
    servings: 2,
    favourite: false,
    tags: ["Meals for two", "Easy dinners"],
    dietaryNotes: "Parmesan is optional and usually low in lactose.",
  },
] as const;

const starterIngredients: Record<
  string,
  Array<{
    name: string;
    quantity: number;
    unit: string;
    optional?: boolean;
  }>
> = {
  "Eggs and sourdough": [
    { name: "Eggs", quantity: 3, unit: "whole" },
    { name: "Sourdough", quantity: 2, unit: "slices" },
    { name: "Avocado", quantity: 0.5, unit: "whole" },
  ],
  "Chicken rice bowl": [
    { name: "Chicken breast", quantity: 180, unit: "g" },
    { name: "Cooked rice", quantity: 250, unit: "g" },
    { name: "Mixed vegetables", quantity: 150, unit: "g" },
  ],
  "Banana peanut-butter shake": [
    { name: "Lactose-free milk", quantity: 350, unit: "ml" },
    { name: "Banana", quantity: 1, unit: "whole" },
    { name: "Peanut butter", quantity: 30, unit: "g" },
    { name: "Oats", quantity: 40, unit: "g" },
    { name: "Protein powder", quantity: 25, unit: "g", optional: true },
  ],
  "Salmon pasta": [
    { name: "Salmon", quantity: 170, unit: "g" },
    { name: "Dry pasta", quantity: 120, unit: "g" },
    { name: "Spinach", quantity: 80, unit: "g" },
  ],
  "Overnight oats with berries": [
    { name: "Oats", quantity: 100, unit: "g" },
    { name: "Lactose-free milk", quantity: 250, unit: "ml" },
    { name: "Berries", quantity: 100, unit: "g" },
  ],
  "Pesto chicken pasta for two": [
    { name: "Chicken breast", quantity: 360, unit: "g" },
    { name: "Dry pasta", quantity: 240, unit: "g" },
    { name: "Pesto", quantity: 60, unit: "g" },
  ],
};

const starterSteps: Record<string, string[]> = {
  "Eggs and sourdough": [
    "Toast the sourdough.",
    "Cook the eggs gently and serve with avocado.",
  ],
  "Chicken rice bowl": [
    "Cook the chicken until golden and cooked through.",
    "Serve over warm rice with vegetables and dressing.",
  ],
  "Banana peanut-butter shake": [
    "Blend everything until smooth.",
    "Add more lactose-free milk if a thinner shake is preferred.",
  ],
  "Salmon pasta": [
    "Cook the pasta and reserve a little cooking water.",
    "Cook the salmon, fold in spinach, then combine with pasta.",
  ],
  "Overnight oats with berries": [
    "Stir the oats and lactose-free milk together.",
    "Chill overnight and add berries before eating.",
  ],
  "Pesto chicken pasta for two": [
    "Cook the pasta and chicken separately.",
    "Toss together with pesto and a splash of pasta water.",
  ],
};

async function seedStarterData(
  tx: DatabaseTransaction,
  personId: string,
  date: string,
) {
  const [profile] = await tx
    .insert(fitnessProfiles)
    .values({
      personId,
      heightCm: 178,
      preferredWeightUnit: "kg",
      preferredDistanceUnit: "km",
      activityLevel: "moderately_active",
      notes: "Gain weight and muscle with simple, repeatable routines.",
    })
    .onConflictDoNothing({ target: fitnessProfiles.personId })
    .returning({ personId: fitnessProfiles.personId });

  if (!profile) return;

  const weekDates = getWeekDates(date);
  const weekStart = weekDates[0]!;
  const previousWeekDates = weekDates.map((day) => addDays(day, -7));

  const [strengthPlan, runningPlan] = await tx
    .insert(trainingPlans)
    .values([
      {
        personId,
        title: "Three-day muscle gain",
        type: "strength",
        goal: "Build strength and muscle consistently.",
        weeklyFrequency: 3,
        startDate: addDays(weekStart, -21),
        status: "active",
      },
      {
        personId,
        title: "Comfortable 10 km",
        type: "running",
        goal: "Progress from 4 km toward a comfortable 10 km.",
        weeklyFrequency: 3,
        startDate: addDays(weekStart, -21),
        status: "active",
      },
    ])
    .returning();

  if (!strengthPlan || !runningPlan) {
    throw new FitnessServiceError(
      "INTERNAL",
      "The starter training plans could not be prepared.",
    );
  }

  const exerciseRows = await tx
    .insert(strengthExercises)
    .values(
      [
        ["Bench press", "Chest", "Barbell"],
        ["Seated cable row", "Back", "Cable"],
        ["Standing overhead press", "Shoulders", "Barbell"],
        ["Goblet squat", "Legs", "Dumbbell"],
        ["Romanian deadlift", "Hamstrings", "Barbell"],
        ["Split squat", "Legs", "Dumbbell"],
      ].map(([name, muscleGroup, equipment]) => ({
        personId,
        name: name!,
        muscleGroup: muscleGroup!,
        equipment: equipment!,
        custom: false,
      })),
    )
    .returning();
  const exerciseByName = new Map(
    exerciseRows.map((exercise) => [exercise.name, exercise]),
  );

  const currentWorkoutValues = starterSchedule.map((session, index) => ({
    trainingPlanId:
      session.plan === "strength" ? strengthPlan.id : runningPlan.id,
    personId,
    title: session.title,
    workoutType: session.type,
    plannedDate: weekDates[index]!,
    estimatedDurationMinutes: session.duration,
    summary: session.summary,
    plannedDistanceKm:
      session.distance === null ? null : session.distance.toFixed(2),
    targetPaceSecondsPerKm:
      session.type === "easy_run" || session.type === "long_run" ? 405 : null,
    position: index,
    status:
      weekDates[index]! < date ? ("completed" as const) : ("planned" as const),
  }));
  const previousWorkoutValues = starterSchedule.map((session, index) => ({
    trainingPlanId:
      session.plan === "strength" ? strengthPlan.id : runningPlan.id,
    personId,
    title: session.title,
    workoutType: session.type,
    plannedDate: previousWeekDates[index]!,
    estimatedDurationMinutes: session.duration,
    summary: session.summary,
    plannedDistanceKm:
      session.distance === null
        ? null
        : Math.max(3.8, session.distance - 0.4).toFixed(2),
    targetPaceSecondsPerKm:
      session.type === "easy_run" || session.type === "long_run" ? 415 : null,
    position: index,
    status: "completed" as const,
  }));
  const workoutRows = await tx
    .insert(plannedWorkouts)
    .values([...previousWorkoutValues, ...currentWorkoutValues])
    .returning();

  const exercisePrescription: Array<typeof plannedExercises.$inferInsert> = [];
  for (const workout of workoutRows.filter(
    (row) => row.workoutType === "strength",
  )) {
    const isHistory = workout.plannedDate < weekStart;
    const names = workout.title.includes("Upper")
      ? ["Bench press", "Seated cable row", "Standing overhead press"]
      : workout.title.includes("Lower")
        ? ["Goblet squat", "Romanian deadlift", "Split squat"]
        : ["Goblet squat", "Bench press", "Seated cable row"];
    const currentWeights = workout.title.includes("Upper")
      ? [40, 35, 20]
      : workout.title.includes("Lower")
        ? [32.5, 45, 20]
        : [35, 40, 35];

    names.forEach((name, position) => {
      const exercise = exerciseByName.get(name);
      if (!exercise) return;
      const targetWeight = currentWeights[position]! - (isHistory ? 2.5 : 0);
      exercisePrescription.push({
        plannedWorkoutId: workout.id,
        exerciseId: exercise.id,
        position,
        targetSets: 3,
        targetRepetitions: position === 1 ? "10" : "8",
        targetWeight: targetWeight.toFixed(2),
        restSeconds: 90,
        notes: position === 0 ? "Keep two repetitions in reserve." : null,
      });
    });
  }
  if (exercisePrescription.length > 0) {
    await tx.insert(plannedExercises).values(exercisePrescription);
  }

  const historicalStrength = workoutRows.filter(
    (workout) =>
      workout.workoutType === "strength" && workout.plannedDate < weekStart,
  );
  if (historicalStrength.length > 0) {
    const strengthSessionRows = await tx
      .insert(workoutSessions)
      .values(
        historicalStrength.map((workout) => ({
          personId,
          plannedWorkoutId: workout.id,
          startedAt: new Date(`${workout.plannedDate}T17:30:00.000Z`),
          completedAt: new Date(`${workout.plannedDate}T18:20:00.000Z`),
          perceivedEffort: 7,
        })),
      )
      .returning();
    const prescriptions = await tx
      .select()
      .from(plannedExercises)
      .where(
        inArray(
          plannedExercises.plannedWorkoutId,
          historicalStrength.map((workout) => workout.id),
        ),
      );
    const setRows = strengthSessionRows.flatMap((session) =>
      prescriptions
        .filter(
          (prescription) =>
            prescription.plannedWorkoutId === session.plannedWorkoutId,
        )
        .map((prescription) => ({
          workoutSessionId: session.id,
          exerciseId: prescription.exerciseId,
          setNumber: 1,
          repetitions: Number.parseInt(prescription.targetRepetitions, 10),
          weight: prescription.targetWeight,
          completed: true,
        })),
    );
    if (setRows.length > 0) await tx.insert(exerciseSets).values(setRows);
  }

  const historicalRuns = workoutRows.filter(
    (workout) =>
      workout.workoutType !== "strength" &&
      workout.workoutType !== "rest" &&
      workout.plannedDate < weekStart,
  );
  const runValues: Array<typeof runSessions.$inferInsert> = historicalRuns.map(
    (workout) => {
      const distance = Number(workout.plannedDistanceKm ?? 4);
      const pace = workout.workoutType === "tempo_run" ? 370 : 410;
      return {
        personId,
        plannedWorkoutId: workout.id,
        runType: workout.workoutType,
        plannedDistanceKm: workout.plannedDistanceKm,
        actualDistanceKm: distance.toFixed(2),
        durationSeconds: Math.round(distance * pace),
        averagePaceSecondsPerKm: pace,
        perceivedEffort: workout.workoutType === "tempo_run" ? 7 : 5,
        completedAt: new Date(`${workout.plannedDate}T18:00:00.000Z`),
      };
    },
  );
  runValues.push(
    {
      personId,
      plannedWorkoutId: null,
      runType: "long_run",
      plannedDistanceKm: "5.20",
      actualDistanceKm: "5.20",
      durationSeconds: 2_132,
      averagePaceSecondsPerKm: 410,
      perceivedEffort: 6,
      completedAt: new Date(`${addDays(weekStart, -14)}T09:00:00.000Z`),
    },
    {
      personId,
      plannedWorkoutId: null,
      runType: "easy_run",
      plannedDistanceKm: "4.80",
      actualDistanceKm: "4.80",
      durationSeconds: 2_016,
      averagePaceSecondsPerKm: 420,
      perceivedEffort: 5,
      completedAt: new Date(`${addDays(weekStart, -21)}T18:00:00.000Z`),
    },
  );
  await tx.insert(runSessions).values(runValues);

  const [nutritionPlan] = await tx
    .insert(nutritionPlans)
    .values({
      personId,
      title: "Steady muscle gain",
      goal: "Gain weight and muscle with four practical meals each day.",
      calorieTarget: 2600,
      proteinTarget: 120,
      mealsPerDay: 4,
      startDate: addDays(weekStart, -21),
      status: "active",
    })
    .returning();
  if (!nutritionPlan) {
    throw new FitnessServiceError(
      "INTERNAL",
      "The starter nutrition plan could not be prepared.",
    );
  }

  const mealRows = await tx
    .insert(meals)
    .values(
      starterMeals.map((meal) => ({
        personId,
        title: meal.title,
        description: meal.description,
        caloriesPerServing: meal.calories,
        proteinPerServing: meal.protein,
        preparationMinutes: meal.minutes,
        servings: meal.servings,
        favourite: meal.favourite,
        tags: [...meal.tags],
        dietaryNotes: meal.dietaryNotes,
      })),
    )
    .returning();
  const mealByTitle = new Map(mealRows.map((meal) => [meal.title, meal]));

  const ingredientRows = mealRows.flatMap((meal) =>
    (starterIngredients[meal.title] ?? []).map((ingredient, position) => ({
      mealId: meal.id,
      ingredientName: ingredient.name,
      quantity: ingredient.quantity.toFixed(2),
      unit: ingredient.unit,
      optional: ingredient.optional ?? false,
      position,
    })),
  );
  if (ingredientRows.length > 0) {
    await tx.insert(mealIngredients).values(ingredientRows);
  }
  const stepRows = mealRows.flatMap((meal) =>
    (starterSteps[meal.title] ?? []).map((instruction, position) => ({
      mealId: meal.id,
      instruction,
      position,
    })),
  );
  if (stepRows.length > 0) await tx.insert(mealSteps).values(stepRows);

  const nutritionDates = Array.from({ length: 14 }, (_, index) =>
    addDays(weekStart, index - 7),
  );
  const dailyRows = await tx
    .insert(dailyNutritionPlans)
    .values(
      nutritionDates.map((day) => {
        const weekdayIndex = (dateAtNoon(day).getUTCDay() + 6) % 7;
        const isRest = starterSchedule[weekdayIndex]?.type === "rest";
        return {
          nutritionPlanId: nutritionPlan.id,
          personId,
          date: day,
          calorieTarget: isRest ? 2500 : 2600,
          proteinTarget: 120,
        };
      }),
    )
    .returning();

  const plannedMealTemplates: Array<{
    title: string;
    slot: MealSlot;
  }> = [
    { title: "Eggs and sourdough", slot: "breakfast" },
    { title: "Chicken rice bowl", slot: "lunch" },
    { title: "Banana peanut-butter shake", slot: "snack" },
    { title: "Salmon pasta", slot: "dinner" },
  ];
  await tx.insert(plannedMeals).values(
    dailyRows.flatMap((day) =>
      plannedMealTemplates.map((template, position) => {
        const meal = mealByTitle.get(template.title);
        if (!meal) {
          throw new FitnessServiceError(
            "INTERNAL",
            "A starter meal could not be prepared.",
          );
        }
        const status =
          day.date < date || (day.date === date && position < 3)
            ? ("eaten" as const)
            : ("planned" as const);
        return {
          dailyNutritionPlanId: day.id,
          mealId: meal.id,
          slot: template.slot,
          servings: "1",
          position,
          status,
        };
      }),
    ),
  );

  await tx.insert(weightEntries).values(
    [59, 59.15, 59.3, 59.45, 59.62, 59.8].map((weight, index) => ({
      personId,
      weight: weight.toFixed(2),
      measuredAt: new Date(`${addDays(date, (index - 5) * 7)}T07:30:00.000Z`),
    })),
  );

  await tx.insert(fitnessGoals).values([
    {
      personId,
      title: "Reach 65 kg",
      type: "weight",
      startingValue: "59.00",
      targetValue: "65.00",
      unit: "kg",
      status: "active",
    },
    {
      personId,
      title: "Train three times per week",
      type: "training_consistency",
      startingValue: "0",
      targetValue: "3",
      unit: "sessions / week",
      status: "active",
    },
    {
      personId,
      title: "Run 10 km comfortably",
      type: "running_distance",
      startingValue: "4.00",
      targetValue: "10.00",
      unit: "km",
      status: "active",
    },
    {
      personId,
      title: "Complete a half marathon",
      type: "running_event",
      startingValue: "4.00",
      targetValue: "21.10",
      unit: "km",
      status: "active",
    },
  ]);
}

async function buildDashboard(
  person: typeof people.$inferSelect,
  isCurrentUser: boolean,
  date: string,
) {
  const weekDates = getWeekDates(date);
  const weekStart = weekDates[0]!;
  const weekEnd = weekDates[6]!;
  const historyStart = addDays(date, -84);
  const adherenceStart = addDays(date, -27);

  const [
    profileRows,
    goalRows,
    trainingPlanRows,
    workoutRows,
    workoutSessionRows,
    runRows,
    nutritionPlanRows,
    dailyRows,
    mealRows,
    weightRows,
  ] = await Promise.all([
    db
      .select()
      .from(fitnessProfiles)
      .where(eq(fitnessProfiles.personId, person.id))
      .limit(1),
    db
      .select()
      .from(fitnessGoals)
      .where(eq(fitnessGoals.personId, person.id))
      .orderBy(asc(fitnessGoals.createdAt)),
    db
      .select()
      .from(trainingPlans)
      .where(eq(trainingPlans.personId, person.id))
      .orderBy(desc(trainingPlans.startDate)),
    db
      .select()
      .from(plannedWorkouts)
      .where(
        and(
          eq(plannedWorkouts.personId, person.id),
          gte(plannedWorkouts.plannedDate, historyStart),
          lte(plannedWorkouts.plannedDate, weekEnd),
        ),
      )
      .orderBy(asc(plannedWorkouts.plannedDate), asc(plannedWorkouts.position)),
    db
      .select()
      .from(workoutSessions)
      .where(eq(workoutSessions.personId, person.id))
      .orderBy(desc(workoutSessions.completedAt)),
    db
      .select()
      .from(runSessions)
      .where(eq(runSessions.personId, person.id))
      .orderBy(desc(runSessions.completedAt)),
    db
      .select()
      .from(nutritionPlans)
      .where(eq(nutritionPlans.personId, person.id))
      .orderBy(desc(nutritionPlans.startDate)),
    db
      .select()
      .from(dailyNutritionPlans)
      .where(
        and(
          eq(dailyNutritionPlans.personId, person.id),
          gte(dailyNutritionPlans.date, adherenceStart),
          lte(dailyNutritionPlans.date, weekEnd),
        ),
      )
      .orderBy(asc(dailyNutritionPlans.date)),
    db
      .select()
      .from(meals)
      .where(eq(meals.personId, person.id))
      .orderBy(desc(meals.favourite), asc(meals.title)),
    db
      .select()
      .from(weightEntries)
      .where(eq(weightEntries.personId, person.id))
      .orderBy(asc(weightEntries.measuredAt)),
  ]);

  const workoutIds = workoutRows.map((workout) => workout.id);
  const sessionIds = workoutSessionRows.map((session) => session.id);
  const mealIds = mealRows.map((meal) => meal.id);
  const dayIds = dailyRows.map((day) => day.id);
  const [
    prescriptionRows,
    setRows,
    exerciseRows,
    ingredientRows,
    stepRows,
    planMealRows,
  ] = await Promise.all([
    workoutIds.length === 0
      ? []
      : db
          .select()
          .from(plannedExercises)
          .where(inArray(plannedExercises.plannedWorkoutId, workoutIds))
          .orderBy(asc(plannedExercises.position)),
    sessionIds.length === 0
      ? []
      : db
          .select()
          .from(exerciseSets)
          .where(inArray(exerciseSets.workoutSessionId, sessionIds)),
    db
      .select()
      .from(strengthExercises)
      .where(eq(strengthExercises.personId, person.id))
      .orderBy(asc(strengthExercises.name)),
    mealIds.length === 0
      ? []
      : db
          .select()
          .from(mealIngredients)
          .where(inArray(mealIngredients.mealId, mealIds))
          .orderBy(asc(mealIngredients.position)),
    mealIds.length === 0
      ? []
      : db
          .select()
          .from(mealSteps)
          .where(inArray(mealSteps.mealId, mealIds))
          .orderBy(asc(mealSteps.position)),
    dayIds.length === 0
      ? []
      : db
          .select()
          .from(plannedMeals)
          .where(inArray(plannedMeals.dailyNutritionPlanId, dayIds))
          .orderBy(asc(plannedMeals.position)),
  ]);

  const profile = profileRows[0] ?? null;
  const activeNutritionPlan =
    nutritionPlanRows.find((plan) => plan.status === "active") ?? null;
  const exerciseById = new Map(
    exerciseRows.map((exercise) => [exercise.id, exercise]),
  );
  const mealById = new Map(mealRows.map((meal) => [meal.id, meal]));
  const dayById = new Map(dailyRows.map((day) => [day.id, day]));
  const sessionById = new Map(
    workoutSessionRows.map((session) => [session.id, session]),
  );

  const completedSetsByExercise = new Map<
    string,
    Array<{ row: (typeof setRows)[number]; completedAt: Date }>
  >();
  for (const set of setRows) {
    const session = sessionById.get(set.workoutSessionId);
    if (!session?.completedAt || !set.completed) continue;
    const values = completedSetsByExercise.get(set.exerciseId) ?? [];
    values.push({ row: set, completedAt: session.completedAt });
    completedSetsByExercise.set(set.exerciseId, values);
  }
  for (const values of completedSetsByExercise.values()) {
    values.sort(
      (left, right) => right.completedAt.getTime() - left.completedAt.getTime(),
    );
  }

  function mapWorkout(workout: (typeof workoutRows)[number]) {
    const prescriptions = prescriptionRows
      .filter((entry) => entry.plannedWorkoutId === workout.id)
      .map((entry) => {
        const exercise = exerciseById.get(entry.exerciseId);
        const previous = completedSetsByExercise.get(entry.exerciseId)?.[0];
        const previousWeight = asNumber(previous?.row.weight ?? null);
        const previousResult = previous
          ? [
              previousWeight === null ? null : `${previousWeight} kg`,
              previous.row.repetitions === null
                ? null
                : `${previous.row.repetitions} reps`,
            ]
              .filter(Boolean)
              .join(" · ") || null
          : null;
        return {
          id: entry.id,
          exerciseId: entry.exerciseId,
          name: exercise?.name ?? "Exercise",
          muscleGroup: exercise?.muscleGroup ?? null,
          equipment: exercise?.equipment ?? null,
          position: entry.position,
          targetSets: entry.targetSets,
          targetRepetitions: entry.targetRepetitions,
          targetWeight: asNumber(entry.targetWeight),
          restSeconds: entry.restSeconds,
          notes: entry.notes,
          previousResult,
        };
      });
    return {
      id: workout.id,
      trainingPlanId: workout.trainingPlanId,
      title: workout.title,
      type: workout.workoutType,
      date: workout.plannedDate,
      estimatedDurationMinutes: workout.estimatedDurationMinutes,
      summary: workout.summary,
      plannedDistanceKm: asNumber(workout.plannedDistanceKm),
      targetPaceSecondsPerKm: workout.targetPaceSecondsPerKm,
      intervalStructure: workout.intervalStructure,
      status: workout.status,
      exercises: prescriptions,
    };
  }

  const workoutViews = workoutRows.map(mapWorkout);
  const workoutViewById = new Map(
    workoutViews.map((workout) => [workout.id, workout]),
  );
  const plannedMealViews = planMealRows.map((plannedMeal) => {
    const meal = plannedMeal.mealId
      ? mealById.get(plannedMeal.mealId)
      : undefined;
    const servings = Number(plannedMeal.servings);
    const baseCalories = plannedMeal.customCalories ?? meal?.caloriesPerServing;
    const baseProtein = plannedMeal.customProtein ?? meal?.proteinPerServing;
    return {
      id: plannedMeal.id,
      mealId: plannedMeal.mealId,
      slot: plannedMeal.slot,
      title: plannedMeal.customTitle ?? meal?.title ?? "Simple meal",
      servings,
      calories:
        baseCalories === null || baseCalories === undefined
          ? null
          : Math.round(baseCalories * servings),
      protein:
        baseProtein === null || baseProtein === undefined
          ? null
          : Math.round(baseProtein * servings),
      preparationMinutes: meal?.preparationMinutes ?? null,
      image: meal?.image ?? null,
      status: plannedMeal.status,
    };
  });
  const plannedMealsByDay = new Map<string, typeof plannedMealViews>();
  planMealRows.forEach((plannedMeal, index) => {
    const day = dayById.get(plannedMeal.dailyNutritionPlanId);
    if (!day) return;
    const values = plannedMealsByDay.get(day.date) ?? [];
    const view = plannedMealViews[index];
    if (view) values.push(view);
    plannedMealsByDay.set(day.date, values);
  });

  const todayDay = dailyRows.find((day) => day.date === date) ?? null;
  const todayMeals = plannedMealsByDay.get(date) ?? [];
  const loggedToday = todayMeals.filter((meal) => meal.status === "eaten");
  const loggedCalories = loggedToday.reduce(
    (total, meal) => total + (meal.calories ?? 0),
    0,
  );
  const loggedProtein = loggedToday.reduce(
    (total, meal) => total + (meal.protein ?? 0),
    0,
  );

  const weekdays = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];
  function workoutForDate(day: string) {
    const candidates = workoutViews.filter((workout) => workout.date === day);
    return (
      candidates.find((workout) => workout.status === "planned") ??
      candidates.find((workout) => workout.status === "completed") ??
      candidates[0] ??
      null
    );
  }
  const week = weekDates.map((day, index) => {
    const workout = workoutForDate(day);
    const dayPlan = dailyRows.find((entry) => entry.date === day) ?? null;
    const dayMeals = plannedMealsByDay.get(day) ?? [];
    const loggedCount = dayMeals.filter(
      (meal) => meal.status !== "planned",
    ).length;
    const mealPlanStatus =
      !dayPlan || dayMeals.length === 0
        ? ("no_plan" as const)
        : loggedCount === 0
          ? ("planned" as const)
          : loggedCount === dayMeals.length
            ? ("complete" as const)
            : ("partly_logged" as const);
    return {
      date: day,
      weekday: weekdays[index]!,
      shortDate: new Intl.DateTimeFormat("en", {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      }).format(dateAtNoon(day)),
      isToday: day === date,
      workout,
      calorieTarget: dayPlan?.calorieTarget ?? null,
      mealPlanStatus,
      completed:
        (workout === null ||
          workout.type === "rest" ||
          workout.status === "completed" ||
          workout.status === "skipped") &&
        (mealPlanStatus === "complete" || mealPlanStatus === "no_plan"),
    };
  });

  const runByWorkoutId = new Map(
    runRows
      .filter((run) => run.plannedWorkoutId)
      .map((run) => [run.plannedWorkoutId!, run]),
  );
  const recentSessions = workoutRows
    .filter(
      (workout) =>
        workout.status === "completed" && workout.workoutType !== "rest",
    )
    .sort((left, right) => right.plannedDate.localeCompare(left.plannedDate))
    .slice(0, 8)
    .map((workout) => {
      const run = runByWorkoutId.get(workout.id);
      return {
        id: workout.id,
        title: workout.title,
        type: workout.workoutType,
        date: workout.plannedDate,
        status: workout.status,
        actualDistanceKm: asNumber(run?.actualDistanceKm ?? null),
        durationMinutes:
          run?.durationSeconds !== null && run?.durationSeconds !== undefined
            ? Math.max(1, Math.round(run.durationSeconds / 60))
            : workout.estimatedDurationMinutes,
        averagePaceSecondsPerKm: run?.averagePaceSecondsPerKm ?? null,
      };
    });

  const completedRuns = runRows.filter(
    (run) => run.completedAt !== null && run.actualDistanceKm !== null,
  );
  const longestDistanceKm = completedRuns.reduce(
    (maximum, run) => Math.max(maximum, Number(run.actualDistanceKm)),
    0,
  );
  const recentPaces = completedRuns
    .filter((run) => run.averagePaceSecondsPerKm !== null)
    .slice(0, 4)
    .map((run) => run.averagePaceSecondsPerKm!);
  const recentAveragePaceSecondsPerKm =
    recentPaces.length === 0
      ? null
      : Math.round(
          recentPaces.reduce((total, pace) => total + pace, 0) /
            recentPaces.length,
        );
  const weeklyDistanceKm = round(
    completedRuns
      .filter((run) => {
        if (!run.completedAt) return false;
        const completedDate = formatDate(run.completedAt);
        return completedDate >= weekStart && completedDate <= weekEnd;
      })
      .reduce((total, run) => total + Number(run.actualDistanceKm), 0),
    2,
  );

  const strengthProgress = [...completedSetsByExercise.entries()]
    .flatMap(([exerciseId, values]) => {
      const exercise = exerciseById.get(exerciseId);
      const weighted = values.filter((value) => value.row.weight !== null);
      const current = weighted[0];
      if (!exercise || !current?.row.weight) return [];
      const previous = weighted.find(
        (value) => value.completedAt < current.completedAt,
      );
      const currentWeight = Number(current.row.weight);
      const previousWeight = previous?.row.weight
        ? Number(previous.row.weight)
        : null;
      return [
        {
          exerciseId,
          name: exercise.name,
          currentWeight,
          previousWeight,
          unit: profile?.preferredWeightUnit ?? "kg",
          direction:
            previousWeight === null || currentWeight === previousWeight
              ? ("steady" as const)
              : currentWeight > previousWeight
                ? ("up" as const)
                : ("down" as const),
        },
      ];
    })
    .slice(0, 4);

  const latestWeight = weightRows.at(-1);
  const firstWeight = weightRows[0];
  const completedThisWeek = workoutRows.filter(
    (workout) =>
      workout.plannedDate >= weekStart &&
      workout.plannedDate <= weekEnd &&
      workout.workoutType !== "rest" &&
      workout.status === "completed",
  ).length;
  const maximumStrength = setRows.reduce(
    (maximum, set) => Math.max(maximum, Number(set.weight ?? 0)),
    0,
  );

  function currentGoalValue(type: GoalType) {
    if (type === "weight")
      return latestWeight ? Number(latestWeight.weight) : null;
    if (type === "training_consistency") return completedThisWeek;
    if (type === "strength") return maximumStrength || null;
    return longestDistanceKm || null;
  }

  const goals = goalRows.map((goal) => {
    const startingValue = asNumber(goal.startingValue);
    const targetValue = Number(goal.targetValue);
    const currentValue = currentGoalValue(goal.type);
    const progress =
      currentValue === null
        ? null
        : startingValue !== null && startingValue !== targetValue
          ? clamp(
              ((currentValue - startingValue) / (targetValue - startingValue)) *
                100,
            )
          : clamp((currentValue / targetValue) * 100);
    return {
      id: goal.id,
      title: goal.title,
      type: goal.type,
      startingValue,
      targetValue,
      currentValue,
      unit: goal.unit,
      targetDate: goal.targetDate,
      status: goal.status,
      progress: progress === null ? null : round(progress),
    };
  });
  const weightGoal = goals.find((goal) => goal.type === "weight");

  const consistencyStart = addDays(date, -27);
  const consistencyWorkouts = workoutRows.filter(
    (workout) =>
      workout.plannedDate >= consistencyStart &&
      workout.plannedDate <= date &&
      workout.workoutType !== "rest" &&
      workout.status !== "skipped",
  );
  const adherenceDays = dailyRows.filter(
    (day) => day.date >= addDays(date, -6) && day.date <= date,
  );
  const nutritionDaysOnTarget = adherenceDays.filter((day) => {
    const eatenCalories = (plannedMealsByDay.get(day.date) ?? [])
      .filter((meal) => meal.status === "eaten")
      .reduce((total, meal) => total + (meal.calories ?? 0), 0);
    return eatenCalories >= day.calorieTarget * 0.9;
  }).length;

  const weekFormatter = new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

  return {
    person: {
      id: person.id,
      preferredName: person.preferredName,
      isCurrentUser,
    },
    date,
    weekLabel: `${weekFormatter.format(dateAtNoon(weekStart))} – ${weekFormatter.format(dateAtNoon(weekEnd))}`,
    profile: profile
      ? {
          heightCm: profile.heightCm,
          preferredWeightUnit: profile.preferredWeightUnit,
          preferredDistanceUnit: profile.preferredDistanceUnit,
          activityLevel: profile.activityLevel,
          notes: profile.notes,
        }
      : null,
    today: {
      workout: workoutForDate(date),
      meals: todayMeals,
      targets: {
        calorieTarget:
          todayDay?.calorieTarget ?? activeNutritionPlan?.calorieTarget ?? 0,
        proteinTarget:
          todayDay?.proteinTarget ?? activeNutritionPlan?.proteinTarget ?? 0,
        loggedCalories,
        loggedProtein,
      },
    },
    week,
    training: {
      plans: trainingPlanRows.map((plan) => ({
        id: plan.id,
        title: plan.title,
        type: plan.type,
        goal: plan.goal,
        weeklyFrequency: plan.weeklyFrequency,
        startDate: plan.startDate,
        endDate: plan.endDate,
        status: plan.status,
      })),
      recentSessions,
    },
    nutrition: {
      activePlan: activeNutritionPlan
        ? {
            id: activeNutritionPlan.id,
            title: activeNutritionPlan.title,
            goal: activeNutritionPlan.goal,
            calorieTarget: activeNutritionPlan.calorieTarget,
            proteinTarget: activeNutritionPlan.proteinTarget,
            mealsPerDay: activeNutritionPlan.mealsPerDay,
            startDate: activeNutritionPlan.startDate,
            endDate: activeNutritionPlan.endDate,
            status: activeNutritionPlan.status,
          }
        : null,
    },
    meals: mealRows.map((meal) => ({
      id: meal.id,
      title: meal.title,
      description: meal.description,
      image: meal.image,
      caloriesPerServing: meal.caloriesPerServing,
      proteinPerServing: meal.proteinPerServing,
      preparationMinutes: meal.preparationMinutes,
      servings: meal.servings,
      favourite: meal.favourite,
      tags: meal.tags,
      dietaryNotes: meal.dietaryNotes,
      ingredients: ingredientRows
        .filter((ingredient) => ingredient.mealId === meal.id)
        .map((ingredient) => ({
          id: ingredient.id,
          name: ingredient.ingredientName,
          quantity: asNumber(ingredient.quantity),
          unit: ingredient.unit,
          optional: ingredient.optional,
          position: ingredient.position,
        })),
      steps: stepRows
        .filter((step) => step.mealId === meal.id)
        .map((step) => ({
          id: step.id,
          instruction: step.instruction,
          position: step.position,
        })),
    })),
    goals,
    progress: {
      weight:
        latestWeight && firstWeight
          ? {
              current: Number(latestWeight.weight),
              starting: Number(firstWeight.weight),
              target: weightGoal?.targetValue ?? null,
              unit: profile?.preferredWeightUnit ?? "kg",
              changeSinceStart: round(
                Number(latestWeight.weight) - Number(firstWeight.weight),
                2,
              ),
              trend: weightRows.slice(-12).map((entry) => ({
                date: formatDate(entry.measuredAt),
                value: Number(entry.weight),
              })),
            }
          : null,
      strength: strengthProgress,
      running: {
        longestDistanceKm: round(longestDistanceKm, 2),
        recentAveragePaceSecondsPerKm,
        weeklyDistanceKm,
        lastRunDate: completedRuns[0]?.completedAt
          ? formatDate(completedRuns[0].completedAt)
          : null,
      },
      consistency: {
        plannedWorkouts: consistencyWorkouts.length,
        completedWorkouts: consistencyWorkouts.filter(
          (workout) => workout.status === "completed",
        ).length,
        nutritionDays: adherenceDays.length,
        nutritionDaysOnTarget,
      },
    },
  };
}

async function ensureDailyPlan(
  tx: DatabaseTransaction,
  personId: string,
  date: string,
) {
  const [existing] = await tx
    .select()
    .from(dailyNutritionPlans)
    .where(
      and(
        eq(dailyNutritionPlans.personId, personId),
        eq(dailyNutritionPlans.date, date),
      ),
    )
    .limit(1);
  if (existing) return existing;

  const [activePlan] = await tx
    .select()
    .from(nutritionPlans)
    .where(
      and(
        eq(nutritionPlans.personId, personId),
        eq(nutritionPlans.status, "active"),
        lte(nutritionPlans.startDate, date),
      ),
    )
    .orderBy(desc(nutritionPlans.startDate))
    .limit(1);
  if (!activePlan) {
    throw new FitnessServiceError(
      "BAD_REQUEST",
      "Set a calorie and protein target before planning meals.",
    );
  }
  const [created] = await tx
    .insert(dailyNutritionPlans)
    .values({
      nutritionPlanId: activePlan.id,
      personId,
      date,
      calorieTarget: activePlan.calorieTarget,
      proteinTarget: activePlan.proteinTarget,
    })
    .onConflictDoNothing()
    .returning();
  if (created) return created;

  const [concurrent] = await tx
    .select()
    .from(dailyNutritionPlans)
    .where(
      and(
        eq(dailyNutritionPlans.personId, personId),
        eq(dailyNutritionPlans.date, date),
      ),
    )
    .limit(1);
  if (!concurrent) {
    throw new FitnessServiceError(
      "INTERNAL",
      "The daily nutrition plan could not be prepared.",
    );
  }
  return concurrent;
}

export const fitnessService = {
  async bootstrap(
    actorUserId: string,
    input: { personId?: string; date: string },
  ) {
    const resolved = await resolvePerson(actorUserId, input.personId);
    return buildDashboard(resolved.person, resolved.isCurrentUser, input.date);
  },

  async setMealStatus(
    actorUserId: string,
    input: {
      plannedMealId: string;
      status: "planned" | "eaten" | "skipped";
    },
  ) {
    const membership = await requireHouseholdMembership(actorUserId);
    const [row] = await db
      .select({ personId: dailyNutritionPlans.personId })
      .from(plannedMeals)
      .innerJoin(
        dailyNutritionPlans,
        eq(plannedMeals.dailyNutritionPlanId, dailyNutritionPlans.id),
      )
      .innerJoin(people, eq(dailyNutritionPlans.personId, people.id))
      .where(
        and(
          eq(plannedMeals.id, input.plannedMealId),
          eq(people.organizationId, membership.organization.id),
        ),
      )
      .limit(1);
    if (!row)
      throw new FitnessServiceError("NOT_FOUND", "Meal plan not found.");

    await db
      .update(plannedMeals)
      .set({ status: input.status, updatedAt: new Date() })
      .where(eq(plannedMeals.id, input.plannedMealId));
    return { ok: true as const };
  },

  async replacePlannedMeal(
    actorUserId: string,
    input: { plannedMealId: string; mealId: string },
  ) {
    const membership = await requireHouseholdMembership(actorUserId);
    const [planned] = await db
      .select({ personId: dailyNutritionPlans.personId })
      .from(plannedMeals)
      .innerJoin(
        dailyNutritionPlans,
        eq(plannedMeals.dailyNutritionPlanId, dailyNutritionPlans.id),
      )
      .innerJoin(people, eq(dailyNutritionPlans.personId, people.id))
      .where(
        and(
          eq(plannedMeals.id, input.plannedMealId),
          eq(people.organizationId, membership.organization.id),
        ),
      )
      .limit(1);
    if (!planned) {
      throw new FitnessServiceError("NOT_FOUND", "Meal plan not found.");
    }

    const replacement = await requireMeal(actorUserId, input.mealId);
    if (replacement.personId !== planned.personId) {
      throw new FitnessServiceError(
        "BAD_REQUEST",
        "Choose a meal that belongs to the same person.",
      );
    }

    await db
      .update(plannedMeals)
      .set({
        mealId: replacement.id,
        customTitle: null,
        customCalories: null,
        customProtein: null,
        status: "planned",
        updatedAt: new Date(),
      })
      .where(eq(plannedMeals.id, input.plannedMealId));
    return { ok: true as const };
  },

  async setWorkoutStatus(
    actorUserId: string,
    input: { workoutId: string; status: "planned" | "skipped" },
  ) {
    await requireWorkout(actorUserId, input.workoutId);
    await db
      .update(plannedWorkouts)
      .set({ status: input.status, updatedAt: new Date() })
      .where(eq(plannedWorkouts.id, input.workoutId));
    return { ok: true as const };
  },

  async completeWorkout(
    actorUserId: string,
    input: {
      workoutId: string;
      perceivedEffort: number | null;
      actualDistanceKm: number | null;
      durationMinutes: number | null;
      notes: string | null;
      exerciseLogs: Array<{
        exerciseId: string;
        repetitions: number | null;
        weight: number | null;
        completed: boolean;
      }>;
    },
  ) {
    const workout = await requireWorkout(actorUserId, input.workoutId);
    if (workout.status === "completed") return { ok: true as const };

    await db.transaction(async (tx) => {
      if (workout.workoutType === "strength") {
        const [session] = await tx
          .insert(workoutSessions)
          .values({
            personId: workout.personId,
            plannedWorkoutId: workout.id,
            startedAt: new Date(),
            completedAt: new Date(),
            perceivedEffort: input.perceivedEffort,
            notes: optionalText(input.notes),
          })
          .returning();
        if (!session) {
          throw new FitnessServiceError(
            "INTERNAL",
            "The workout could not be recorded.",
          );
        }
        if (input.exerciseLogs.length > 0) {
          const setCountByExercise = new Map<string, number>();
          await tx.insert(exerciseSets).values(
            input.exerciseLogs.map((log) => {
              const setNumber =
                (setCountByExercise.get(log.exerciseId) ?? 0) + 1;
              setCountByExercise.set(log.exerciseId, setNumber);
              return {
                workoutSessionId: session.id,
                exerciseId: log.exerciseId,
                setNumber,
                repetitions: log.repetitions,
                weight: log.weight === null ? null : log.weight.toFixed(2),
                completed: log.completed,
              };
            }),
          );
        }
      } else if (workout.workoutType !== "rest") {
        const durationSeconds =
          input.durationMinutes === null ? null : input.durationMinutes * 60;
        const averagePaceSecondsPerKm =
          durationSeconds !== null && input.actualDistanceKm !== null
            ? Math.round(durationSeconds / input.actualDistanceKm)
            : null;
        await tx.insert(runSessions).values({
          personId: workout.personId,
          plannedWorkoutId: workout.id,
          runType: workout.workoutType,
          plannedDistanceKm: workout.plannedDistanceKm,
          actualDistanceKm:
            input.actualDistanceKm === null
              ? null
              : input.actualDistanceKm.toFixed(2),
          durationSeconds,
          averagePaceSecondsPerKm,
          perceivedEffort: input.perceivedEffort,
          completedAt: new Date(),
          notes: optionalText(input.notes),
        });
      }

      await tx
        .update(plannedWorkouts)
        .set({ status: "completed", updatedAt: new Date() })
        .where(eq(plannedWorkouts.id, workout.id));
    });
    return { ok: true as const };
  },

  async logWeight(
    actorUserId: string,
    input: {
      personId: string;
      weight: number;
      date: string;
      notes: string | null;
    },
  ) {
    await resolvePerson(actorUserId, input.personId);
    const [entry] = await db
      .insert(weightEntries)
      .values({
        personId: input.personId,
        weight: input.weight.toFixed(2),
        measuredAt: dateAtNoon(input.date),
        notes: optionalText(input.notes),
      })
      .returning({ id: weightEntries.id });
    if (!entry)
      throw new FitnessServiceError("INTERNAL", "Weight was not saved.");
    return entry;
  },

  async createTrainingPlan(
    actorUserId: string,
    input: {
      personId: string;
      title: string;
      type: "strength" | "running" | "mixed";
      weeklyFrequency: number;
      goal: string | null;
      startDate: string;
      endDate: string | null;
    },
  ) {
    await resolvePerson(actorUserId, input.personId);
    if (input.endDate && input.endDate < input.startDate) {
      throw new FitnessServiceError(
        "BAD_REQUEST",
        "The end date must come after the start date.",
      );
    }
    const [plan] = await db
      .insert(trainingPlans)
      .values({
        personId: input.personId,
        title: input.title,
        type: input.type,
        goal: optionalText(input.goal),
        weeklyFrequency: input.weeklyFrequency,
        startDate: input.startDate,
        endDate: input.endDate,
        status: "active",
      })
      .returning({ id: trainingPlans.id });
    if (!plan) throw new FitnessServiceError("INTERNAL", "Plan was not saved.");
    return plan;
  },

  async createWorkout(
    actorUserId: string,
    input: {
      personId: string;
      trainingPlanId: string | null;
      title: string;
      type: WorkoutType;
      date: string;
      estimatedDurationMinutes: number | null;
      summary: string | null;
      plannedDistanceKm: number | null;
    },
  ) {
    await resolvePerson(actorUserId, input.personId);
    if (input.trainingPlanId) {
      const [plan] = await db
        .select({ id: trainingPlans.id })
        .from(trainingPlans)
        .where(
          and(
            eq(trainingPlans.id, input.trainingPlanId),
            eq(trainingPlans.personId, input.personId),
          ),
        )
        .limit(1);
      if (!plan) {
        throw new FitnessServiceError(
          "BAD_REQUEST",
          "Choose a training plan for the same person.",
        );
      }
    }
    const [workout] = await db
      .insert(plannedWorkouts)
      .values({
        personId: input.personId,
        trainingPlanId: input.trainingPlanId,
        title: input.title,
        workoutType: input.type,
        plannedDate: input.date,
        estimatedDurationMinutes: input.estimatedDurationMinutes,
        summary: optionalText(input.summary),
        plannedDistanceKm:
          input.plannedDistanceKm === null
            ? null
            : input.plannedDistanceKm.toFixed(2),
        status: "planned",
      })
      .returning({ id: plannedWorkouts.id });
    if (!workout) {
      throw new FitnessServiceError("INTERNAL", "Workout was not saved.");
    }
    return workout;
  },

  async moveWorkout(
    actorUserId: string,
    input: { workoutId: string; date: string },
  ) {
    await requireWorkout(actorUserId, input.workoutId);
    await db
      .update(plannedWorkouts)
      .set({ plannedDate: input.date, updatedAt: new Date() })
      .where(eq(plannedWorkouts.id, input.workoutId));
    return { ok: true as const };
  },

  async createNutritionPlan(
    actorUserId: string,
    input: {
      personId: string;
      title: string;
      calorieTarget: number;
      proteinTarget: number;
      mealsPerDay: number;
      goal: string | null;
      startDate: string;
      endDate: string | null;
    },
  ) {
    await resolvePerson(actorUserId, input.personId);
    if (input.endDate && input.endDate < input.startDate) {
      throw new FitnessServiceError(
        "BAD_REQUEST",
        "The end date must come after the start date.",
      );
    }
    return db.transaction(async (tx) => {
      await tx
        .update(nutritionPlans)
        .set({ status: "paused", updatedAt: new Date() })
        .where(
          and(
            eq(nutritionPlans.personId, input.personId),
            eq(nutritionPlans.status, "active"),
          ),
        );
      const [plan] = await tx
        .insert(nutritionPlans)
        .values({
          personId: input.personId,
          title: input.title,
          calorieTarget: input.calorieTarget,
          proteinTarget: input.proteinTarget,
          mealsPerDay: input.mealsPerDay,
          goal: optionalText(input.goal),
          startDate: input.startDate,
          endDate: input.endDate,
          status: "active",
        })
        .returning({ id: nutritionPlans.id });
      if (!plan) {
        throw new FitnessServiceError("INTERNAL", "Plan was not saved.");
      }
      return plan;
    });
  },

  async createMeal(
    actorUserId: string,
    input: {
      personId: string;
      title: string;
      description: string | null;
      caloriesPerServing: number | null;
      proteinPerServing: number | null;
      preparationMinutes: number | null;
      servings: number;
      favourite: boolean;
      tags: string[];
      dietaryNotes: string | null;
      ingredients: Array<{
        name: string;
        quantity: number | null;
        unit: string | null;
        optional: boolean;
      }>;
      steps: string[];
    },
  ) {
    await resolvePerson(actorUserId, input.personId);
    return db.transaction(async (tx) => {
      const [meal] = await tx
        .insert(meals)
        .values({
          personId: input.personId,
          title: input.title,
          description: optionalText(input.description),
          caloriesPerServing: input.caloriesPerServing,
          proteinPerServing: input.proteinPerServing,
          preparationMinutes: input.preparationMinutes,
          servings: input.servings,
          favourite: input.favourite,
          tags: [...new Set(input.tags)],
          dietaryNotes: optionalText(input.dietaryNotes),
        })
        .returning({ id: meals.id });
      if (!meal)
        throw new FitnessServiceError("INTERNAL", "Meal was not saved.");
      if (input.ingredients.length > 0) {
        await tx.insert(mealIngredients).values(
          input.ingredients.map((ingredient, position) => ({
            mealId: meal.id,
            ingredientName: ingredient.name,
            quantity:
              ingredient.quantity === null
                ? null
                : ingredient.quantity.toFixed(2),
            unit: optionalText(ingredient.unit),
            optional: ingredient.optional,
            position,
          })),
        );
      }
      if (input.steps.length > 0) {
        await tx.insert(mealSteps).values(
          input.steps.map((instruction, position) => ({
            mealId: meal.id,
            instruction,
            position,
          })),
        );
      }
      return meal;
    });
  },

  async addMealToDay(
    actorUserId: string,
    input: {
      personId: string;
      mealId: string;
      date: string;
      slot: MealSlot;
    },
  ) {
    await resolvePerson(actorUserId, input.personId);
    const meal = await requireMeal(actorUserId, input.mealId);
    if (meal.personId !== input.personId) {
      throw new FitnessServiceError(
        "BAD_REQUEST",
        "Choose a meal that belongs to the same person.",
      );
    }
    return db.transaction(async (tx) => {
      const day = await ensureDailyPlan(tx, input.personId, input.date);
      const [last] = await tx
        .select({ position: plannedMeals.position })
        .from(plannedMeals)
        .where(eq(plannedMeals.dailyNutritionPlanId, day.id))
        .orderBy(desc(plannedMeals.position))
        .limit(1);
      const [created] = await tx
        .insert(plannedMeals)
        .values({
          dailyNutritionPlanId: day.id,
          mealId: input.mealId,
          slot: input.slot,
          servings: "1",
          position: (last?.position ?? -1) + 1,
          status: "planned",
        })
        .returning({ id: plannedMeals.id });
      if (!created) {
        throw new FitnessServiceError("INTERNAL", "Meal was not added.");
      }
      return created;
    });
  },

  async copyDayMeals(
    actorUserId: string,
    input: { personId: string; sourceDate: string; targetDate: string },
  ) {
    await resolvePerson(actorUserId, input.personId);
    if (input.sourceDate === input.targetDate) {
      throw new FitnessServiceError(
        "BAD_REQUEST",
        "Choose a different day to copy meals to.",
      );
    }
    await db.transaction(async (tx) => {
      const [sourceDay] = await tx
        .select()
        .from(dailyNutritionPlans)
        .where(
          and(
            eq(dailyNutritionPlans.personId, input.personId),
            eq(dailyNutritionPlans.date, input.sourceDate),
          ),
        )
        .limit(1);
      if (!sourceDay) {
        throw new FitnessServiceError(
          "NOT_FOUND",
          "No meals are planned on the source day.",
        );
      }
      const sourceMeals = await tx
        .select()
        .from(plannedMeals)
        .where(eq(plannedMeals.dailyNutritionPlanId, sourceDay.id))
        .orderBy(asc(plannedMeals.position));
      if (sourceMeals.length === 0) {
        throw new FitnessServiceError(
          "NOT_FOUND",
          "No meals are planned on the source day.",
        );
      }
      const targetDay = await ensureDailyPlan(
        tx,
        input.personId,
        input.targetDate,
      );
      const [last] = await tx
        .select({ position: plannedMeals.position })
        .from(plannedMeals)
        .where(eq(plannedMeals.dailyNutritionPlanId, targetDay.id))
        .orderBy(desc(plannedMeals.position))
        .limit(1);
      const offset = (last?.position ?? -1) + 1;
      await tx.insert(plannedMeals).values(
        sourceMeals.map((meal, index) => ({
          dailyNutritionPlanId: targetDay.id,
          mealId: meal.mealId,
          slot: meal.slot,
          customTitle: meal.customTitle,
          servings: meal.servings,
          position: offset + index,
          status: "planned" as const,
          customCalories: meal.customCalories,
          customProtein: meal.customProtein,
          notes: meal.notes,
        })),
      );
    });
    return { ok: true as const };
  },

  async saveGoal(
    actorUserId: string,
    input: {
      personId: string;
      title: string;
      type: GoalType;
      startingValue: number | null;
      targetValue: number;
      unit: string;
      targetDate: string | null;
    },
  ) {
    await resolvePerson(actorUserId, input.personId);
    const [goal] = await db
      .insert(fitnessGoals)
      .values({
        personId: input.personId,
        title: input.title,
        type: input.type,
        startingValue:
          input.startingValue === null ? null : input.startingValue.toFixed(2),
        targetValue: input.targetValue.toFixed(2),
        unit: input.unit,
        targetDate: input.targetDate,
        status: "active",
      })
      .returning({ id: fitnessGoals.id });
    if (!goal) throw new FitnessServiceError("INTERNAL", "Goal was not saved.");
    return goal;
  },
};

export const fitnessFormatting = {
  paceLabel,
};
