import { Request, Response, NextFunction } from 'express';
export declare const handleUploadError: (err: any, req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export declare const uploadSingleImage: (fieldName?: string) => (req: Request, res: Response, next: NextFunction) => void;
export declare const uploadOptionalImage: (fieldName?: string) => (req: Request, res: Response, next: NextFunction) => void;
