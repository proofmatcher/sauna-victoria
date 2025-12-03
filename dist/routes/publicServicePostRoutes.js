import express from "express";
import { getPublishedPosts, getFeaturedPosts, getPostBySlug, getPostsByCategory, getCategories, getLatestPosts, } from "../controllers/publicServicePostController.js";
const router = express.Router();
// Public routes - no authentication required
router.get("/posts", getPublishedPosts); // Get all published posts with filters
router.get("/posts/featured", getFeaturedPosts); // Get featured posts
router.get("/posts/latest", getLatestPosts); // Get latest posts
router.get("/posts/slug/:slug", getPostBySlug); // Get post by slug
router.get("/posts/category/:category", getPostsByCategory); // Get posts by category
router.get("/categories", getCategories); // Get all categories with counts
export default router;
//# sourceMappingURL=publicServicePostRoutes.js.map