import { stripe } from "../config/stripe.js";
import Booking from "../models/Booking.js";
import Trip from "../models/Trip.js";
/**
 * Create a Stripe Checkout Session for a booking
 */
export const createCheckoutSession = async (bookingId, successUrl, cancelUrl) => {
    const booking = await Booking.findById(bookingId).populate("vessel trip");
    if (!booking) {
        throw new Error("Booking not found");
    }
    if (booking.status !== "pending") {
        throw new Error("Booking is not in pending status");
    }
    // Check if booking has expired
    if (booking.holdExpiresAt && booking.holdExpiresAt < new Date()) {
        throw new Error("Booking hold has expired. Please create a new booking.");
    }
    // Build line items for Stripe
    const vessel = booking.vessel;
    const trip = booking.trip;
    const lineItems = [
        {
            price_data: {
                currency: "usd",
                product_data: {
                    name: trip
                        ? `${vessel.name} - Trip on ${new Date(trip.departureTime).toLocaleDateString()}`
                        : `${vessel.name} - Rental`,
                    description: trip
                        ? `1 seat Booked`
                        : `Rental from ${booking.startTime?.toLocaleString()} to ${booking.endTime?.toLocaleString()}`,
                },
                unit_amount: Math.round(booking.totalPriceCents), // Stripe expects amount in cents
            },
            quantity: 1,
        },
    ];
    // Calculate expiry time - Stripe requires minimum 30 minutes
    // Use the later of: booking expiry or 30 minutes from now
    const minExpiryTime = Date.now() + 30 * 60 * 1000; // 30 minutes from now (Stripe minimum)
    const bookingExpiryTime = booking.holdExpiresAt ? booking.holdExpiresAt.getTime() : minExpiryTime;
    const expiryTime = Math.max(minExpiryTime, bookingExpiryTime);
    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: lineItems,
        mode: "payment",
        success_url: successUrl,
        cancel_url: cancelUrl,
        client_reference_id: bookingId,
        metadata: {
            bookingId: bookingId,
            userId: booking.user?.toString() || "",
        },
        expires_at: Math.floor(expiryTime / 1000), // Stripe expects Unix timestamp in seconds
    });
    // Store session ID in booking
    booking.stripeSessionId = session.id;
    await booking.save();
    return {
        sessionId: session.id,
        url: session.url,
    };
};
/**
 * Handle successful payment from Stripe webhook
 */
