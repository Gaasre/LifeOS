import { createAuthClient } from "better-auth/react";
import { organizationClient } from "better-auth/client/plugins";

import { familyAccess, familyRoles } from "./family-access";

export function createLifeOsAuthClient(baseURL?: string) {
  return createAuthClient({
    ...(baseURL ? { baseURL } : {}),
    fetchOptions: {
      credentials: "include",
    },
    plugins: [
      organizationClient({
        ac: familyAccess,
        roles: familyRoles,
      }),
    ],
  });
}
