import { db, entities, member, organization } from "@lifeos/db";
import { and, eq, inArray } from "drizzle-orm";

export class AccessError extends Error {
  constructor(
    public readonly code: "NOT_FOUND" | "FORBIDDEN",
    message: string,
  ) {
    super(message);
    this.name = "AccessError";
  }
}

export type HouseholdMembership = {
  organization: typeof organization.$inferSelect;
  member: typeof member.$inferSelect;
};

/**
 * Finds the requested household, or the account's first household when there
 * is only view context to resolve. Membership is the complete authorization
 * model: every member can read and manage every household entity.
 */
export async function getHouseholdMembership(
  userId: string,
  organizationId?: string,
): Promise<HouseholdMembership | null> {
  const [row] = await db
    .select({ organization, member })
    .from(member)
    .innerJoin(organization, eq(member.organizationId, organization.id))
    .where(
      organizationId
        ? and(
            eq(member.userId, userId),
            eq(member.organizationId, organizationId),
          )
        : eq(member.userId, userId),
    )
    .orderBy(member.createdAt)
    .limit(1);

  return row ?? null;
}

export async function requireHouseholdMembership(
  userId: string,
  organizationId?: string,
) {
  const membership = await getHouseholdMembership(userId, organizationId);

  if (!membership) {
    throw new AccessError(
      "FORBIDDEN",
      organizationId
        ? "You do not belong to this Family."
        : "Create or join your Family before adding household information.",
    );
  }

  return membership;
}

export async function requireEntityAccess(userId: string, entityId: string) {
  const [row] = await db
    .select({ entity: entities, memberId: member.id })
    .from(entities)
    .leftJoin(
      member,
      and(
        eq(member.organizationId, entities.organizationId),
        eq(member.userId, userId),
      ),
    )
    .where(eq(entities.id, entityId))
    .limit(1);

  if (!row) {
    throw new AccessError("NOT_FOUND", "The item could not be found.");
  }
  if (!row.memberId) {
    throw new AccessError("FORBIDDEN", "You cannot access this item.");
  }

  return row.entity;
}

export async function listReadableEntityIds(userId: string, type?: string) {
  const memberships = await db
    .select({ organizationId: member.organizationId })
    .from(member)
    .where(eq(member.userId, userId));
  const organizationIds = memberships.map((row) => row.organizationId);

  if (organizationIds.length === 0) return [];

  const rows = await db
    .select({ id: entities.id })
    .from(entities)
    .where(
      type
        ? and(
            inArray(entities.organizationId, organizationIds),
            eq(entities.type, type),
          )
        : inArray(entities.organizationId, organizationIds),
    );

  return rows.map((row) => row.id);
}
