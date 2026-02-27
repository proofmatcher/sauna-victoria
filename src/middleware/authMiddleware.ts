import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
import { BlacklistedToken } from "../models/BlacklistedToken.js";

export interface AuthRequest extends Request {
  user?: any;
  token?: string; // Add token to the request for logout functionality
  guestEmail?: string; // Guest email from OTP verification
  isGuest?: boolean; // Flag to identify guest requests
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

/**
 * Verify Guest Token Middleware
 * Validates JWT token for guest users (from OTP verification)
 * Sets req.guestEmail and req.isGuest = true
 */
export const verifyGuestToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  let token: string | undefined;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];
      if (!token) {
        return res.status(401).json({ 
          success: false,
          message: "No token provided" 
        });
      }

      const secret = process.env.JWT_SECRET || "fallback-secret-key";
      const decoded = jwt.verify(token, secret) as any;

      // Verify this is a guest token
      if (decoded.type !== 'guest') {
        return res.status(401).json({ 
          success: false,
          message: "Invalid guest token" 
        });
      }

      // Set guest information on request
      req.guestEmail = decoded.email;
      req.isGuest = true;
      req.token = token;

      next();
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return res.status(401).json({ 
          success: false,
          message: "Token expired. Please verify your email again." 
        });
      } else if (error instanceof jwt.JsonWebTokenError) {
        return res.status(401).json({ 
          success: false,
          message: "Invalid token" 
        });
      }
      return res.status(401).json({ 
        success: false,
        message: "Authentication failed" 
      });
    }
  } else {
    return res.status(401).json({ 
      success: false,
      message: "No token provided" 
    });
  }
};

/**
 * Verify Guest or Admin Middleware
 * Accepts both guest tokens (from OTP) and admin tokens (from login)
 * Sets either req.guestEmail + req.isGuest OR req.user
 */
export const verifyGuestOrAdmin = async (req: AuthRequest, res: Response, next: NextFunction) => {
  let token: string | undefined;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];
      if (!token) {
        return res.status(401).json({ 
          success: false,
          message: "No token provided" 
        });
      }

      const secret = process.env.JWT_SECRET || "fallback-secret-key";
      const decoded = jwt.verify(token, secret) as any;

      // Check if it's a guest token
      if (decoded.type === 'guest') {
        req.guestEmail = decoded.email;
        req.isGuest = true;
        req.token = token;
        return next();
      }

      // Otherwise it's a regular admin token
      if (decoded.id) {
        // Check if token is blacklisted
        const blacklistedToken = await BlacklistedToken.findOne({ 
          $or: [
            { token },
            { token: "ALL_TOKENS" },
            { token: `ALL_TOKENS_${decoded.id}` }
          ]
        });
        
        if (blacklistedToken) {
          return res.status(401).json({ 
            success: false,
            message: "Session has been invalidated. Please login again." 
          });
        }

        req.user = await User.findById(decoded.id).select("-password");
        if (!req.user) {
          return res.status(401).json({ 
            success: false,
            message: "User not found" 
          });
        }

        // Check if user is active
        if (!req.user.isActive) {
          return res.status(403).json({ 
            success: false,
            message: "Account has been deactivated" 
          });
        }

        req.token = token;
        return next();
      }

      // Token doesn't match expected format
      return res.status(401).json({ 
        success: false,
        message: "Invalid token format" 
      });

    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return res.status(401).json({ 
          success: false,
          message: "Token expired. Please login or verify email again." 
        });
      } else if (error instanceof jwt.JsonWebTokenError) {
        return res.status(401).json({ 
          success: false,
          message: "Invalid token" 
        });
      }
      return res.status(401).json({ 
        success: false,
        message: "Authentication failed" 
      });
    }
  } else {
    return res.status(401).json({ 
      success: false,
      message: "No token provided" 
    });
  }
};

