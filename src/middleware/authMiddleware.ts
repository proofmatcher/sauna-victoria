import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { User } from "../models/User.js";

export interface AuthRequest extends Request {
  user?: any;
}

export const protect = async (req: AuthRequest, res: Response, next: NextFunction) => {
  let token: string | undefined;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];
      if (!token) {
        return res.status(401).json({ message: "No token provided" });
      }
      const secret = process.env.JWT_SECRET || "fallback-secret-key";
      const decoded = jwt.verify(token, secret) as any;

      req.user = await User.findById(decoded.id).select("-password");
      if (!req.user) return res.status(401).json({ message: "User not found" });

      next();
    } catch (error) {
      return res.status(401).json({ message: "Not authorized, token failed" });
    }
  }

  if (!token) {
    return res.status(401).json({ message: "No token, authorization denied" });
  }
};
