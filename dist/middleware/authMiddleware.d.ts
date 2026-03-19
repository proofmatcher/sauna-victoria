import type { Request, Response, NextFunction } from "express";
export interface AuthRequest extends Request {
    user?: any;
    token?: string;
    guestEmail?: string;
    isGuest?: boolean;
}
export declare const protect: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Verify Guest Token Middleware
 * Validates JWT token for guest users (from OTP verification)
 * Sets req.guestEmail and req.isGuest = true
 */
export declare const verifyGuestToken: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Verify Guest or Admin Middleware
 * Accepts both guest tokens (from OTP) and admin tokens (from login)
 * Sets either req.guestEmail + req.isGuest OR req.user
 */
export declare const verifyGuestOrAdmin: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
