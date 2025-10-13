import { Request, Response } from "express";
import { createBooking } from "../services/bookingService.js";
import Booking from "../models/Booking.js";
import Trip from "../models/Trip.js";

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
