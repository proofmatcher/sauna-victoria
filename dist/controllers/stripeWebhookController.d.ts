import { Request, Response } from "express";
/**
 * Stripe Webhook Handler
 * Handles events from Stripe (payment success, failure, etc.)
 */
export declare const handleStripeWebhook: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
