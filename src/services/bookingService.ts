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
  // Customer information (for boat/trailer bookings)
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
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
  customerName,
  customerEmail,
  customerPhone,
}: CreateBookingInput) => {
  const vessel = await Vessel.findById(vesselId);
  if (!vessel) {
    throw new Error("Vessel not found");
  }
  let trip;
  if (tripId) {
    // First, fetch the trip to check availability - populate vessel to get capacity
    trip = await Trip.findById(tripId).populate('vessel');
    if (!trip) {
      throw new Error("Trip not found");
    }

    // Check vessel type to handle mobile saunas differently
    const vesselType = (trip.vessel as any)?.type;
    
    if (vesselType === 'mobile_sauna') {
      // For mobile saunas, don't modify trip capacity - each booking is independent
      // Mobile saunas have unlimited availability slots, capacity refers to people accommodation
      // No need to update remainingSeats for mobile saunas
    } else {
      // Handle regular boat/trailer trips with seat management
      // Check if trip is available
      if (trip.groupBooked) {
        throw new Error("Trip is already booked by a group");
      }

      // Get capacity from vessel - trip must be populated with vessel
      const vesselCapacity = (trip.vessel as any)?.capacity || 8;
      
      // For group bookings, check if ALL seats are available (not just some)
      if (isGroup && trip.remainingSeats < vesselCapacity) {
        throw new Error(`Cannot book as group. ${vesselCapacity - trip.remainingSeats} seats are already held by other bookings. Please wait or book individual seats.`);
      }

      // For individual bookings, check seat availability
      if (!isGroup && trip.remainingSeats < seatsBooked) {
        throw new Error(`Not enough seats available. Only ${trip.remainingSeats} seats remaining`);
      }

      // Now atomically update the trip (only for non-mobile saunas)
      const query: any = { _id: tripId, groupBooked: false };
      if (isGroup) {
        // For group booking, require ALL seats to be available
        query.remainingSeats = vesselCapacity;
      } else {
        // For individual booking, just check enough seats
        query.remainingSeats = { $gte: seatsBooked };
      }
      
      const update: any = isGroup
        ? { $set: { groupBooked: true, remainingSeats: 0 } }
        : { $inc: { remainingSeats: -seatsBooked } };

      trip = await Trip.findOneAndUpdate(query, update, { new: true });
    }
    
    if (!trip && vesselType !== 'mobile_sauna') {
      // This should rarely happen due to pre-checks, but handle race conditions
      // Only throw error for non-mobile saunas since they don't update trip
      throw new Error("Failed to reserve seats. Trip may have been booked by someone else. Please try again.");
    }
  }

  // Calculate total price (for demo, basePriceCents * seats)
  const totalPriceCents = vessel.basePriceCents * (seatsBooked || 1);

  // Get hold time from env or default to 30 minutes (Stripe minimum)
  const holdMinutes = parseInt(process.env.HOLD_MINUTES || "30", 10);
  const holdTime = Math.max(holdMinutes, 30); // Ensure minimum 30 minutes for Stripe compatibility

  const booking = await Booking.create({
    user: new mongoose.Types.ObjectId(userId),
    trip: trip ? trip._id : undefined,
    vessel: vessel._id,
    seatsBooked,
    startTime,
    endTime,
    totalPriceCents,
    status: "pending",
    holdExpiresAt: new Date(Date.now() + holdTime * 60 * 1000), // hold time in minutes
    // Customer information
    customerName,
    customerEmail,
    customerPhone,
  });
  
  return booking;
};
