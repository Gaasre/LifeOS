import { AccessError } from "@lifeos/access";
import { fitnessService, FitnessServiceError } from "@lifeos/fitness";
import { ORPCError } from "@orpc/server";

import type { AuthorizedRouter } from "./family-router";

function throwMappedError(error: unknown): never {
  if (error instanceof AccessError) {
    throw new ORPCError(error.code, { message: error.message });
  }
  if (error instanceof FitnessServiceError) {
    const code =
      error.code === "NOT_FOUND"
        ? "NOT_FOUND"
        : error.code === "BAD_REQUEST"
          ? "BAD_REQUEST"
          : "INTERNAL_SERVER_ERROR";
    throw new ORPCError(code, { message: error.message });
  }
  throw error;
}

export function createFitnessRouter(authorized: AuthorizedRouter) {
  const bootstrap = authorized.fitness.bootstrap.handler(
    async ({ input, context }) => {
      try {
        return await fitnessService.bootstrap(context.auth.user.id, {
          ...(input.personId ? { personId: input.personId } : {}),
          date: input.date,
        });
      } catch (error) {
        return throwMappedError(error);
      }
    },
  );

  const setMealStatus = authorized.fitness.setMealStatus.handler(
    async ({ input, context }) => {
      try {
        return await fitnessService.setMealStatus(context.auth.user.id, input);
      } catch (error) {
        return throwMappedError(error);
      }
    },
  );

  const replacePlannedMeal = authorized.fitness.replacePlannedMeal.handler(
    async ({ input, context }) => {
      try {
        return await fitnessService.replacePlannedMeal(
          context.auth.user.id,
          input,
        );
      } catch (error) {
        return throwMappedError(error);
      }
    },
  );

  const setWorkoutStatus = authorized.fitness.setWorkoutStatus.handler(
    async ({ input, context }) => {
      try {
        return await fitnessService.setWorkoutStatus(
          context.auth.user.id,
          input,
        );
      } catch (error) {
        return throwMappedError(error);
      }
    },
  );

  const completeWorkout = authorized.fitness.completeWorkout.handler(
    async ({ input, context }) => {
      try {
        return await fitnessService.completeWorkout(
          context.auth.user.id,
          input,
        );
      } catch (error) {
        return throwMappedError(error);
      }
    },
  );

  const logWeight = authorized.fitness.logWeight.handler(
    async ({ input, context }) => {
      try {
        return await fitnessService.logWeight(context.auth.user.id, input);
      } catch (error) {
        return throwMappedError(error);
      }
    },
  );

  const createTrainingPlan = authorized.fitness.createTrainingPlan.handler(
    async ({ input, context }) => {
      try {
        return await fitnessService.createTrainingPlan(
          context.auth.user.id,
          input,
        );
      } catch (error) {
        return throwMappedError(error);
      }
    },
  );

  const createWorkout = authorized.fitness.createWorkout.handler(
    async ({ input, context }) => {
      try {
        return await fitnessService.createWorkout(context.auth.user.id, input);
      } catch (error) {
        return throwMappedError(error);
      }
    },
  );

  const moveWorkout = authorized.fitness.moveWorkout.handler(
    async ({ input, context }) => {
      try {
        return await fitnessService.moveWorkout(context.auth.user.id, input);
      } catch (error) {
        return throwMappedError(error);
      }
    },
  );

  const createNutritionPlan = authorized.fitness.createNutritionPlan.handler(
    async ({ input, context }) => {
      try {
        return await fitnessService.createNutritionPlan(
          context.auth.user.id,
          input,
        );
      } catch (error) {
        return throwMappedError(error);
      }
    },
  );

  const createMeal = authorized.fitness.createMeal.handler(
    async ({ input, context }) => {
      try {
        return await fitnessService.createMeal(context.auth.user.id, input);
      } catch (error) {
        return throwMappedError(error);
      }
    },
  );

  const addMealToDay = authorized.fitness.addMealToDay.handler(
    async ({ input, context }) => {
      try {
        return await fitnessService.addMealToDay(context.auth.user.id, input);
      } catch (error) {
        return throwMappedError(error);
      }
    },
  );

  const copyDayMeals = authorized.fitness.copyDayMeals.handler(
    async ({ input, context }) => {
      try {
        return await fitnessService.copyDayMeals(context.auth.user.id, input);
      } catch (error) {
        return throwMappedError(error);
      }
    },
  );

  const saveGoal = authorized.fitness.saveGoal.handler(
    async ({ input, context }) => {
      try {
        return await fitnessService.saveGoal(context.auth.user.id, input);
      } catch (error) {
        return throwMappedError(error);
      }
    },
  );

  return {
    bootstrap,
    setMealStatus,
    replacePlannedMeal,
    setWorkoutStatus,
    completeWorkout,
    logWeight,
    createTrainingPlan,
    createWorkout,
    moveWorkout,
    createNutritionPlan,
    createMeal,
    addMealToDay,
    copyDayMeals,
    saveGoal,
  };
}
