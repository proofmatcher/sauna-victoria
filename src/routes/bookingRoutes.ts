import express from "express";
import { protect, verifyGuestOrAdmin } from "../middleware/authMiddleware.js";
import {
  createBookingController,
  getMyBookings,
  cancelBooking,
  initiatePayment,
  checkPaymentStatus,
  createMobileSaunaBooking,
  getVesselAvailability,
  getVesselBookedDates,
  getMobileSaunaPricingPreview,
  acceptBookingAgreement,
  lookupBooking,
} from "../controllers/bookingController.js";

const router = express.Router();

// Booking creation routes (allow guests and admins)
router.post("/createBooking", verifyGuestOrAdmin, createBookingController); // Reserve booking
router.post("/accept-agreement", verifyGuestOrAdmin, acceptBookingAgreement); // Accept agreement after preview
router.post("/initiate-payment", verifyGuestOrAdmin, initiatePayment); // Create Stripe checkout session
router.post("/mobile-sauna", verifyGuestOrAdmin, createMobileSaunaBooking);  // Create mobile sauna booking

// Admin-only booking management routes
router.get("/me", protect, getMyBookings);          // View my bookings
router.put("/cancel/:id", protect, cancelBooking);  // Cancel pending booking
router.get("/payment-status/:bookingId", protect, checkPaymentStatus); // Check payment status

// Availability routes
router.get("/vessels/:vesselId/availability", getVesselAvailability); // Get day-by-day availability
router.get("/vessels/:vesselId/booked-dates", getVesselBookedDates); // Get all booked periods

// Pricing preview route (public - no authentication required)
router.get("/vessels/:vesselId/pricing-preview", getMobileSaunaPricingPreview); // Get pricing breakdown

// Guest booking lookup route (public - no authentication required)
router.post("/lookup", lookupBooking); // Lookup booking by email and booking ID

export default router;