import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
import { BlacklistedToken } from "../models/BlacklistedToken.js";

export interface AuthRequest extends Request {
  user?: any;
  token?: string; // Add token to the request for logout functionality
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

      // Check if token is blacklisted (specific token or all tokens for user)
      const blacklistedToken = await BlacklistedToken.findOne({ 
        $or: [
          { token }, // Specific token blacklisted
          { token: "ALL_TOKENS" }, // All tokens blacklisted (password reset)
          { token: `ALL_TOKENS_${decoded.id}` } // All tokens for this user blacklisted
        ]
      });
      
      if (blacklistedToken) {
        return res.status(401).json({ 
          message: "Session has been invalidated", 
          reason: blacklistedToken.reason === "password-change" 
            ? "Password was recently changed. Please login again." 
            : "Please login again",
          timestamp: blacklistedToken.createdAt
        });
      }

      req.user = await User.findById(decoded.id).select("-password");
      if (!req.user) {
        return res.status(401).json({ message: "User not found" });
      }

      // Check if user is still active
      if (!req.user.isActive) {
        return res.status(403).json({ 
          message: "Account has been deactivated", 
          reason: "Please contact support" 
        });
      }

      // Add token to request for logout functionality
      req.token = token;

      next();
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return res.status(401).json({ 
          message: "Token expired", 
          reason: "Please login again" 
        });
      } else if (error instanceof jwt.JsonWebTokenError) {
        return res.status(401).json({ 
          message: "Invalid token", 
          reason: "Please login again" 
        });
      }
      return res.status(401).json({ message: "Not authorized, token failed" });
    }
  }

  if (!token) {
    return res.status(401).json({ message: "No token, authorization denied" });
  }
};
