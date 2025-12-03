import type { Request, Response, NextFunction } from "express";
export interface AuthRequest extends Request {
    user?: any;
    token?: string;
}
export declare const protect: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
