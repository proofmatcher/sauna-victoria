import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";

import {
  getMobileSaunaBookings,
  updateMobileSaunaBooking,
  deleteMobileSaunaBooking,
  getMobileSaunaBookingById,
} from "../controllers/adminMobileSaunaController.js";

const router = express.Router();

// All routes require admin authentication
router.use(protect);
router.use(authorize("admin"));

// GET /api/admin/mobile-saunas - Get all confirmed mobile sauna bookings
router.get("/", getMobileSaunaBookings);

// GET /api/admin/mobile-saunas/:id - Get single mobile sauna booking
router.get("/:id", getMobileSaunaBookingById);

// PUT /api/admin/mobile-saunas/:id - Update mobile sauna booking details
router.put("/:id", updateMobileSaunaBooking);

// DELETE /api/admin/mobile-saunas/:id - Delete mobile sauna booking
router.delete("/:id", deleteMobileSaunaBooking);

export default router;