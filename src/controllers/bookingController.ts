import { Request, Response } from "express";
import { createBooking } from "../services/bookingService.js";
import Booking from "../models/Booking.js";
import Trip from "../models/Trip.js";
import {
  createCheckoutSession,
  verifyPaymentStatus,
} from "../services/stripePaymentService.js";

/**
 * Reserve a booking (trip or trailer)
 */
export const createBookingController = async (req: Request, res: Response) => {
  const userId = (req as any).user._id;
  const { tripId, vesselId, seatsBooked, startTime, endTime, isGroup } = req.body;

  try {
    const booking = await createBooking({
      userId,
      tripId,
      vesselId,
      seatsBooked,
      startTime,
      endTime,
      isGroup,
    });

    res.status(201).json({
      message: "Booking created successfully",
      booking,
    });
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

/**
 * Get all bookings for current user
 */
export const getMyBookings = async (req: Request, res: Response) => {
  const userId = (req as any).user._id;
  const bookings = await Booking.find({ user: userId })
    .populate("trip vessel")
    .sort({ createdAt: -1 });
  res.json(bookings);
};

/**
 * Cancel a pending booking (restore seats)
 */
export const cancelBooking = async (req: Request, res: Response) => {
  const userId = (req as any).user._id;
  const booking = await Booking.findOne({ _id: req.params.id, user: userId });
  if (!booking) return res.status(404).json({ message: "Booking not found" });

  if (booking.status === "cancelled") {
    return res.status(400).json({ message: "Booking is already cancelled" });
  }

  if (booking.status === "confirmed") {
    return res.status(400).json({ message: "Cannot cancel confirmed booking. Please contact support." });
  }

  // restore seats if pending trip booking
  if (booking.status === "pending" && booking.trip) {
    const trip = await Trip.findById(booking.trip);
    if (trip) {
      // Restore seats
      if (booking.seatsBooked) {
        trip.remainingSeats += booking.seatsBooked;
        // Ensure we don't exceed capacity
        if (trip.remainingSeats > trip.capacity) {
          trip.remainingSeats = trip.capacity;
        }
      }
      
      // Reset group booking flag if this was a group booking
      // Check if this booking had booked all seats
      if (trip.remainingSeats === trip.capacity) {
        trip.groupBooked = false;
      }
      
      await trip.save();
    }
  }

  booking.status = "cancelled";
  await booking.save();

  res.json({ message: "Booking cancelled successfully", booking });
};

/**
 * Initialize payment for a booking
 * Creates a Stripe Checkout session
 */
export const initiatePayment = async (req: Request, res: Response) => {
  const userId = (req as any).user._id;
  const { bookingId, successUrl, cancelUrl } = req.body;

  try {
    // Verify booking belongs to user
    const booking = await Booking.findOne({ _id: bookingId, user: userId });
    
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (booking.status !== "pending") {
      return res.status(400).json({ 
        message: `Cannot initiate payment. Booking status is ${booking.status}` 
      });
    }

    // Create Stripe checkout session
    const checkoutSession = await createCheckoutSession(
      bookingId,
      successUrl || `${process.env.FRONTEND_URL}/booking/success?bookingId=${bookingId}`,
      cancelUrl || `${process.env.FRONTEND_URL}/booking/cancel?bookingId=${bookingId}`
    );

    res.json({
      message: "Checkout session created",
      sessionId: checkoutSession.sessionId,
      url: checkoutSession.url,
    });
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

/**
 * Verify payment status for a booking
 */
export const checkPaymentStatus = async (req: Request, res: Response) => {
  const userId = (req as any).user._id;
  const bookingId = req.params.bookingId;

  if (!bookingId) {
    return res.status(400).json({ message: "Booking ID is required" });
  }

  try {
    // Verify booking belongs to user
    const booking = await Booking.findOne({ _id: bookingId, user: userId });
    
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const paymentStatus = await verifyPaymentStatus(bookingId);

    res.json({
      bookingId,
      ...paymentStatus,
    });
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};
