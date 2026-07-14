import { AccessError } from "@lifeos/access";
import { moneyService, MoneyServiceError } from "@lifeos/money";
import { ORPCError } from "@orpc/server";

import type { AuthorizedRouter } from "./family-router";

function throwMappedError(error: unknown): never {
  if (error instanceof AccessError) {
    throw new ORPCError(error.code, { message: error.message });
  }
  if (error instanceof MoneyServiceError) {
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

export function createMoneyRouter(authorized: AuthorizedRouter) {
  const bootstrap = authorized.money.bootstrap.handler(
    async ({ input, context }) => {
      try {
        return await moneyService.loadDashboard(context.auth.user.id, {
          ...(input.personId ? { personId: input.personId } : {}),
        });
      } catch (error) {
        return throwMappedError(error);
      }
    },
  );

  const saveSettings = authorized.money.saveSettings.handler(
    async ({ input, context }) => {
      try {
        return await moneyService.saveSettings(context.auth.user.id, input);
      } catch (error) {
        return throwMappedError(error);
      }
    },
  );

  const saveAccount = authorized.money.saveAccount.handler(
    async ({ input, context }) => {
      try {
        return await moneyService.saveAccount(context.auth.user.id, input);
      } catch (error) {
        return throwMappedError(error);
      }
    },
  );

  const setAccountArchived = authorized.money.setAccountArchived.handler(
    async ({ input, context }) => {
      try {
        return await moneyService.setAccountArchived(
          context.auth.user.id,
          input.accountId,
          input.archived,
        );
      } catch (error) {
        return throwMappedError(error);
      }
    },
  );

  const createEntry = authorized.money.createEntry.handler(
    async ({ input, context }) => {
      try {
        return await moneyService.createEntry(context.auth.user.id, input);
      } catch (error) {
        return throwMappedError(error);
      }
    },
  );

  const saveRecurring = authorized.money.saveRecurring.handler(
    async ({ input, context }) => {
      try {
        return await moneyService.saveRecurring(context.auth.user.id, input);
      } catch (error) {
        return throwMappedError(error);
      }
    },
  );

  const setRecurringState = authorized.money.setRecurringState.handler(
    async ({ input, context }) => {
      try {
        return await moneyService.setRecurringState(
          context.auth.user.id,
          input.itemId,
          input.state,
        );
      } catch (error) {
        return throwMappedError(error);
      }
    },
  );

  const saveGoal = authorized.money.saveGoal.handler(
    async ({ input, context }) => {
      try {
        return await moneyService.saveGoal(context.auth.user.id, input);
      } catch (error) {
        return throwMappedError(error);
      }
    },
  );

  const saveDecision = authorized.money.saveDecision.handler(
    async ({ input, context }) => {
      try {
        return await moneyService.saveDecision(context.auth.user.id, input);
      } catch (error) {
        return throwMappedError(error);
      }
    },
  );

  return {
    bootstrap,
    saveSettings,
    saveAccount,
    setAccountArchived,
    createEntry,
    saveRecurring,
    setRecurringState,
    saveGoal,
    saveDecision,
  };
}
