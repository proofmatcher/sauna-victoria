import { Request, Response } from "express";
export declare const getAllBookings: (req: Request, res: Response) => Promise<void>;
export declare const confirmBooking: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const cancelBooking: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getBookingById: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const updateBooking: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const extendRental: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
