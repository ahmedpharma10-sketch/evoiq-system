import * as schema from "@shared/schema";

let db: any;
let pool: any;

if (process.env.DATABASE_URL) {
  // Production/Cloud mode: Use Neon serverless PostgreSQL
  const { Pool, neonConfig } = await import('@neondatabase/serverless');
  const { drizzle } = await import('drizzle-orm/neon-serverless');
  const ws = (await import('ws')).default;

  neonConfig.webSocketConstructor = ws;
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
  db = drizzle({ client: pool, schema });
  console.log("[db] Connected to Neon PostgreSQL");
} else {
  // Local development mode: Use PGlite (embedded PostgreSQL)
  const { PGlite } = await import('@electric-sql/pglite');
  const { drizzle } = await import('drizzle-orm/pglite');

  const dataDir = './pglite-data';
  const client = new PGlite(dataDir);
  db = drizzle({ client, schema });
  pool = null;
  console.log("[db] Using PGlite embedded PostgreSQL (local dev mode)");
}

export { db, pool };
