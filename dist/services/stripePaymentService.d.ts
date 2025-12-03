import Stripe from "stripe";
/**
 * Create a Stripe Checkout Session for a booking
 */
export declare const createCheckoutSession: (bookingId: string, successUrl: string, cancelUrl: string) => Promise<{
    sessionId: string;
    url: string | null;
}>;
/**
 * Handle successful payment from Stripe webhook
 */
export declare const handlePaymentSuccess: (session: Stripe.Checkout.Session) => Promise<import("mongoose").Document<unknown, {}, import("../models/Booking.js").IBooking, {}, {}> & import("../models/Booking.js").IBooking & Required<{
    _id: unknown;
}> & {
    __v: number;
}>;
/**
 * Handle payment failure/cancellation from Stripe webhook
 */
export declare const handlePaymentFailure: (session: Stripe.Checkout.Session) => Promise<(import("mongoose").Document<unknown, {}, import("../models/Booking.js").IBooking, {}, {}> & import("../models/Booking.js").IBooking & Required<{
    _id: unknown;
}> & {
    __v: number;
}) | undefined>;
/**
 * Verify payment status for a booking
 */
export declare const verifyPaymentStatus: (bookingId: string) => Promise<{
    status: "pending" | "confirmed" | "cancelled";
    paymentStatus: string;
    sessionStatus?: undefined;
} | {
    status: "pending" | "confirmed" | "cancelled";
    paymentStatus: Stripe.Checkout.Session.PaymentStatus;
    sessionStatus: Stripe.Checkout.Session.Status | null;
}>;
