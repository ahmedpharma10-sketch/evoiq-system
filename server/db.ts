import * as schema from "@shared/schema";

let db: any;
let pool: any;
let initPromise: Promise<void> | null = null;

async function initializeDb() {
  if (db !== undefined && db !== null) {
    return;
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    try {
      console.log("[db] Starting database initialization with DATABASE_URL:", !!process.env.DATABASE_URL);

      if (process.env.DATABASE_URL) {
        // Production/Cloud mode: Use Neon serverless PostgreSQL
        console.log("[db] Using Neon serverless PostgreSQL");

        // Import all Neon modules upfront
        let Pool: any, neonConfig: any, ws: any, drizzle: any;

        try {
          const neonModule = await import('@neondatabase/serverless');
          Pool = neonModule.Pool;
          neonConfig = neonModule.neonConfig;
        } catch (e) {
          console.error("[db] Failed to import @neondatabase/serverless:", e);
          throw e;
        }

        try {
          const drizzleModule = await import('drizzle-orm/neon-serverless');
          drizzle = drizzleModule.drizzle;
        } catch (e) {
          console.error("[db] Failed to import drizzle-orm/neon-serverless:", e);
          throw e;
        }

        try {
          const wsModule = await import('ws');
          ws = wsModule.default;
        } catch (e) {
          console.error("[db] Failed to import ws:", e);
          throw e;
        }

        console.log("[db] All modules imported successfully");
        neonConfig.webSocketConstructor = ws;
        pool = new Pool({ connectionString: process.env.DATABASE_URL });
        db = drizzle({ client: pool, schema });
        console.log("[db] Successfully connected to Neon PostgreSQL");
      } else {
        // Local development mode: Use PGlite (embedded PostgreSQL)
        console.log("[db] Using PGlite embedded PostgreSQL");

        let PGlite: any, drizzle: any;

        try {
          const pgliteModule = await import('@electric-sql/pglite');
          PGlite = pgliteModule.PGlite;
        } catch (e) {
          console.error("[db] Failed to import @electric-sql/pglite:", e);
          throw e;
        }

        try {
          const drizzleModule = await import('drizzle-orm/pglite');
          drizzle = drizzleModule.drizzle;
        } catch (e) {
          console.error("[db] Failed to import drizzle-orm/pglite:", e);
          throw e;
        }

        const dataDir = './pglite-data';
        const client = new PGlite(dataDir);
        db = drizzle({ client, schema });
        pool = null;
        console.log("[db] Successfully initialized PGlite");
      }
    } catch (error) {
      console.error("[db] Database initialization failed:", error);
      if (error instanceof Error) {
        console.error("[db] Error message:", error.message);
        console.error("[db] Error stack:", error.stack);
      }
      initPromise = null;
      throw error;
    }
  })();

  return initPromise;
}

export { db, pool, initializeDb };
