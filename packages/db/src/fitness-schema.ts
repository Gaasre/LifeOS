import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { people } from "./domain-schema";

export const fitnessGoalType = pgEnum("fitness_goal_type", [
  "weight",
  "training_consistency",
  "strength",
  "running_distance",
  "running_event",
]);

export const fitnessGoalStatus = pgEnum("fitness_goal_status", [
  "active",
  "paused",
  "completed",
]);

export const fitnessPlanStatus = pgEnum("fitness_plan_status", [
  "active",
  "paused",
  "completed",
]);

export const trainingPlanType = pgEnum("training_plan_type", [
  "strength",
  "running",
  "mixed",
]);

export const fitnessWorkoutType = pgEnum("fitness_workout_type", [
  "strength",
  "easy_run",
  "long_run",
  "intervals",
  "tempo_run",
  "recovery_run",
  "rest",
]);

export const plannedWorkoutStatus = pgEnum("planned_workout_status", [
  "planned",
  "completed",
  "skipped",
]);

export const mealSlot = pgEnum("meal_slot", [
  "breakfast",
  "lunch",
  "snack",
  "dinner",
  "other",
]);

export const plannedMealStatus = pgEnum("planned_meal_status", [
  "planned",
  "eaten",
  "skipped",
]);

/** Person-owned preferences. Current weight is derived from weight entries. */
export const fitnessProfiles = pgTable(
  "fitness_profiles",
  {
    personId: uuid("person_id")
      .primaryKey()
      .references(() => people.id, { onDelete: "cascade" }),
    heightCm: integer("height_cm"),
    preferredWeightUnit: text("preferred_weight_unit").notNull().default("kg"),
    preferredDistanceUnit: text("preferred_distance_unit")
      .notNull()
      .default("km"),
    activityLevel: text("activity_level"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "fitness_profiles_height_check",
      sql`${table.heightCm} is null or (${table.heightCm} >= 50 and ${table.heightCm} <= 280)`,
    ),
  ],
);

