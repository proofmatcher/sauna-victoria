import type { Request, Response, NextFunction } from "express";
export interface AuthRequest extends Request {
    user?: any;
}
export declare const protect: (req: AuthRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=authMiddleware.d.ts.map