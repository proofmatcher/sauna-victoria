import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  createBookingController,
  getMyBookings,
  cancelBooking,
} from "../controllers/bookingController.js";

const router = express.Router();

router.post("/createBooking", protect, createBookingController); // Reserve booking
router.get("/me", protect, getMyBookings);          // View my bookings
router.put("/cancel/:id", protect, cancelBooking);  // Cancel pending booking

export default router;