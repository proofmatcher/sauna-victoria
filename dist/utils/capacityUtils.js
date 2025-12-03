import Trip from "../models/Trip.js";
import Vessel from "../models/Vessel.js";
/**
 * Handles vessel capacity changes and updates all affected trips
 * @param vesselId - The vessel ID to update
 * @param newCapacity - The new capacity to set
 * @returns Result of the capacity change operation
 */
export const handleVesselCapacityChange = async (vesselId, newCapacity) => {
    try {
        // 1. Get the vessel and validate it exists
        const vessel = await Vessel.findById(vesselId);
        if (!vessel) {
            return {
                success: false,
                message: "Vessel not found"
            };
        }
        const oldCapacity = vessel.capacity || 8;
        // 2. If capacity is the same, no changes needed
        if (oldCapacity === newCapacity) {
            return {
                success: true,
                message: "Capacity is already set to this value",
                affectedTrips: 0
            };
        }
        // 3. Get all trips using this vessel
        const trips = await Trip.find({ vessel: vesselId });
        // 4. For capacity reduction, validate no trip has more bookings than new capacity
        if (newCapacity < oldCapacity) {
            const invalidTrips = trips.filter(trip => {
                const bookedSeats = oldCapacity - trip.remainingSeats;
                return bookedSeats > newCapacity;
            });
            if (invalidTrips.length > 0) {
                const tripDetails = invalidTrips.map(trip => {
                    const bookedSeats = oldCapacity - trip.remainingSeats;
                    return `Trip "${trip.title}" has ${bookedSeats} booked seats`;
                }).join(', ');
                return {
                    success: false,
                    message: `Cannot reduce capacity to ${newCapacity}. ${tripDetails}. Current bookings exceed new capacity.`
                };
            }
        }
        // 5. Update vessel capacity
        vessel.capacity = newCapacity;
        await vessel.save();
        // 6. Update all affected trips' remainingSeats
        const updatedTrips = [];
        const errors = [];
        for (const trip of trips) {
            try {
                const bookedSeats = oldCapacity - trip.remainingSeats;
                const newRemainingSeats = newCapacity - bookedSeats;
                // Ensure remaining seats is not negative (safety check)
                trip.remainingSeats = Math.max(0, newRemainingSeats);
                // If capacity decrease results in no remaining seats, mark as full
                if (newRemainingSeats <= 0) {
                    trip.groupBooked = true;
                }
                else if (trip.groupBooked && newRemainingSeats > 0) {
                    // If there are now available seats, unmark group booking
                    trip.groupBooked = false;
                }
                await trip.save();
                updatedTrips.push(trip._id.toString());
                console.log(`✅ Updated trip ${trip.title}: ${oldCapacity}→${newCapacity} capacity, ${trip.remainingSeats} remaining seats`);
            }
            catch (error) {
                errors.push(`Failed to update trip ${trip.title}: ${error}`);
            }
        }
        return {
            success: true,
            message: `Vessel capacity updated from ${oldCapacity} to ${newCapacity}. ${updatedTrips.length} trips updated.`,
            affectedTrips: updatedTrips.length,
            details: {
                oldCapacity,
                newCapacity,
                tripsUpdated: updatedTrips,
                ...(errors.length > 0 && { errors })
            }
        };
    }
    catch (error) {
        console.error('Error handling vessel capacity change:', error);
        return {
            success: false,
            message: `Failed to update vessel capacity: ${error}`
        };
    }
};
/**
 * Get booking statistics for a trip
 * @param trip - The trip document (must have vessel populated)
 * @returns Booking statistics
 */
export const getTripBookingStats = (trip) => {
    const capacity = trip.vessel?.capacity || 8;
    const booked = capacity - trip.remainingSeats;
    const available = trip.remainingSeats;
    const utilizationPercent = capacity > 0 ? Math.round((booked / capacity) * 100) : 0;
    return {
        capacity,
        booked: Math.max(0, booked),
        available: Math.max(0, available),
        utilizationPercent,
        isFullyBooked: available <= 0,
        isGroupBooking: trip.groupBooked
    };
};
//# sourceMappingURL=capacityUtils.js.map