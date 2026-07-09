export type AuthRuntimeConfig = {
  appUrl: string;
  databaseUrl?: string;
};

export const authPackage = {
  name: "@lifeos/auth",
  provider: "better-auth",
} as const;
