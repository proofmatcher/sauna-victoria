import mongoose from "mongoose";
import Booking from "../models/Booking.js";
import Trip from "../models/Trip.js";
import Vessel from "../models/Vessel.js";

interface CreateBookingInput {
  userId: string;
  tripId?: string;
  vesselId: string;
  seatsBooked?: number;
  startTime?: Date;
  endTime?: Date;
  isGroup?: boolean;
}

/**
 * Reserve seats or create trailer rental booking
 * This function ensures atomic update of remaining seats for trips.
 */
export const createBooking = async ({
  userId,
  tripId,
  vesselId,
  seatsBooked = 1,
  startTime,
  endTime,
  isGroup = false,
}: CreateBookingInput) => {
  const vessel = await Vessel.findById(vesselId);
  if (!vessel) {
    throw new Error("Vessel not found");
  }
  let trip;
  if (tripId) {
    // First, fetch the trip to check availability
    trip = await Trip.findById(tripId);
    if (!trip) {
      throw new Error("Trip not found");
    }

    // Check if trip is available
    if (trip.groupBooked) {
      throw new Error("Trip is already booked by a group");
    }

    // For group bookings, check if ALL seats are available (not just some)
    if (isGroup && trip.remainingSeats < trip.capacity) {
      throw new Error(`Cannot book as group. ${trip.capacity - trip.remainingSeats} seats are already held by other bookings. Please wait or book individual seats.`);
    }

    // For individual bookings, check seat availability
    if (!isGroup && trip.remainingSeats < seatsBooked) {
      throw new Error(`Not enough seats available. Only ${trip.remainingSeats} seats remaining`);
    }

    // Now atomically update the trip
    const query: any = { _id: tripId, groupBooked: false };
    if (isGroup) {
      // For group booking, require ALL seats to be available
      query.remainingSeats = trip.capacity;
    } else {
      // For individual booking, just check enough seats
      query.remainingSeats = { $gte: seatsBooked };
    }
    
    const update: any = isGroup
      ? { $set: { groupBooked: true, remainingSeats: 0 } }
      : { $inc: { remainingSeats: -seatsBooked } };

    trip = await Trip.findOneAndUpdate(query, update, { new: true });
    
    if (!trip) {
      // This should rarely happen due to pre-checks, but handle race conditions
      throw new Error("Failed to reserve seats. Trip may have been booked by someone else. Please try again.");
    }
  }

  // Calculate total price (for demo, basePriceCents * seats)
  const totalPriceCents = vessel.basePriceCents * (seatsBooked || 1);

  const booking = await Booking.create({
    user: new mongoose.Types.ObjectId(userId),
    trip: trip ? trip._id : undefined,
    vessel: vessel._id,
    seatsBooked,
    startTime,
    endTime,
    totalPriceCents,
    status: "pending",
    holdExpiresAt: new Date(Date.now() + 15 * 60 * 1000), // hold for 15 min
  });
  
  return booking;
};
