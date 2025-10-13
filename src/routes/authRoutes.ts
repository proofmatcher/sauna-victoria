import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import type { AuthRequest } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";
import {
  registerUser,
  loginUser,
  forgotPassword,
  resetPassword,
} from "../controllers/authController.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);

router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);

// Protected route example
router.get("/profile", protect, (req: AuthRequest, res) => {
  res.json({ message: "Welcome, authenticated user!", user: req.user });
});


// Admin-only example route
router.get("/admin-dashboard", protect, authorize("admin"), (req, res) => {
  res.json({ message: "Welcome Admin, you have full access!" });
});

export default router;