/**
 * This cron job runs every minute.
 * It finds all pending bookings whose hold time expired,
 * cancels them, and restores seats to the corresponding trips.
 */
export declare const cleanupExpiredBookings: () => void;