export const handlePaymentSuccess = async (session) => {
    const bookingId = session.metadata?.bookingId || session.client_reference_id;
    if (!bookingId) {
        throw new Error("No booking ID found in session metadata");
    }
    const booking = await Booking.findById(bookingId);
    if (!booking) {
        throw new Error(`Booking not found: ${bookingId}`);
    }
    // Update booking status to confirmed
    booking.status = "confirmed";
    booking.stripeSessionId = session.id;
    // Store PaymentIntent ID for future refunds (damage deposit)
    if (session.payment_intent) {
        booking.stripePaymentIntentId = typeof session.payment_intent === 'string'
            ? session.payment_intent
            : session.payment_intent.id;
        console.log(`💳 Stored PaymentIntent ID: ${booking.stripePaymentIntentId}`);
    }
    // For mobile sauna bookings, set the rental period starting now
    if (booking.daysBooked && booking.daysBooked > 0) {
        // Check if this is a mobile sauna booking by populating vessel
        await booking.populate('vessel');
        const vessel = booking.vessel;
        if (vessel && vessel.type === 'mobile_sauna') {
            const rentalStartTime = new Date(); // Rental starts when payment is confirmed
            const rentalEndTime = new Date(rentalStartTime);
            rentalEndTime.setDate(rentalEndTime.getDate() + booking.daysBooked);
            booking.startTime = rentalStartTime;
            booking.endTime = rentalEndTime;
            console.log(`🚀 Mobile sauna rental activated: ${vessel.name}`);
            console.log(`📅 Rental period: ${rentalStartTime.toISOString()} to ${rentalEndTime.toISOString()}`);
            console.log(`🏠 Delivery address: ${booking.deliveryAddress}`);
        }
    }
    await booking.save();
    // Generate and save agreement PDF for mobile sauna bookings
    try {
        await booking.populate('vessel');
        const vessel = booking.vessel;
        if (vessel && vessel.type === 'mobile_sauna') {
            // Format capacity: if integer, convert to "X person" format
            let capacityStr = '4 person'; // Default fallback
            if (vessel.capacity) {
                if (typeof vessel.capacity === 'number') {
                    capacityStr = `${vessel.capacity} person`;
                }
                else if (typeof vessel.capacity === 'string') {
                    capacityStr = vessel.capacity.toLowerCase().includes('person')
                        ? vessel.capacity
                        : `${vessel.capacity} person`;
                }
            }
            else if (vessel.name) {
                capacityStr = vessel.name;
            }
            const bookingAgreementService = (await import("./bookingAgreementService.js")).default;
            await bookingAgreementService.generateAndSaveBookingAgreement({
                bookingId: booking._id.toString(),
                customerName: booking.customerName || 'Customer',
                deliveryAddress: booking.deliveryAddress || '',
                customerEmail: booking.customerEmail || '',
                customerPhone: booking.customerPhone || '',
                agreementDate: new Date().toISOString().split('T')[0],
                capacity: capacityStr,
                dropoffDate: booking.startTime ? new Date(booking.startTime).toISOString().split('T')[0] : '',
                pickupDate: booking.endTime ? new Date(booking.endTime).toISOString().split('T')[0] : '',
                rentalFee: booking.totalPriceCents ? `$${(booking.totalPriceCents / 100).toFixed(2)}` : '',
                ipAddress: session.customer_details?.address?.country || 'Unknown'
            });
            console.log(`📄 Agreement PDF generated and saved for booking: ${booking._id.toString()}`);
        }
    }
    catch (err) {
        console.error("Failed to generate agreement PDF:", err);
        // Don't fail the payment if PDF generation fails
    }
    // Send confirmation email to customer (async, don't wait)
    try {
        // Check if this is a mobile sauna booking
        await booking.populate('vessel');
        const vessel = booking.vessel;
        if (vessel && vessel.type === 'mobile_sauna') {
            // Use mobile sauna specific email template
            const { notifyCustomerMobileSaunaBookingConfirmed } = await import("./notificationService.js");
            notifyCustomerMobileSaunaBookingConfirmed(bookingId).catch(err => console.error("Failed to send mobile sauna notification:", err));
        }
        else {
            // Use regular boat trip email template
            const { notifyCustomerBookingConfirmed } = await import("./notificationService.js");
            notifyCustomerBookingConfirmed(bookingId).catch(err => console.error("Failed to send customer notification:", err));
        }
    }
    catch (err) {
        console.error("Failed to import notification service:", err);
    }
    return booking;
};
/**
 * Handle payment failure/cancellation from Stripe webhook
 */
export const handlePaymentFailure = async (session) => {
    const bookingId = session.metadata?.bookingId || session.client_reference_id;
    if (!bookingId) {
        console.log("No booking ID found in expired session");
        return;
    }
    const booking = await Booking.findById(bookingId);
    if (!booking) {
        console.log(`Booking not found: ${bookingId}`);
        return;
    }
    // Only cancel if still pending
    if (booking.status === "pending") {
        // Restore seats if it's a trip booking
        if (booking.trip) {
            const trip = await Trip.findById(booking.trip).populate('vessel');
            if (trip) {
                if (booking.seatsBooked) {
                    trip.remainingSeats += booking.seatsBooked;
                    const vesselCapacity = trip.vessel?.capacity || 8;
                    if (trip.remainingSeats > vesselCapacity) {
                        trip.remainingSeats = vesselCapacity;
                    }
                }
                // Reset group booking flag if capacity is fully restored
                const vesselCapacity = trip.vessel?.capacity || 8;
                if (trip.remainingSeats === vesselCapacity) {
                    trip.groupBooked = false;
                }
                await trip.save();
            }
        }
        booking.status = "cancelled";
        await booking.save();
    }
    return booking;
};
/**
 * Verify payment status for a booking
 */
export const verifyPaymentStatus = async (bookingId) => {
    const booking = await Booking.findById(bookingId);
    if (!booking) {
        throw new Error("Booking not found");
    }
    if (!booking.stripeSessionId) {
        return {
            status: booking.status,
            paymentStatus: "no_payment_initiated",
        };
    }
    // Retrieve session from Stripe
    const session = await stripe.checkout.sessions.retrieve(booking.stripeSessionId);
    return {
        status: booking.status,
        paymentStatus: session.payment_status,
        sessionStatus: session.status,
    };
};
//# sourceMappingURL=stripePaymentService.js.map