/** Outcome goals; current values are derived from observations and sessions. */
export const fitnessGoals = pgTable(
  "fitness_goals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    personId: uuid("person_id")
      .notNull()
      .references(() => people.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    type: fitnessGoalType("type").notNull(),
    startingValue: numeric("starting_value", {
      precision: 10,
      scale: 2,
    }),
    targetValue: numeric("target_value", {
      precision: 10,
      scale: 2,
    }).notNull(),
    unit: text("unit").notNull(),
    targetDate: date("target_date"),
    status: fitnessGoalStatus("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("fitness_goals_person_status_idx").on(table.personId, table.status),
    check("fitness_goals_target_check", sql`${table.targetValue} > 0`),
  ],
);

/** Effective-dated strength, running, or mixed training intent. */
export const trainingPlans = pgTable(
  "training_plans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    personId: uuid("person_id")
      .notNull()
      .references(() => people.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    type: trainingPlanType("type").notNull(),
    goal: text("goal"),
    weeklyFrequency: integer("weekly_frequency").notNull(),
    startDate: date("start_date").notNull(),
    endDate: date("end_date"),
    status: fitnessPlanStatus("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("training_plans_person_status_idx").on(table.personId, table.status),
    check(
      "training_plans_frequency_check",
      sql`${table.weeklyFrequency} >= 1 and ${table.weeklyFrequency} <= 14`,
    ),
    check(
      "training_plans_date_range_check",
      sql`${table.endDate} is null or ${table.endDate} >= ${table.startDate}`,
    ),
  ],
);

/** A dated session. Standalone workouts are allowed without a parent plan. */
export const plannedWorkouts = pgTable(
  "planned_workouts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    trainingPlanId: uuid("training_plan_id").references(
      () => trainingPlans.id,
      { onDelete: "set null" },
    ),
    personId: uuid("person_id")
      .notNull()
      .references(() => people.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    workoutType: fitnessWorkoutType("workout_type").notNull(),
    plannedDate: date("planned_date").notNull(),
    estimatedDurationMinutes: integer("estimated_duration_minutes"),
    summary: text("summary"),
    plannedDistanceKm: numeric("planned_distance_km", {
      precision: 7,
      scale: 2,
    }),
    targetPaceSecondsPerKm: integer("target_pace_seconds_per_km"),
    intervalStructure: text("interval_structure"),
    position: integer("position").notNull().default(0),
    status: plannedWorkoutStatus("status").notNull().default("planned"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("planned_workouts_person_date_idx").on(
      table.personId,
      table.plannedDate,
    ),
    index("planned_workouts_plan_idx").on(table.trainingPlanId),
    check(
      "planned_workouts_duration_check",
      sql`${table.estimatedDurationMinutes} is null or ${table.estimatedDurationMinutes} > 0`,
    ),
    check(
      "planned_workouts_distance_check",
      sql`${table.plannedDistanceKm} is null or ${table.plannedDistanceKm} > 0`,
    ),
    check("planned_workouts_position_check", sql`${table.position} >= 0`),
  ],
);

/** A small reusable exercise library, scoped to a person. */
export const strengthExercises = pgTable(
  "strength_exercises",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    personId: uuid("person_id")
      .notNull()
      .references(() => people.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    muscleGroup: text("muscle_group"),
    equipment: text("equipment"),
    instructions: text("instructions"),
    custom: boolean("custom").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("strength_exercises_person_name_uidx").on(
      table.personId,
      table.name,
    ),
  ],
);

/** Ordered exercise prescription for a strength workout. */
export const plannedExercises = pgTable(
  "planned_exercises",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    plannedWorkoutId: uuid("planned_workout_id")
      .notNull()
      .references(() => plannedWorkouts.id, { onDelete: "cascade" }),
    exerciseId: uuid("exercise_id")
      .notNull()
      .references(() => strengthExercises.id),
    position: integer("position").notNull().default(0),
    targetSets: integer("target_sets").notNull(),
    targetRepetitions: text("target_repetitions").notNull(),
    targetWeight: numeric("target_weight", { precision: 7, scale: 2 }),
    restSeconds: integer("rest_seconds"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("planned_exercises_workout_position_uidx").on(
      table.plannedWorkoutId,
      table.position,
    ),
    index("planned_exercises_exercise_idx").on(table.exerciseId),
    check(
      "planned_exercises_sets_check",
      sql`${table.targetSets} >= 1 and ${table.targetSets} <= 20`,
    ),
    check(
      "planned_exercises_weight_check",
      sql`${table.targetWeight} is null or ${table.targetWeight} >= 0`,
    ),
    check(
      "planned_exercises_rest_check",
      sql`${table.restSeconds} is null or ${table.restSeconds} >= 0`,
    ),
  ],
);

export const workoutSessions = pgTable(
  "workout_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    personId: uuid("person_id")
      .notNull()
      .references(() => people.id, { onDelete: "cascade" }),
    plannedWorkoutId: uuid("planned_workout_id").references(
      () => plannedWorkouts.id,
      { onDelete: "set null" },
    ),
    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    perceivedEffort: integer("perceived_effort"),
    notes: text("notes"),
  },
  (table) => [
    index("workout_sessions_person_completed_idx").on(
      table.personId,
      table.completedAt,
    ),
    index("workout_sessions_planned_workout_idx").on(table.plannedWorkoutId),
    check(
      "workout_sessions_effort_check",
      sql`${table.perceivedEffort} is null or (${table.perceivedEffort} >= 1 and ${table.perceivedEffort} <= 10)`,
    ),
  ],
);

export const exerciseSets = pgTable(
  "exercise_sets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workoutSessionId: uuid("workout_session_id")
      .notNull()
      .references(() => workoutSessions.id, { onDelete: "cascade" }),
    exerciseId: uuid("exercise_id")
      .notNull()
      .references(() => strengthExercises.id),
    setNumber: integer("set_number").notNull(),
    repetitions: integer("repetitions"),
    weight: numeric("weight", { precision: 7, scale: 2 }),
    completed: boolean("completed").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("exercise_sets_session_exercise_set_uidx").on(
      table.workoutSessionId,
      table.exerciseId,
      table.setNumber,
    ),
    index("exercise_sets_exercise_idx").on(table.exerciseId),
    check("exercise_sets_number_check", sql`${table.setNumber} >= 1`),
    check(
      "exercise_sets_repetitions_check",
      sql`${table.repetitions} is null or ${table.repetitions} >= 0`,
    ),
    check(
      "exercise_sets_weight_check",
      sql`${table.weight} is null or ${table.weight} >= 0`,
    ),
  ],
);

