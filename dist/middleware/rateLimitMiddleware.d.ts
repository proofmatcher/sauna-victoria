import { Request, Response, NextFunction } from 'express';
export declare const loginRateLimiter: (req: Request, res: Response, next: NextFunction) => void | Response<any, Record<string, any>>;
export declare const passwordResetRateLimiter: (req: Request, res: Response, next: NextFunction) => void | Response<any, Record<string, any>>;
export declare const registrationRateLimiter: (req: Request, res: Response, next: NextFunction) => void | Response<any, Record<string, any>>;
