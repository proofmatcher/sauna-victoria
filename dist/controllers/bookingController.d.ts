import { Request, Response } from "express";
/**
 * Reserve a booking (trip or trailer)
 */
export declare const createBookingController: (req: Request, res: Response) => Promise<void>;
/**
 * Get all bookings for current user
 */
export declare const getMyBookings: (req: Request, res: Response) => Promise<void>;
/**
 * Cancel a pending booking (restore seats)
 */
export declare const cancelBooking: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Initialize payment for a booking
 * Creates a Stripe Checkout session
 */
export declare const initiatePayment: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Verify payment status for a booking
 */
export declare const checkPaymentStatus: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Enhanced createBooking to handle mobile sauna pricing and customer details
 */
export declare const createMobileSaunaBooking: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
