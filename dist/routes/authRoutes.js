import express from "express";
import { registerUser, loginUser } from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";
const router = express.Router();
router.post("/register", registerUser);
router.post("/login", loginUser);
// Protected route example
router.get("/profile", protect, (req, res) => {
    res.json({ message: "Welcome, authenticated user!", user: req.user });
});
export default router;
//# sourceMappingURL=authRoutes.js.map