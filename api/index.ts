import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { registerRoutes } from "../server/routes";
import { serveStatic, log } from "../server/vite";
import type { SafeUser } from "../server/storage";
import { initializeDatabase } from "../server/initDb";

// Extend Express Request to include session user
declare module "express-session" {
  interface SessionData {
    user: SafeUser;
  }
}

const app = express();

// Configure session store - use PostgreSQL if DATABASE_URL is available, otherwise fallback to memory
const PgSession = connectPgSimple(session);
let sessionStore: session.Store | undefined;

if (process.env.DATABASE_URL) {
  sessionStore = new PgSession({
    conString: process.env.DATABASE_URL,
    tableName: "user_sessions",
    createTableIfMissing: true,
  });
  log("Using PostgreSQL session store for persistent sessions");
} else {
  log("WARNING: DATABASE_URL not set - using in-memory sessions (will not persist across restarts)");
}

// Configure session middleware
app.use(
  session({
    store: sessionStore,
    secret: process.env.SESSION_SECRET || (process.env.NODE_ENV === "production" ? (() => { throw new Error("SESSION_SECRET must be set in production"); })() : "dev-secret-change-in-production"),
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
    proxy: true, // Trust the reverse proxy
  })
);

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}
app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Initialize database and register routes
(async () => {
  try {
    // Initialize database tables (creates them if they don't exist)
    await initializeDatabase();

    await registerRoutes(app);

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      res.status(status).json({ message });
      console.error(`[error] ${err.stack || err.message || err}`);
    });

    // Serve static files in production
    serveStatic(app);
  } catch (error) {
    console.error("Failed to initialize app:", error);
    throw error;
  }
})();

export default app;
