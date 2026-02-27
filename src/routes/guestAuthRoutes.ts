import express from "express";
import { passwordResetRateLimiter } from "../middleware/rateLimitMiddleware.js";
import {
  sendVerificationCode,
  verifyCode
} from "../controllers/guestAuthController.js";

const router = express.Router();

/**
 * GUEST AUTHENTICATION ROUTES
 * 
 * These routes handle OTP-based email verification for guest checkout.
 * No user accounts are created - guests verify their email before payment.
 */

// Send OTP code to guest email
// Rate limited to prevent spam
router.post("/send-code", passwordResetRateLimiter, sendVerificationCode);

// Verify OTP code and receive temporary JWT token
// Rate limited to prevent brute force
router.post("/verify-code", passwordResetRateLimiter, verifyCode);

export default router;
