import { Request, Response } from "express";
/**
 * Get all confirmed mobile sauna bookings for admin management
 */
export declare const getMobileSaunaBookings: (_req: Request, res: Response) => Promise<void>;
/**
 * Update mobile sauna booking details (admin only)
 */
export declare const updateMobileSaunaBooking: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Delete mobile sauna booking (admin only)
 */
export declare const deleteMobileSaunaBooking: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Get single mobile sauna booking by ID (admin only)
 */
export declare const getMobileSaunaBookingById: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
