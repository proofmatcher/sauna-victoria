import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";
import {
  createStaff,
  listStaff,
  getStaffById,
  updateStaff,
  deleteStaff,
  verifyStaffEmail
} from "../controllers/staffController.js";

const router = express.Router();

/**
 * STAFF MANAGEMENT ROUTES
 * 
 * Admin routes for managing staff members (verified email addresses for notifications).
 * Staff members NEVER log in - they only receive booking notification emails.
 * 
 * All admin routes require authentication (protect) and admin role (authorize("admin")).
 */

// Admin-only routes (require authentication + admin role)
router.post("/", protect, authorize("admin"), createStaff);
router.get("/", protect, authorize("admin"), listStaff);
router.get("/:id", protect, authorize("admin"), getStaffById);
router.put("/:id", protect, authorize("admin"), updateStaff);
router.delete("/:id", protect, authorize("admin"), deleteStaff);

// Public route - staff email verification (staff clicks link in email)
router.get("/verify-email/:token", verifyStaffEmail);

export default router;
