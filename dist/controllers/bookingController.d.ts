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
 * Now accepts startDate and endDate instead of days
 */
export declare const createMobileSaunaBooking: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Get vessel availability for date range
 * Query params: startDate, endDate
 * Returns day-by-day availability
 */
export declare const getVesselAvailability: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Get all booked date ranges for a vessel
 * Returns simplified list of booked periods
 */
export declare const getVesselBookedDates: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Calculate pricing preview for mobile sauna booking
 * Returns breakdown of rental, delivery, wood bins costs
 * Does NOT create a booking - just previews pricing
 */
export declare const getMobileSaunaPricingPreview: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
/**
 * Update booking to accept agreement (set rulesAgreed to true)
 * Called after user reviews agreement modal and clicks "I agree"
 */
export declare const acceptBookingAgreement: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
