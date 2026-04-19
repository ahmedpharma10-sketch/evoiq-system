import type { Request, Response, NextFunction } from "express";

// Middleware to check if user is authenticated
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.user) {
    return res.status(401).json({ error: "Authentication required" });
  }
  next();
}

// Middleware to check if user is admin (for now, all logged-in users are admins)
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session.user) {
    return res.status(401).json({ error: "Authentication required" });
  }
  // For now, all authenticated users have admin privileges
  // In the future, you could check: if (req.session.user.position !== "Director") { ... }
  next();
}
