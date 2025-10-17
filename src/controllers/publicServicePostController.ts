import { Request, Response } from "express";
import ServicePost from "../models/ServicePost.js";

// 📚 Get all published posts (Public access)
export const getPublishedPosts = async (req: Request, res: Response) => {
  try {
    const { category, featured, search, page = 1, limit = 10 } = req.query;

    const query: any = { published: true };

    // Filter by category
    if (category) {
      query.category = category;
    }

    // Filter by featured status
    if (featured !== undefined) {
      query.featured = featured === "true";
    }

    // Search by title or excerpt
    if (search && typeof search === "string") {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { excerpt: { $regex: search, $options: "i" } },
      ];
    }

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const [posts, totalCount] = await Promise.all([
      ServicePost.find(query)
        .select("-__v")
        .populate("author", "name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      ServicePost.countDocuments(query),
    ]);

    res.json({
      posts,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(totalCount / limitNum),
        totalPosts: totalCount,
        postsPerPage: limitNum,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch posts" });
  }
};

// 🌟 Get featured posts (Public access)
export const getFeaturedPosts = async (req: Request, res: Response) => {
  try {
    const { limit = 3 } = req.query;
    const limitNum = parseInt(limit as string);

    const posts = await ServicePost.find({ published: true, featured: true })
      .select("-__v")
      .populate("author", "name")
      .sort({ createdAt: -1 })
      .limit(limitNum);

    res.json(posts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch featured posts" });
  }
};

// 📄 Get post by slug (Public access)
export const getPostBySlug = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;

    const post = await ServicePost.findOne({ slug, published: true })
      .select("-__v")
      .populate("author", "name email");

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Increment view count
    post.views += 1;
    await post.save();

    res.json(post);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch post" });
  }
};

// 📊 Get posts by category (Public access)
export const getPostsByCategory = async (req: Request, res: Response) => {
  try {
    const { category } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const [posts, totalCount] = await Promise.all([
      ServicePost.find({ category, published: true })
        .select("-__v")
        .populate("author", "name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      ServicePost.countDocuments({ category, published: true }),
    ]);

    res.json({
      category,
      posts,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(totalCount / limitNum),
        totalPosts: totalCount,
        postsPerPage: limitNum,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch posts by category" });
  }
};

// 🏷️ Get all categories with post counts (Public access)
export const getCategories = async (req: Request, res: Response) => {
  try {
    const categories = await ServicePost.aggregate([
      { $match: { published: true } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $project: { category: "$_id", count: 1, _id: 0 } },
    ]);

    res.json(categories);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch categories" });
  }
};

// 🔥 Get latest posts (Public access)
export const getLatestPosts = async (req: Request, res: Response) => {
  try {
    const { limit = 5 } = req.query;
    const limitNum = parseInt(limit as string);

    const posts = await ServicePost.find({ published: true })
      .select("title excerpt slug image category createdAt readTime")
      .sort({ createdAt: -1 })
      .limit(limitNum);

    res.json(posts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch latest posts" });
  }
};
