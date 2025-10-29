import { Request, Response } from "express";
import Booking from "../models/Booking.js";
import Trip from "../models/Trip.js";

// 📘 Get all bookings (with optional filters)
export const getAllBookings = async (req: Request, res: Response) => {
  try {
    const { status, tripId, userId } = req.query;

    const query: any = {};
    if (status) query.status = status;
    if (tripId) query.trip = tripId;
    if (userId) query.user = userId;

    const bookings = await Booking.find(query)
      .populate("user", "name email")
      .populate("trip", "title type startTime");
    
    res.json(bookings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch bookings" });
  }
};

// 📗 Manually confirm a booking (useful if payment verified outside Stripe)
export const confirmBooking = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findById(id);
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    booking.status = "confirmed";
    await booking.save();

    res.json({ message: "Booking confirmed", booking });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error confirming booking" });
  }
};

// 📕 Cancel a booking manually
export const cancelBooking = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findById(id);
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    // Restore seats if trip exists
    if (booking.trip) {
      const trip = await Trip.findById(booking.trip).populate('vessel');
      if (trip) {
        trip.remainingSeats += booking.seatsBooked || 0;
        const vesselCapacity = (trip.vessel as any)?.capacity || 8;
        if (trip.remainingSeats > vesselCapacity) trip.remainingSeats = vesselCapacity;
        trip.groupBooked = false;
        await trip.save();
      }
    }

    booking.status = "cancelled";
    await booking.save();

    res.json({ message: "Booking cancelled", booking });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error cancelling booking" });
  }
};

// 📄 Get booking details by ID
export const getBookingById = async (req: Request, res: Response) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate("user", "name email")
      .populate("trip", "title type startTime");
    if (!booking) return res.status(404).json({ message: "Booking not found" });
    res.json(booking);
  } catch (err) {
    res.status(500).json({ message: "Error fetching booking details" });
  }
};
