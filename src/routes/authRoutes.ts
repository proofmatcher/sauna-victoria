import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import type { AuthRequest } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";
import { 
  loginRateLimiter, 
  passwordResetRateLimiter, 
  registrationRateLimiter 
} from "../middleware/rateLimitMiddleware.js";
import {
  registerUser,
  loginUser,
  forgotPassword,
  resetPassword,
  logoutUser,
  refreshToken,
  logoutAllSessions,
  getCurrentUser,
  verifyEmail,
  resendVerificationEmail,
} from "../controllers/authController.js";

const router = express.Router();

// Public routes (with rate limiting)
router.post("/register", registrationRateLimiter, registerUser);
router.post("/login", loginRateLimiter, loginUser);
router.post("/forgot-password", passwordResetRateLimiter, forgotPassword);
router.post("/reset-password/:token", resetPassword);
router.get("/verify-email/:token", verifyEmail);
router.post("/resend-verification", passwordResetRateLimiter, resendVerificationEmail);

// Token management routes
router.post("/refresh-token", refreshToken);

// Protected routes (require authentication)
router.post("/logout", protect, logoutUser);
router.post("/logout-all", protect, authorize("admin"), logoutAllSessions);
router.get("/me", protect, getCurrentUser);

// Protected route example
router.get("/profile", protect, (req: AuthRequest, res) => {
  res.json({ message: "Welcome, authenticated user!", user: req.user });
});


// Admin-only example route
router.get("/admin-dashboard", protect, authorize("admin"), (req, res) => {
  res.json({ message: "Welcome Admin, you have full access!" });
});

export default router;