export const runSessions = pgTable(
  "run_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    personId: uuid("person_id")
      .notNull()
      .references(() => people.id, { onDelete: "cascade" }),
    plannedWorkoutId: uuid("planned_workout_id").references(
      () => plannedWorkouts.id,
      { onDelete: "set null" },
    ),
    runType: fitnessWorkoutType("run_type").notNull(),
    plannedDistanceKm: numeric("planned_distance_km", {
      precision: 7,
      scale: 2,
    }),
    actualDistanceKm: numeric("actual_distance_km", {
      precision: 7,
      scale: 2,
    }),
    durationSeconds: integer("duration_seconds"),
    averagePaceSecondsPerKm: integer("average_pace_seconds_per_km"),
    perceivedEffort: integer("perceived_effort"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("run_sessions_person_completed_idx").on(
      table.personId,
      table.completedAt,
    ),
    index("run_sessions_planned_workout_idx").on(table.plannedWorkoutId),
    check(
      "run_sessions_actual_distance_check",
      sql`${table.actualDistanceKm} is null or ${table.actualDistanceKm} > 0`,
    ),
    check(
      "run_sessions_duration_check",
      sql`${table.durationSeconds} is null or ${table.durationSeconds} > 0`,
    ),
    check(
      "run_sessions_effort_check",
      sql`${table.perceivedEffort} is null or (${table.perceivedEffort} >= 1 and ${table.perceivedEffort} <= 10)`,
    ),
  ],
);

/** Effective-dated calorie, protein, and meal-count targets. */
export const nutritionPlans = pgTable(
  "nutrition_plans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    personId: uuid("person_id")
      .notNull()
      .references(() => people.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    goal: text("goal"),
    calorieTarget: integer("calorie_target").notNull(),
    proteinTarget: integer("protein_target").notNull(),
    mealsPerDay: integer("meals_per_day").notNull(),
    startDate: date("start_date").notNull(),
    endDate: date("end_date"),
    status: fitnessPlanStatus("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("nutrition_plans_person_status_idx").on(table.personId, table.status),
    check(
      "nutrition_plans_calorie_target_check",
      sql`${table.calorieTarget} >= 500 and ${table.calorieTarget} <= 10000`,
    ),
    check(
      "nutrition_plans_protein_target_check",
      sql`${table.proteinTarget} >= 0 and ${table.proteinTarget} <= 1000`,
    ),
    check(
      "nutrition_plans_meal_count_check",
      sql`${table.mealsPerDay} >= 1 and ${table.mealsPerDay} <= 12`,
    ),
    check(
      "nutrition_plans_date_range_check",
      sql`${table.endDate} is null or ${table.endDate} >= ${table.startDate}`,
    ),
  ],
);

export const dailyNutritionPlans = pgTable(
  "daily_nutrition_plans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    nutritionPlanId: uuid("nutrition_plan_id").references(
      () => nutritionPlans.id,
      { onDelete: "set null" },
    ),
    personId: uuid("person_id")
      .notNull()
      .references(() => people.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    calorieTarget: integer("calorie_target").notNull(),
    proteinTarget: integer("protein_target").notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("daily_nutrition_plans_person_date_uidx").on(
      table.personId,
      table.date,
    ),
    index("daily_nutrition_plans_plan_idx").on(table.nutritionPlanId),
    check(
      "daily_nutrition_plans_calorie_target_check",
      sql`${table.calorieTarget} >= 500 and ${table.calorieTarget} <= 10000`,
    ),
    check(
      "daily_nutrition_plans_protein_target_check",
      sql`${table.proteinTarget} >= 0 and ${table.proteinTarget} <= 1000`,
    ),
  ],
);

