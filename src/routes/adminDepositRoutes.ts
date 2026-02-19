import express from "express";
import { 
  forfeitDeposit, 
  manualRefundDeposit, 
  getDepositStatus,
  triggerRefundCheck
} from "../controllers/adminDepositController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";

const router = express.Router();

// All routes require authentication and admin role
router.use(protect);
router.use(authorize('admin'));

/**
 * POST /api/admin/bookings/deposits/trigger-refund-check
 * Manually trigger the automatic refund check (for testing)
 * MUST come before /:id routes to avoid conflicts
 */
router.post("/deposits/trigger-refund-check", triggerRefundCheck);

/**
 * GET /api/admin/bookings/:id/deposit-status
 * Get deposit status and auto-refund countdown
 */
router.get("/:id/deposit-status", getDepositStatus);

/**
 * POST /api/admin/bookings/:id/forfeit-deposit
 * Forfeit damage deposit (keep the deposit, don't refund)
 * Body: { reason: string }
 */
router.post("/:id/forfeit-deposit", forfeitDeposit);

/**
 * POST /api/admin/bookings/:id/refund-deposit
 * Manually refund damage deposit immediately
 */
router.post("/:id/refund-deposit", manualRefundDeposit);

export default router;