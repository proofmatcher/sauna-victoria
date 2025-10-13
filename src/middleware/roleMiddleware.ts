import { Response, NextFunction } from "express";
import { AuthRequest } from "./authMiddleware.js";

export const authorize =
  (...roles: string[]) =>
  (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ message: "Not authenticated" });

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied: insufficient permissions" });
    }
    next();
  };