/** Reusable, person-scoped meals with intentionally manual macro values. */
export const meals = pgTable(
  "meals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    personId: uuid("person_id")
      .notNull()
      .references(() => people.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    image: text("image"),
    caloriesPerServing: integer("calories_per_serving"),
    proteinPerServing: integer("protein_per_serving"),
    preparationMinutes: integer("preparation_minutes"),
    servings: integer("servings").notNull().default(1),
    favourite: boolean("favourite").notNull().default(false),
    tags: text("tags").array().notNull().default([]),
    dietaryNotes: text("dietary_notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("meals_person_favourite_idx").on(table.personId, table.favourite),
    check(
      "meals_calorie_check",
      sql`${table.caloriesPerServing} is null or ${table.caloriesPerServing} >= 0`,
    ),
    check(
      "meals_protein_check",
      sql`${table.proteinPerServing} is null or ${table.proteinPerServing} >= 0`,
    ),
    check(
      "meals_preparation_check",
      sql`${table.preparationMinutes} is null or ${table.preparationMinutes} >= 0`,
    ),
    check("meals_servings_check", sql`${table.servings} >= 1`),
  ],
);

export const mealIngredients = pgTable(
  "meal_ingredients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    mealId: uuid("meal_id")
      .notNull()
      .references(() => meals.id, { onDelete: "cascade" }),
    ingredientName: text("ingredient_name").notNull(),
    quantity: numeric("quantity", { precision: 10, scale: 2 }),
    unit: text("unit"),
    optional: boolean("optional").notNull().default(false),
    position: integer("position").notNull().default(0),
  },
  (table) => [
    unique("meal_ingredients_meal_position_uidx").on(
      table.mealId,
      table.position,
    ),
    check(
      "meal_ingredients_quantity_check",
      sql`${table.quantity} is null or ${table.quantity} > 0`,
    ),
  ],
);

export const mealSteps = pgTable(
  "meal_steps",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    mealId: uuid("meal_id")
      .notNull()
      .references(() => meals.id, { onDelete: "cascade" }),
    instruction: text("instruction").notNull(),
    position: integer("position").notNull().default(0),
  },
  (table) => [
    unique("meal_steps_meal_position_uidx").on(table.mealId, table.position),
  ],
);

export const plannedMeals = pgTable(
  "planned_meals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    dailyNutritionPlanId: uuid("daily_nutrition_plan_id")
      .notNull()
      .references(() => dailyNutritionPlans.id, { onDelete: "cascade" }),
    mealId: uuid("meal_id").references(() => meals.id, {
      onDelete: "set null",
    }),
    slot: mealSlot("slot").notNull(),
    customTitle: text("custom_title"),
    servings: numeric("servings", { precision: 5, scale: 2 })
      .notNull()
      .default("1"),
    position: integer("position").notNull().default(0),
    status: plannedMealStatus("status").notNull().default("planned"),
    customCalories: integer("custom_calories"),
    customProtein: integer("custom_protein"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("planned_meals_day_position_uidx").on(
      table.dailyNutritionPlanId,
      table.position,
    ),
    index("planned_meals_meal_idx").on(table.mealId),
    check(
      "planned_meals_reference_or_title_check",
      sql`${table.mealId} is not null or ${table.customTitle} is not null`,
    ),
    check("planned_meals_servings_check", sql`${table.servings} > 0`),
    check(
      "planned_meals_calorie_check",
      sql`${table.customCalories} is null or ${table.customCalories} >= 0`,
    ),
    check(
      "planned_meals_protein_check",
      sql`${table.customProtein} is null or ${table.customProtein} >= 0`,
    ),
  ],
);

export const weightEntries = pgTable(
  "weight_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    personId: uuid("person_id")
      .notNull()
      .references(() => people.id, { onDelete: "cascade" }),
    weight: numeric("weight", { precision: 6, scale: 2 }).notNull(),
    measuredAt: timestamp("measured_at", { withTimezone: true }).notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("weight_entries_person_measured_idx").on(
      table.personId,
      table.measuredAt,
    ),
    check(
      "weight_entries_weight_check",
      sql`${table.weight} > 0 and ${table.weight} <= 1000`,
    ),
  ],
);

export const fitnessProfilesRelations = relations(
  fitnessProfiles,
  ({ one }) => ({
    person: one(people, {
      fields: [fitnessProfiles.personId],
      references: [people.id],
    }),
  }),
);

export const fitnessGoalsRelations = relations(fitnessGoals, ({ one }) => ({
  person: one(people, {
    fields: [fitnessGoals.personId],
    references: [people.id],
  }),
}));

export const trainingPlansRelations = relations(
  trainingPlans,
  ({ one, many }) => ({
    person: one(people, {
      fields: [trainingPlans.personId],
      references: [people.id],
    }),
    workouts: many(plannedWorkouts),
  }),
);

