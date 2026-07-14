import "dotenv/config";

import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { db, people, schema } from "@lifeos/db";
import { betterAuth } from "better-auth/minimal";
import { organization } from "better-auth/plugins/organization";
import { and, eq } from "drizzle-orm";

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
