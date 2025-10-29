import cron from "node-cron";
import Booking from "../models/Booking.js";
import Trip from "../models/Trip.js";

/**
 * This cron job runs every minute.
 * It finds all pending bookings whose hold time expired,
 * cancels them, and restores seats to the corresponding trips.
 */
export const cleanupExpiredBookings = () => {
  cron.schedule("* * * * *", async () => {
    try {
      const now = new Date();
      
      // Find expired bookings that are still pending
      const expiredBookings = await Booking.find({
        status: "pending",
        holdExpiresAt: { $lte: now },
      });

      if (expiredBookings.length === 0) return;

      console.log(`[Cron] Found ${expiredBookings.length} expired bookings to cleanup`);

      for (const booking of expiredBookings) {
        // Use atomic update to prevent race conditions with manual cancellation
        const result = await Booking.findOneAndUpdate(
          { _id: booking._id, status: "pending" }, // Only update if still pending
          { status: "cancelled" },
          { new: true }
        );

        // If booking was already cancelled by user, skip seat restoration
        if (!result) {
          console.log(`[Cron] Booking ${booking._id} already processed`);
          continue;
        }

        // Restore seats to trip if this was a trip booking
        if (booking.trip) {
          const trip = await Trip.findById(booking.trip).populate('vessel');
          if (trip) {
            // Restore seats
            if (booking.seatsBooked) {
              trip.remainingSeats += booking.seatsBooked;
              // Get capacity from associated vessel
              const vesselCapacity = (trip.vessel as any)?.capacity || 8;
              // Ensure we don't exceed capacity
              if (trip.remainingSeats > vesselCapacity) {
                trip.remainingSeats = vesselCapacity;
              }
            }
            
            // Only reset groupBooked if this booking had the full capacity
            // This prevents incorrectly resetting when individual bookings expire
            const vesselCapacity = (trip.vessel as any)?.capacity || 8;
            if (trip.remainingSeats === vesselCapacity) {
              trip.groupBooked = false;
            }
            
            await trip.save();
            console.log(`[Cron] Restored ${booking.seatsBooked} seats to trip ${trip._id}`);
          }
        }
      }

      console.log(`[Cron] Successfully cleaned up ${expiredBookings.length} expired bookings`);
    } catch (err) {
      console.error("[Cron] Error cleaning up expired bookings:", err);
    }
  });
  
  console.log("✅ Cleanup expired bookings cron job started (runs every minute)");
};