export const plannedWorkoutsRelations = relations(
  plannedWorkouts,
  ({ one, many }) => ({
    plan: one(trainingPlans, {
      fields: [plannedWorkouts.trainingPlanId],
      references: [trainingPlans.id],
    }),
    person: one(people, {
      fields: [plannedWorkouts.personId],
      references: [people.id],
    }),
    exercises: many(plannedExercises),
    workoutSessions: many(workoutSessions),
    runSessions: many(runSessions),
  }),
);

export const strengthExercisesRelations = relations(
  strengthExercises,
  ({ one, many }) => ({
    person: one(people, {
      fields: [strengthExercises.personId],
      references: [people.id],
    }),
    plannedExercises: many(plannedExercises),
    sets: many(exerciseSets),
  }),
);

export const plannedExercisesRelations = relations(
  plannedExercises,
  ({ one }) => ({
    workout: one(plannedWorkouts, {
      fields: [plannedExercises.plannedWorkoutId],
      references: [plannedWorkouts.id],
    }),
    exercise: one(strengthExercises, {
      fields: [plannedExercises.exerciseId],
      references: [strengthExercises.id],
    }),
  }),
);

export const workoutSessionsRelations = relations(
  workoutSessions,
  ({ one, many }) => ({
    person: one(people, {
      fields: [workoutSessions.personId],
      references: [people.id],
    }),
    plannedWorkout: one(plannedWorkouts, {
      fields: [workoutSessions.plannedWorkoutId],
      references: [plannedWorkouts.id],
    }),
    sets: many(exerciseSets),
  }),
);

export const exerciseSetsRelations = relations(exerciseSets, ({ one }) => ({
  session: one(workoutSessions, {
    fields: [exerciseSets.workoutSessionId],
    references: [workoutSessions.id],
  }),
  exercise: one(strengthExercises, {
    fields: [exerciseSets.exerciseId],
    references: [strengthExercises.id],
  }),
}));

export const runSessionsRelations = relations(runSessions, ({ one }) => ({
  person: one(people, {
    fields: [runSessions.personId],
    references: [people.id],
  }),
  plannedWorkout: one(plannedWorkouts, {
    fields: [runSessions.plannedWorkoutId],
    references: [plannedWorkouts.id],
  }),
}));

export const nutritionPlansRelations = relations(
  nutritionPlans,
  ({ one, many }) => ({
    person: one(people, {
      fields: [nutritionPlans.personId],
      references: [people.id],
    }),
    days: many(dailyNutritionPlans),
  }),
);

export const dailyNutritionPlansRelations = relations(
  dailyNutritionPlans,
  ({ one, many }) => ({
    plan: one(nutritionPlans, {
      fields: [dailyNutritionPlans.nutritionPlanId],
      references: [nutritionPlans.id],
    }),
    person: one(people, {
      fields: [dailyNutritionPlans.personId],
      references: [people.id],
    }),
    meals: many(plannedMeals),
  }),
);

export const mealsRelations = relations(meals, ({ one, many }) => ({
  person: one(people, {
    fields: [meals.personId],
    references: [people.id],
  }),
  ingredients: many(mealIngredients),
  steps: many(mealSteps),
  plans: many(plannedMeals),
}));

export const mealIngredientsRelations = relations(
  mealIngredients,
  ({ one }) => ({
    meal: one(meals, {
      fields: [mealIngredients.mealId],
      references: [meals.id],
    }),
  }),
);

export const mealStepsRelations = relations(mealSteps, ({ one }) => ({
  meal: one(meals, {
    fields: [mealSteps.mealId],
    references: [meals.id],
  }),
}));

export const plannedMealsRelations = relations(plannedMeals, ({ one }) => ({
  day: one(dailyNutritionPlans, {
    fields: [plannedMeals.dailyNutritionPlanId],
    references: [dailyNutritionPlans.id],
  }),
  meal: one(meals, {
    fields: [plannedMeals.mealId],
    references: [meals.id],
  }),
}));

export const weightEntriesRelations = relations(weightEntries, ({ one }) => ({
  person: one(people, {
    fields: [weightEntries.personId],
    references: [people.id],
  }),
}));
