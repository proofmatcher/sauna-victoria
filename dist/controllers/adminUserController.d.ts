import { Request, Response } from "express";
export declare const getAllUsers: (req: Request, res: Response) => Promise<void>;
export declare const getUserById: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const deactivateUser: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const reactivateUser: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const updateUserRole: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getStaffMembers: (req: Request, res: Response) => Promise<void>;
