import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";

import {
  getAllBookings,
  confirmBooking,
  cancelBooking,
  getBookingById,
} from "../controllers/adminBookingController.js";

const router = express.Router();

router.get("/getAll", protect, authorize("admin"), getAllBookings); // View all bookings with optional filters
router.get("/getById/:id", protect, authorize("admin"), getBookingById); // View booking details by ID
router.put("/confirm/:id", protect, authorize("admin"), confirmBooking); // Manually confirm a booking
router.put("/cancel/:id", protect, authorize("admin"), cancelBooking); // Manually cancel a booking

export default router;
