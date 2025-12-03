import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";
import { uploadOptionalImage } from "../middleware/uploadMiddleware.js";
import { createPost, getAllPosts, getPostById, updatePost, deletePost, toggleFeatured, togglePublished, getPostStats, } from "../controllers/adminServicePostController.js";
const router = express.Router();
// All routes require admin authentication
router.post("/", protect, authorize("admin"), uploadOptionalImage("image"), createPost); // Create new post
router.get("/", protect, authorize("admin"), getAllPosts); // Get all posts (including drafts)
router.get("/stats", protect, authorize("admin"), getPostStats); // Get post statistics
router.get("/:id", protect, authorize("admin"), getPostById); // Get post by ID
router.put("/:id", protect, authorize("admin"), uploadOptionalImage("image"), updatePost); // Update post
router.delete("/:id", protect, authorize("admin"), deletePost); // Delete post
router.patch("/:id/featured", protect, authorize("admin"), toggleFeatured); // Toggle featured status
router.patch("/:id/published", protect, authorize("admin"), togglePublished); // Toggle published status
export default router;
//# sourceMappingURL=adminServicePostRoutes.js.map