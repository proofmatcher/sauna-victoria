import Stripe from "stripe";
import { stripe } from "../config/stripe.js";
import Booking from "../models/Booking.js";
import Trip from "../models/Trip.js";

/**
 * Create a Stripe Checkout Session for a booking
 */
export const createCheckoutSession = async (
  bookingId: string,
  successUrl: string,
  cancelUrl: string
) => {
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
  const vessel = booking.vessel as any;
  const trip = booking.trip as any;
  
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
    {
      price_data: {
        currency: "usd",
        product_data: {
          name: trip 
            ? `${vessel.name} - Trip on ${new Date(trip.departureTime).toLocaleDateString()}`
            : `${vessel.name} - Rental`,
          description: trip
            ? `${booking.seatsBooked} seat(s) for ${trip.durationMinutes} minutes`
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
export const handlePaymentSuccess = async (session: Stripe.Checkout.Session) => {
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
  await booking.save();

  // Send confirmation email to customer (async, don't wait)
  try {
    const { notifyCustomerBookingConfirmed } = await import("./notificationService.js");
    notifyCustomerBookingConfirmed(bookingId).catch(err => 
      console.error("Failed to send customer notification:", err)
    );
  } catch (err) {
    console.error("Failed to import notification service:", err);
  }

  return booking;
};

/**
 * Handle payment failure/cancellation from Stripe webhook
 */
export const handlePaymentFailure = async (session: Stripe.Checkout.Session) => {
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
          const vesselCapacity = (trip.vessel as any)?.capacity || 8;
          if (trip.remainingSeats > vesselCapacity) {
            trip.remainingSeats = vesselCapacity;
          }
        }
        
        // Reset group booking flag if capacity is fully restored
        const vesselCapacity = (trip.vessel as any)?.capacity || 8;
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
export const verifyPaymentStatus = async (bookingId: string) => {
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
