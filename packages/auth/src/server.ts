import "dotenv/config";

import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import {
  db,
  entities,
  member,
  moneySettings,
  organization as organizationTable,
  people,
  schema,
} from "@lifeos/db";
import { betterAuth } from "better-auth/minimal";
import { organization } from "better-auth/plugins/organization";
import { and, eq, ne } from "drizzle-orm";

import { familyAccess, familyRoles } from "./family-access";

const localWebOrigins = ["http://127.0.0.1:5173", "http://localhost:5173"];

function getRequiredEnvironmentVariable(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required to start LifeOS authentication.`);
  }

  return value;
}

function getTrustedOrigins() {
  return (process.env.ALLOWED_ORIGINS ?? localWebOrigins.join(","))
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function parseOrganizationMetadata(value: string | null) {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function isPersonalWorkspace(metadata: string | null) {
  return parseOrganizationMetadata(metadata).kind === "personal";
}

async function mergePersonalWorkspace(
  userId: string,
  targetOrganizationId: string,
) {
  const memberships = await db
    .select({
      organizationId: member.organizationId,
      metadata: organizationTable.metadata,
    })
    .from(member)
    .innerJoin(
      organizationTable,
      eq(member.organizationId, organizationTable.id),
    )
    .where(
      and(
        eq(member.userId, userId),
        ne(member.organizationId, targetOrganizationId),
      ),
    );
  const personalWorkspace = memberships.find((membership) =>
    isPersonalWorkspace(membership.metadata),
  );

  await db.transaction(async (transaction) => {
    const [targetOrganization] = await transaction
      .select({ metadata: organizationTable.metadata })
      .from(organizationTable)
      .where(eq(organizationTable.id, targetOrganizationId))
      .limit(1);

    if (targetOrganization) {
      await transaction
        .update(organizationTable)
        .set({
          metadata: JSON.stringify({
            ...parseOrganizationMetadata(targetOrganization.metadata),
            kind: "family",
          }),
        })
        .where(eq(organizationTable.id, targetOrganizationId));
    }

    if (!personalWorkspace) return;

    const sourceOrganizationId = personalWorkspace.organizationId;
    const [targetSettings] = await transaction
      .select({ organizationId: moneySettings.organizationId })
      .from(moneySettings)
      .where(eq(moneySettings.organizationId, targetOrganizationId))
      .limit(1);

    if (targetSettings) {
      await transaction
        .delete(moneySettings)
        .where(eq(moneySettings.organizationId, sourceOrganizationId));
    } else {
      await transaction
        .update(moneySettings)
        .set({ organizationId: targetOrganizationId })
        .where(eq(moneySettings.organizationId, sourceOrganizationId));
    }

    const [sourcePerson, targetPerson] = await Promise.all([
      transaction
        .select({ id: people.id })
        .from(people)
        .where(
          and(
            eq(people.organizationId, sourceOrganizationId),
            eq(people.userId, userId),
          ),
        )
        .limit(1)
        .then((rows) => rows[0]),
      transaction
        .select({ id: people.id })
        .from(people)
        .where(
          and(
            eq(people.organizationId, targetOrganizationId),
            eq(people.userId, userId),
          ),
        )
        .limit(1)
        .then((rows) => rows[0]),
    ]);

    if (sourcePerson && targetPerson) {
      // The target row can only be the just-in-time shell created from the new
      // membership. Keep the personal row so its profile and linked data move.
      await transaction.delete(people).where(eq(people.id, targetPerson.id));
    }

    await transaction
      .update(entities)
      .set({ organizationId: targetOrganizationId })
      .where(eq(entities.organizationId, sourceOrganizationId));
    await transaction
      .update(people)
      .set({ organizationId: targetOrganizationId, updatedAt: new Date() })
      .where(eq(people.organizationId, sourceOrganizationId));
    await transaction
      .delete(organizationTable)
      .where(eq(organizationTable.id, sourceOrganizationId));
  });
}

export const trustedOrigins = getTrustedOrigins();

export const auth = betterAuth({
  appName: "LifeOS",
  baseURL: getRequiredEnvironmentVariable("BETTER_AUTH_URL"),
  secret: getRequiredEnvironmentVariable("BETTER_AUTH_SECRET"),
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  trustedOrigins,
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    autoSignIn: false,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      if (process.env.AUTH_EMAIL_MODE !== "console") {
        throw new Error(
          "Password reset delivery is not configured. Set AUTH_EMAIL_MODE=console for local development or connect an email provider.",
        );
      }

      console.info(`[LifeOS auth] Password reset for ${user.email}: ${url}`);
    },
  },
  plugins: [
    organization({
      ac: familyAccess,
      roles: familyRoles,
      creatorRole: "owner",
      organizationLimit: 1,
      membershipLimit: 2,
      invitationLimit: 2,
      invitationExpiresIn: 60 * 60 * 24 * 7,
      cancelPendingInvitationsOnReInvite: true,
      requireEmailVerificationOnInvitation: false,
      organizationHooks: {
        afterCreateOrganization: async ({ organization, member, user }) => {
          await db
            .insert(people)
            .values({
              organizationId: organization.id,
              userId: user.id,
              preferredName: user.name,
              avatarUrl: user.image,
            })
            .onConflictDoNothing();
        },
        afterAddMember: async ({ member, user, organization }) => {
          await db
            .insert(people)
            .values({
              organizationId: organization.id,
              userId: user.id,
              preferredName: user.name,
              avatarUrl: user.image,
            })
            .onConflictDoNothing();
        },
        afterAcceptInvitation: async ({ user, organization }) => {
          await mergePersonalWorkspace(user.id, organization.id);
          await db
            .insert(people)
            .values({
              organizationId: organization.id,
              userId: user.id,
              preferredName: user.name,
              avatarUrl: user.image,
            })
            .onConflictDoNothing();
        },
        afterRemoveMember: async ({ user, organization }) => {
          // The person and their relationships remain household history even
          // if their login is detached.
          await db
            .update(people)
            .set({ userId: null, updatedAt: new Date() })
            .where(
              and(
                eq(people.organizationId, organization.id),
                eq(people.userId, user.id),
              ),
            );
        },
      },
    }),
  ],
  telemetry: {
    enabled: false,
  },
});

export type AuthSession = typeof auth.$Infer.Session;
