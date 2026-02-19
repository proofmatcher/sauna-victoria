import express from "express";
import { protect } from "../middleware/authMiddleware.js";
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
} from "../controllers/bookingController.js";

const router = express.Router();

// Regular booking routes (trips, trailers)
router.post("/createBooking", protect, createBookingController); // Reserve booking
router.get("/me", protect, getMyBookings);          // View my bookings
router.put("/cancel/:id", protect, cancelBooking);  // Cancel pending booking
router.post("/accept-agreement", protect, acceptBookingAgreement); // Accept agreement after preview
router.post("/initiate-payment", protect, initiatePayment); // Create Stripe checkout session
router.get("/payment-status/:bookingId", protect, checkPaymentStatus); // Check payment status

// Availability routes
router.get("/vessels/:vesselId/availability", getVesselAvailability); // Get day-by-day availability
router.get("/vessels/:vesselId/booked-dates", getVesselBookedDates); // Get all booked periods

// Pricing preview route (public - no authentication required)
router.get("/vessels/:vesselId/pricing-preview", getMobileSaunaPricingPreview); // Get pricing breakdown

// Mobile sauna booking route (works through trips)
router.post("/mobile-sauna", protect, createMobileSaunaBooking);  // Create mobile sauna booking (protected)

export default router;