import { Request, Response } from "express";
export declare const listUpcomingTrips: (req: Request, res: Response) => Promise<void>;
export declare const tripDetails: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
