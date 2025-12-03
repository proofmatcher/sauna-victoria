import { Request, Response } from "express";
export declare const createTrip: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const listTripsAdmin: (req: Request, res: Response) => Promise<void>;
export declare const getTripById: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const updateTrip: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const deleteTrip: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const notifyStaff: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
