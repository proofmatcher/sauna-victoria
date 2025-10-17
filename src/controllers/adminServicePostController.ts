import { Response } from "express";
import ServicePost from "../models/ServicePost.js";
import { AuthRequest } from "../middleware/authMiddleware.js";

// 📝 Create a new service post (Admin only)
export const createPost = async (req: AuthRequest, res: Response) => {
  try {
    const { title, excerpt, content, readTime, category, image, featured, published } = req.body;

    // Validate required fields
    if (!title || !excerpt || !content) {
      return res.status(400).json({ 
        message: "Title, excerpt, and content are required" 
      });
    }

    // Check if slug already exists
    const slug = title
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();

    const existingPost = await ServicePost.findOne({ slug });
    if (existingPost) {
      return res.status(400).json({ 
        message: "A post with this title already exists. Please use a different title." 
      });
    }

    const post = await ServicePost.create({
      title,
      excerpt,
      content,
      readTime: readTime || "5 min read",
      category: category || "general",
      image,
      featured: featured || false,
      published: published || false,
      author: req.user?._id,
    });

    const populatedPost = await ServicePost.findById(post._id).populate("author", "name email");

    res.status(201).json({
      message: "Service post created successfully",
      post: populatedPost,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to create service post" });
  }
};

// 📚 Get all posts (Admin view - includes unpublished)
export const getAllPosts = async (req: AuthRequest, res: Response) => {
  try {
    const { category, featured, published, search, page = 1, limit = 10 } = req.query;

    const query: any = {};

    // Filter by category
    if (category) {
      query.category = category;
    }

    // Filter by featured status
    if (featured !== undefined) {
      query.featured = featured === "true";
    }

    // Filter by published status
    if (published !== undefined) {
      query.published = published === "true";
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
        .populate("author", "name email")
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

// 📄 Get post by ID
export const getPostById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const post = await ServicePost.findById(id).populate("author", "name email");
    
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    res.json(post);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch post" });
  }
};

// 📝 Update a post
export const updatePost = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { title, excerpt, content, readTime, category, image, featured, published } = req.body;

    const post = await ServicePost.findById(id);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Update fields
    if (title) post.title = title;
    if (excerpt) post.excerpt = excerpt;
    if (content) post.content = content;
    if (readTime) post.readTime = readTime;
    if (category) post.category = category;
    if (image !== undefined) post.image = image;
    if (featured !== undefined) post.featured = featured;
    if (published !== undefined) post.published = published;

    await post.save();

    const updatedPost = await ServicePost.findById(id).populate("author", "name email");

    res.json({
      message: "Post updated successfully",
      post: updatedPost,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update post" });
  }
};

// 🗑️ Delete a post
export const deletePost = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const post = await ServicePost.findByIdAndDelete(id);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    res.json({ message: "Post deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete post" });
  }
};

// 🌟 Toggle featured status
export const toggleFeatured = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const post = await ServicePost.findById(id);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    post.featured = !post.featured;
    await post.save();

    res.json({
      message: `Post ${post.featured ? "featured" : "unfeatured"} successfully`,
      post,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to toggle featured status" });
  }
};

// 📤 Toggle published status
export const togglePublished = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const post = await ServicePost.findById(id);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    post.published = !post.published;
    await post.save();

    res.json({
      message: `Post ${post.published ? "published" : "unpublished"} successfully`,
      post,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to toggle published status" });
  }
};

// 📊 Get post statistics
export const getPostStats = async (req: AuthRequest, res: Response) => {
  try {
    const [
      totalPosts,
      publishedPosts,
      featuredPosts,
      draftPosts,
      categoryStats,
    ] = await Promise.all([
      ServicePost.countDocuments(),
      ServicePost.countDocuments({ published: true }),
      ServicePost.countDocuments({ featured: true }),
      ServicePost.countDocuments({ published: false }),
      ServicePost.aggregate([
        { $group: { _id: "$category", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ]);

    res.json({
      totalPosts,
      publishedPosts,
      featuredPosts,
      draftPosts,
      categoryBreakdown: categoryStats,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to get post statistics" });
  }
};
