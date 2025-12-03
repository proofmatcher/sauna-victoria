import { Request, Response } from "express";
export declare const createVessel: (req: Request, res: Response) => Promise<void>;
export declare const listVessels: (req: Request, res: Response) => Promise<void>;
export declare const updateVessel: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const updateVesselCapacity: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const deleteVessel: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
