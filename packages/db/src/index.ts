import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema";

function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is required. Add it to the environment of the process using @lifeos/db.",
    );
  }

  return databaseUrl;
}

export const pool = new Pool({
  connectionString: getDatabaseUrl(),
});

export const db = drizzle({ client: pool, schema });

export type DatabaseTransaction = Parameters<
  Parameters<typeof db.transaction>[0]
>[0];

export { schema };
export * from "./schema";
