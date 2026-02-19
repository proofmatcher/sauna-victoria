/**
 * Send trip assignment notification to staff members
 */
export declare const notifyStaffAboutTrip: (tripId: string) => Promise<{
    success: boolean;
    notifiedCount: number;
} | undefined>;
/**
 * Send booking confirmation email to customer with trip details
 */
export declare const notifyCustomerBookingConfirmed: (bookingId: string) => Promise<{
    success: boolean;
}>;
/**
 * Send mobile sauna booking confirmation email with delivery and rental details
 */
export declare const notifyCustomerMobileSaunaBookingConfirmed: (bookingId: string) => Promise<{
    success: boolean;
}>;
/**
 * Send trip reminder to both staff and customers (24 hours before trip)
 */
export declare const sendTripReminders: (tripId: string) => Promise<{
    success: boolean;
    customersSent: number;
    staffSent: number;
}>;
