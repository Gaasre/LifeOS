CREATE TYPE "public"."fitness_goal_status" AS ENUM('active', 'paused', 'completed');--> statement-breakpoint
CREATE TYPE "public"."fitness_goal_type" AS ENUM('weight', 'training_consistency', 'strength', 'running_distance', 'running_event');--> statement-breakpoint
CREATE TYPE "public"."fitness_plan_status" AS ENUM('active', 'paused', 'completed');--> statement-breakpoint
CREATE TYPE "public"."fitness_workout_type" AS ENUM('strength', 'easy_run', 'long_run', 'intervals', 'tempo_run', 'recovery_run', 'rest');--> statement-breakpoint
CREATE TYPE "public"."meal_slot" AS ENUM('breakfast', 'lunch', 'snack', 'dinner', 'other');--> statement-breakpoint
CREATE TYPE "public"."planned_meal_status" AS ENUM('planned', 'eaten', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."planned_workout_status" AS ENUM('planned', 'completed', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."training_plan_type" AS ENUM('strength', 'running', 'mixed');--> statement-breakpoint
CREATE TABLE "daily_nutrition_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nutrition_plan_id" uuid,
	"person_id" uuid NOT NULL,
	"date" date NOT NULL,
	"calorie_target" integer NOT NULL,
	"protein_target" integer NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "daily_nutrition_plans_person_date_uidx" UNIQUE("person_id","date"),
	CONSTRAINT "daily_nutrition_plans_calorie_target_check" CHECK ("daily_nutrition_plans"."calorie_target" >= 500 and "daily_nutrition_plans"."calorie_target" <= 10000),
	CONSTRAINT "daily_nutrition_plans_protein_target_check" CHECK ("daily_nutrition_plans"."protein_target" >= 0 and "daily_nutrition_plans"."protein_target" <= 1000)
);
--> statement-breakpoint
CREATE TABLE "exercise_sets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workout_session_id" uuid NOT NULL,
	"exercise_id" uuid NOT NULL,
	"set_number" integer NOT NULL,
	"repetitions" integer,
	"weight" numeric(7, 2),
	"completed" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "exercise_sets_session_exercise_set_uidx" UNIQUE("workout_session_id","exercise_id","set_number"),
	CONSTRAINT "exercise_sets_number_check" CHECK ("exercise_sets"."set_number" >= 1),
	CONSTRAINT "exercise_sets_repetitions_check" CHECK ("exercise_sets"."repetitions" is null or "exercise_sets"."repetitions" >= 0),
	CONSTRAINT "exercise_sets_weight_check" CHECK ("exercise_sets"."weight" is null or "exercise_sets"."weight" >= 0)
);
--> statement-breakpoint
CREATE TABLE "fitness_goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"person_id" uuid NOT NULL,
	"title" text NOT NULL,
	"type" "fitness_goal_type" NOT NULL,
	"starting_value" numeric(10, 2),
	"target_value" numeric(10, 2) NOT NULL,
	"unit" text NOT NULL,
	"target_date" date,
	"status" "fitness_goal_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fitness_goals_target_check" CHECK ("fitness_goals"."target_value" > 0)
);
--> statement-breakpoint
CREATE TABLE "fitness_profiles" (
	"person_id" uuid PRIMARY KEY NOT NULL,
	"height_cm" integer,
	"preferred_weight_unit" text DEFAULT 'kg' NOT NULL,
	"preferred_distance_unit" text DEFAULT 'km' NOT NULL,
	"activity_level" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fitness_profiles_height_check" CHECK ("fitness_profiles"."height_cm" is null or ("fitness_profiles"."height_cm" >= 50 and "fitness_profiles"."height_cm" <= 280))
);
--> statement-breakpoint
CREATE TABLE "meal_ingredients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meal_id" uuid NOT NULL,
	"ingredient_name" text NOT NULL,
	"quantity" numeric(10, 2),
	"unit" text,
	"optional" boolean DEFAULT false NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "meal_ingredients_meal_position_uidx" UNIQUE("meal_id","position"),
	CONSTRAINT "meal_ingredients_quantity_check" CHECK ("meal_ingredients"."quantity" is null or "meal_ingredients"."quantity" > 0)
);
--> statement-breakpoint
CREATE TABLE "meal_steps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meal_id" uuid NOT NULL,
	"instruction" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "meal_steps_meal_position_uidx" UNIQUE("meal_id","position")
);
--> statement-breakpoint
CREATE TABLE "meals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"person_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"image" text,
	"calories_per_serving" integer,
	"protein_per_serving" integer,
	"preparation_minutes" integer,
	"servings" integer DEFAULT 1 NOT NULL,
	"favourite" boolean DEFAULT false NOT NULL,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"dietary_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "meals_calorie_check" CHECK ("meals"."calories_per_serving" is null or "meals"."calories_per_serving" >= 0),
	CONSTRAINT "meals_protein_check" CHECK ("meals"."protein_per_serving" is null or "meals"."protein_per_serving" >= 0),
	CONSTRAINT "meals_preparation_check" CHECK ("meals"."preparation_minutes" is null or "meals"."preparation_minutes" >= 0),
	CONSTRAINT "meals_servings_check" CHECK ("meals"."servings" >= 1)
);
--> statement-breakpoint
CREATE TABLE "nutrition_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"person_id" uuid NOT NULL,
	"title" text NOT NULL,
	"goal" text,
	"calorie_target" integer NOT NULL,
	"protein_target" integer NOT NULL,
	"meals_per_day" integer NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date,
	"status" "fitness_plan_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "nutrition_plans_calorie_target_check" CHECK ("nutrition_plans"."calorie_target" >= 500 and "nutrition_plans"."calorie_target" <= 10000),
	CONSTRAINT "nutrition_plans_protein_target_check" CHECK ("nutrition_plans"."protein_target" >= 0 and "nutrition_plans"."protein_target" <= 1000),
	CONSTRAINT "nutrition_plans_meal_count_check" CHECK ("nutrition_plans"."meals_per_day" >= 1 and "nutrition_plans"."meals_per_day" <= 12),
	CONSTRAINT "nutrition_plans_date_range_check" CHECK ("nutrition_plans"."end_date" is null or "nutrition_plans"."end_date" >= "nutrition_plans"."start_date")
);
--> statement-breakpoint
CREATE TABLE "planned_exercises" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"planned_workout_id" uuid NOT NULL,
	"exercise_id" uuid NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"target_sets" integer NOT NULL,
	"target_repetitions" text NOT NULL,
	"target_weight" numeric(7, 2),
	"rest_seconds" integer,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "planned_exercises_workout_position_uidx" UNIQUE("planned_workout_id","position"),
	CONSTRAINT "planned_exercises_sets_check" CHECK ("planned_exercises"."target_sets" >= 1 and "planned_exercises"."target_sets" <= 20),
	CONSTRAINT "planned_exercises_weight_check" CHECK ("planned_exercises"."target_weight" is null or "planned_exercises"."target_weight" >= 0),
	CONSTRAINT "planned_exercises_rest_check" CHECK ("planned_exercises"."rest_seconds" is null or "planned_exercises"."rest_seconds" >= 0)
);
--> statement-breakpoint
CREATE TABLE "planned_meals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"daily_nutrition_plan_id" uuid NOT NULL,
	"meal_id" uuid,
	"slot" "meal_slot" NOT NULL,
	"custom_title" text,
	"servings" numeric(5, 2) DEFAULT '1' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"status" "planned_meal_status" DEFAULT 'planned' NOT NULL,
	"custom_calories" integer,
	"custom_protein" integer,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "planned_meals_day_position_uidx" UNIQUE("daily_nutrition_plan_id","position"),
	CONSTRAINT "planned_meals_reference_or_title_check" CHECK ("planned_meals"."meal_id" is not null or "planned_meals"."custom_title" is not null),
	CONSTRAINT "planned_meals_servings_check" CHECK ("planned_meals"."servings" > 0),
	CONSTRAINT "planned_meals_calorie_check" CHECK ("planned_meals"."custom_calories" is null or "planned_meals"."custom_calories" >= 0),
	CONSTRAINT "planned_meals_protein_check" CHECK ("planned_meals"."custom_protein" is null or "planned_meals"."custom_protein" >= 0)
);
--> statement-breakpoint
CREATE TABLE "planned_workouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"training_plan_id" uuid,
	"person_id" uuid NOT NULL,
	"title" text NOT NULL,
	"workout_type" "fitness_workout_type" NOT NULL,
	"planned_date" date NOT NULL,
	"estimated_duration_minutes" integer,
	"summary" text,
	"planned_distance_km" numeric(7, 2),
	"target_pace_seconds_per_km" integer,
	"interval_structure" text,
	"position" integer DEFAULT 0 NOT NULL,
	"status" "planned_workout_status" DEFAULT 'planned' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "planned_workouts_duration_check" CHECK ("planned_workouts"."estimated_duration_minutes" is null or "planned_workouts"."estimated_duration_minutes" > 0),
	CONSTRAINT "planned_workouts_distance_check" CHECK ("planned_workouts"."planned_distance_km" is null or "planned_workouts"."planned_distance_km" > 0),
	CONSTRAINT "planned_workouts_position_check" CHECK ("planned_workouts"."position" >= 0)
);
--> statement-breakpoint
CREATE TABLE "run_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"person_id" uuid NOT NULL,
	"planned_workout_id" uuid,
	"run_type" "fitness_workout_type" NOT NULL,
	"planned_distance_km" numeric(7, 2),
	"actual_distance_km" numeric(7, 2),
	"duration_seconds" integer,
	"average_pace_seconds_per_km" integer,
	"perceived_effort" integer,
	"completed_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "run_sessions_actual_distance_check" CHECK ("run_sessions"."actual_distance_km" is null or "run_sessions"."actual_distance_km" > 0),
	CONSTRAINT "run_sessions_duration_check" CHECK ("run_sessions"."duration_seconds" is null or "run_sessions"."duration_seconds" > 0),
	CONSTRAINT "run_sessions_effort_check" CHECK ("run_sessions"."perceived_effort" is null or ("run_sessions"."perceived_effort" >= 1 and "run_sessions"."perceived_effort" <= 10))
);
--> statement-breakpoint
CREATE TABLE "strength_exercises" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"person_id" uuid NOT NULL,
	"name" text NOT NULL,
	"muscle_group" text,
	"equipment" text,
	"instructions" text,
	"custom" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "training_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"person_id" uuid NOT NULL,
	"title" text NOT NULL,
	"type" "training_plan_type" NOT NULL,
	"goal" text,
	"weekly_frequency" integer NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date,
	"status" "fitness_plan_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "training_plans_frequency_check" CHECK ("training_plans"."weekly_frequency" >= 1 and "training_plans"."weekly_frequency" <= 14),
	CONSTRAINT "training_plans_date_range_check" CHECK ("training_plans"."end_date" is null or "training_plans"."end_date" >= "training_plans"."start_date")
);
--> statement-breakpoint
CREATE TABLE "weight_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"person_id" uuid NOT NULL,
	"weight" numeric(6, 2) NOT NULL,
	"measured_at" timestamp with time zone NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "weight_entries_weight_check" CHECK ("weight_entries"."weight" > 0 and "weight_entries"."weight" <= 1000)
);
--> statement-breakpoint
CREATE TABLE "workout_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"person_id" uuid NOT NULL,
	"planned_workout_id" uuid,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"perceived_effort" integer,
	"notes" text,
	CONSTRAINT "workout_sessions_effort_check" CHECK ("workout_sessions"."perceived_effort" is null or ("workout_sessions"."perceived_effort" >= 1 and "workout_sessions"."perceived_effort" <= 10))
);
--> statement-breakpoint
ALTER TABLE "daily_nutrition_plans" ADD CONSTRAINT "daily_nutrition_plans_nutrition_plan_id_nutrition_plans_id_fk" FOREIGN KEY ("nutrition_plan_id") REFERENCES "public"."nutrition_plans"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_nutrition_plans" ADD CONSTRAINT "daily_nutrition_plans_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercise_sets" ADD CONSTRAINT "exercise_sets_workout_session_id_workout_sessions_id_fk" FOREIGN KEY ("workout_session_id") REFERENCES "public"."workout_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercise_sets" ADD CONSTRAINT "exercise_sets_exercise_id_strength_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."strength_exercises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fitness_goals" ADD CONSTRAINT "fitness_goals_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fitness_profiles" ADD CONSTRAINT "fitness_profiles_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_ingredients" ADD CONSTRAINT "meal_ingredients_meal_id_meals_id_fk" FOREIGN KEY ("meal_id") REFERENCES "public"."meals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_steps" ADD CONSTRAINT "meal_steps_meal_id_meals_id_fk" FOREIGN KEY ("meal_id") REFERENCES "public"."meals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meals" ADD CONSTRAINT "meals_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nutrition_plans" ADD CONSTRAINT "nutrition_plans_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planned_exercises" ADD CONSTRAINT "planned_exercises_planned_workout_id_planned_workouts_id_fk" FOREIGN KEY ("planned_workout_id") REFERENCES "public"."planned_workouts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planned_exercises" ADD CONSTRAINT "planned_exercises_exercise_id_strength_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."strength_exercises"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planned_meals" ADD CONSTRAINT "planned_meals_daily_nutrition_plan_id_daily_nutrition_plans_id_fk" FOREIGN KEY ("daily_nutrition_plan_id") REFERENCES "public"."daily_nutrition_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planned_meals" ADD CONSTRAINT "planned_meals_meal_id_meals_id_fk" FOREIGN KEY ("meal_id") REFERENCES "public"."meals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planned_workouts" ADD CONSTRAINT "planned_workouts_training_plan_id_training_plans_id_fk" FOREIGN KEY ("training_plan_id") REFERENCES "public"."training_plans"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planned_workouts" ADD CONSTRAINT "planned_workouts_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "run_sessions" ADD CONSTRAINT "run_sessions_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "run_sessions" ADD CONSTRAINT "run_sessions_planned_workout_id_planned_workouts_id_fk" FOREIGN KEY ("planned_workout_id") REFERENCES "public"."planned_workouts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "strength_exercises" ADD CONSTRAINT "strength_exercises_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_plans" ADD CONSTRAINT "training_plans_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weight_entries" ADD CONSTRAINT "weight_entries_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_sessions" ADD CONSTRAINT "workout_sessions_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_sessions" ADD CONSTRAINT "workout_sessions_planned_workout_id_planned_workouts_id_fk" FOREIGN KEY ("planned_workout_id") REFERENCES "public"."planned_workouts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "daily_nutrition_plans_plan_idx" ON "daily_nutrition_plans" USING btree ("nutrition_plan_id");--> statement-breakpoint
CREATE INDEX "exercise_sets_exercise_idx" ON "exercise_sets" USING btree ("exercise_id");--> statement-breakpoint
CREATE INDEX "fitness_goals_person_status_idx" ON "fitness_goals" USING btree ("person_id","status");--> statement-breakpoint
CREATE INDEX "meals_person_favourite_idx" ON "meals" USING btree ("person_id","favourite");--> statement-breakpoint
CREATE INDEX "nutrition_plans_person_status_idx" ON "nutrition_plans" USING btree ("person_id","status");--> statement-breakpoint
CREATE INDEX "planned_exercises_exercise_idx" ON "planned_exercises" USING btree ("exercise_id");--> statement-breakpoint
CREATE INDEX "planned_meals_meal_idx" ON "planned_meals" USING btree ("meal_id");--> statement-breakpoint
CREATE INDEX "planned_workouts_person_date_idx" ON "planned_workouts" USING btree ("person_id","planned_date");--> statement-breakpoint
CREATE INDEX "planned_workouts_plan_idx" ON "planned_workouts" USING btree ("training_plan_id");--> statement-breakpoint
CREATE INDEX "run_sessions_person_completed_idx" ON "run_sessions" USING btree ("person_id","completed_at");--> statement-breakpoint
CREATE INDEX "run_sessions_planned_workout_idx" ON "run_sessions" USING btree ("planned_workout_id");--> statement-breakpoint
CREATE UNIQUE INDEX "strength_exercises_person_name_uidx" ON "strength_exercises" USING btree ("person_id","name");--> statement-breakpoint
CREATE INDEX "training_plans_person_status_idx" ON "training_plans" USING btree ("person_id","status");--> statement-breakpoint
CREATE INDEX "weight_entries_person_measured_idx" ON "weight_entries" USING btree ("person_id","measured_at");--> statement-breakpoint
CREATE INDEX "workout_sessions_person_completed_idx" ON "workout_sessions" USING btree ("person_id","completed_at");--> statement-breakpoint
CREATE INDEX "workout_sessions_planned_workout_idx" ON "workout_sessions" USING btree ("planned_workout_id");