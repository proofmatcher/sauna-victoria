import Trip from "../models/Trip.js";
import Vessel from "../models/Vessel.js";

/**
 * Get the current capacity for a trip by fetching it from the associated vessel
 * This ensures capacity is always up-to-date with vessel changes
 */
export const getTripCapacity = async (tripId: string): Promise<number> => {
  const trip = await Trip.findById(tripId).populate("vessel");
  if (!trip || !trip.vessel) {
    throw new Error("Trip or associated vessel not found");
  }
  
  const vessel = trip.vessel as any;
  return vessel.capacity || 8; // Default to 8 if capacity not set
};

/**
 * Update remaining seats for a trip based on current vessel capacity
 * Useful when vessel capacity changes and you need to adjust existing trips
 */
export const updateTripSeatsBasedOnVessel = async (tripId: string) => {
  const trip = await Trip.findById(tripId).populate("vessel");
  if (!trip || !trip.vessel) {
    throw new Error("Trip or associated vessel not found");
  }
  
  const vessel = trip.vessel as any;
  const newCapacity = vessel.capacity || 8;
  
  // Don't increase remaining seats beyond new capacity
  const currentBookedSeats = Math.max(0, trip.remainingSeats); // Ensure not negative
  const bookedSeatsCount = Math.max(0, newCapacity - currentBookedSeats); // How many are actually booked
  
  // New remaining seats = new capacity - actually booked seats
  const newRemainingSeats = Math.max(0, newCapacity - bookedSeatsCount);
  
  await Trip.findByIdAndUpdate(tripId, {
    remainingSeats: newRemainingSeats
  });
  
  return {
    oldCapacity: currentBookedSeats + bookedSeatsCount,
    newCapacity,
    oldRemainingSeats: trip.remainingSeats,
    newRemainingSeats,
    bookedSeats: bookedSeatsCount
  };
};

/**
 * Get trip with capacity information
 * This ensures the capacity is always fetched from vessel
 */
export const getTripWithCapacity = async (tripId: string) => {
  const trip = await Trip.findById(tripId)
    .populate("vessel", "name capacity type basePriceCents active")
    .populate("assignedStaff", "name email phone isStaff");
    
  if (!trip) {
    throw new Error("Trip not found");
  }
  
  // Add capacity to the response object
  const vessel = trip.vessel as any;
  const tripWithCapacity = trip.toObject() as any;
  tripWithCapacity.capacity = vessel?.capacity || 8;
  
  return tripWithCapacity;
};