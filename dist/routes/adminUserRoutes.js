import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";
import { getAllUsers, getUserById, deactivateUser, reactivateUser, updateUserRole, getStaffMembers, } from "../controllers/adminUserController.js";
const router = express.Router();
// All routes require admin authentication
router.get("/", protect, authorize("admin"), getAllUsers); // Get all users with filters
router.get("/staff/list", protect, authorize("admin"), getStaffMembers); // Get all staff members
router.get("/:id", protect, authorize("admin"), getUserById); // Get user details + bookings
router.put("/:id/deactivate", protect, authorize("admin"), deactivateUser); // Deactivate user
router.put("/:id/reactivate", protect, authorize("admin"), reactivateUser); // Reactivate user
router.put("/:id/role", protect, authorize("admin"), updateUserRole); // Update user role
export default router;
//# sourceMappingURL=adminUserRoutes.js.map