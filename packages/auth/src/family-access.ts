import { createAccessControl } from "better-auth/plugins/access";
import {
  defaultStatements,
  ownerAc,
} from "better-auth/plugins/organization/access";

/**
 * Better Auth requires named organization roles for membership lifecycle.
 * LifeOS deliberately gives both names the same capabilities and never uses
 * them to authorize household data.
 */
export const familyAccess = createAccessControl(defaultStatements);

const householdMember = familyAccess.newRole({
  ...ownerAc.statements,
});

export const familyRoles = {
  owner: householdMember,
  member: householdMember,
} as const;
