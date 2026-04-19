import { IncomingMessage, ServerResponse } from 'http';
import express from 'express';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { registerRoutes } from '../server/routes';
import { serveStatic, log } from '../server/vite';
import type { SafeUser } from '../server/storage';
import { initializeDatabase } from '../server/initDb';

// Extend Express Request to include session user
declare module 'express-session' {
  interface SessionData {
    user: SafeUser;
  }
}

let app: express.Application | null = null;
let initPromise: Promise<express.Application> | null = null;

async function getApp(): Promise<express.Application> {
  if (app) {
    return app;
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    const newApp = express();

    // Configure session store
    const PgSession = connectPgSimple(session);
    let sessionStore: session.Store | undefined;

    if (process.env.DATABASE_URL) {
      sessionStore = new PgSession({
        conString: process.env.DATABASE_URL,
        tableName: 'user_sessions',
        createTableIfMissing: true,
      });
      log('Using PostgreSQL session store for persistent sessions');
    } else {
      log('WARNING: DATABASE_URL not set - using in-memory sessions');
    }

    // Configure session middleware
    newApp.use(
      session({
        store: sessionStore,
        secret: process.env.SESSION_SECRET || (process.env.NODE_ENV === 'production' ? (() => { throw new Error('SESSION_SECRET must be set in production'); })() : 'dev-secret-change-in-production'),
        resave: false,
        saveUninitialized: false,
        cookie: {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
          maxAge: 24 * 60 * 60 * 1000,
        },
        proxy: true,
      })
    );

    // Parse JSON and form data
    newApp.use(express.json());
    newApp.use(express.urlencoded({ extended: false }));

    // Request logging middleware
    newApp.use((req, res, next) => {
      const start = Date.now();
      const path = req.path;
      let capturedJsonResponse: Record<string, any> | undefined = undefined;

      const originalResJson = res.json;
      res.json = function (bodyJson, ...args) {
        capturedJsonResponse = bodyJson;
        return originalResJson.apply(res, [bodyJson, ...args]);
      };

      res.on('finish', () => {
        const duration = Date.now() - start;
        if (path.startsWith('/api')) {
          let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
          if (capturedJsonResponse) {
            logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
          }
          if (logLine.length > 80) {
            logLine = logLine.slice(0, 79) + '…';
          }
          log(logLine);
        }
      });

      next();
    });

    try {
      // Initialize database connection
      const { initializeDb } = await import('../server/db');
      await initializeDb();

      // Initialize database schema and seed data
      await initializeDatabase();

      // Register API routes
      await registerRoutes(newApp);

      // Error handler
      newApp.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
        const status = err.status || err.statusCode || 500;
        const message = err.message || 'Internal Server Error';
        res.status(status).json({ message });
        console.error(`[error] ${err.stack || err.message || err}`);
      });

      // Serve static files
      serveStatic(newApp);

      app = newApp;
      return newApp;
    } catch (error) {
      console.error('Failed to initialize app:', error);
      throw error;
    }
  })();

  return initPromise;
}

export default async (req: IncomingMessage, res: ServerResponse) => {
  const expressApp = await getApp();
  return expressApp(req, res);
};
