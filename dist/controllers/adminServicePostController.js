import ServicePost from "../models/ServicePost.js";
import { isValidImageUrl, sanitizeImageUrl, deleteCloudinaryImage } from "../config/cloudinary.js";
// 📝 Create a new service post (Admin only)
export const createPost = async (req, res) => {
    try {
        const { title, excerpt, content, readTime, category, featured, published } = req.body;
        let { image } = req.body;
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
        // Handle image from file upload or URL
        if (req.file) {
            // Image uploaded via multipart/form-data
            image = req.file.path; // Cloudinary URL
        }
        else if (image) {
            // Image provided as URL string
            if (!isValidImageUrl(image)) {
                return res.status(400).json({
                    message: "Invalid image URL format. Please provide a valid image URL or upload an image file."
                });
            }
            try {
                image = sanitizeImageUrl(image);
            }
            catch (error) {
                return res.status(400).json({
                    message: "Failed to process image URL. Please check the URL format."
                });
            }
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
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to create service post" });
    }
};
// 📚 Get all posts (Admin view - includes unpublished)
export const getAllPosts = async (req, res) => {
    try {
        const { category, featured, published, search, page = 1, limit = 10 } = req.query;
        const query = {};
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
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
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
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to fetch posts" });
    }
};
// 📄 Get post by ID
export const getPostById = async (req, res) => {
    try {
        const { id } = req.params;
        const post = await ServicePost.findById(id).populate("author", "name email");
        if (!post) {
            return res.status(404).json({ message: "Post not found" });
        }
        res.json(post);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to fetch post" });
    }
};
// 📝 Update a post
export const updatePost = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, excerpt, content, readTime, category, featured, published } = req.body;
        let { image } = req.body;
        const post = await ServicePost.findById(id);
        if (!post) {
            return res.status(404).json({ message: "Post not found" });
        }
        const oldImage = post.image;
        let imageUpdated = false;
        // Handle image update from file upload or URL
        if (req.file) {
            // New image uploaded via multipart/form-data
            image = req.file.path; // Cloudinary URL
            imageUpdated = true;
        }
        else if (image !== undefined) {
            // Image provided as URL string or null to remove
            if (image === null || image === '') {
                // Remove image
                imageUpdated = true;
            }
            else {
                // Validate and sanitize new image URL
                if (!isValidImageUrl(image)) {
                    return res.status(400).json({
                        message: "Invalid image URL format. Please provide a valid image URL or upload an image file."
                    });
                }
                try {
                    image = sanitizeImageUrl(image);
                    imageUpdated = true;
                }
                catch (error) {
                    return res.status(400).json({
                        message: "Failed to process image URL. Please check the URL format."
                    });
                }
            }
        }
        // Update fields
        if (title)
            post.title = title;
        if (excerpt)
            post.excerpt = excerpt;
        if (content)
            post.content = content;
        if (readTime)
            post.readTime = readTime;
        if (category)
            post.category = category;
        if (imageUpdated)
            post.image = image;
        if (featured !== undefined)
            post.featured = featured;
        if (published !== undefined)
            post.published = published;
        await post.save();
        // Delete old Cloudinary image if it was replaced and was a Cloudinary URL
        if (imageUpdated && oldImage && oldImage.includes('cloudinary.com')) {
            await deleteCloudinaryImage(oldImage);
        }
        const updatedPost = await ServicePost.findById(id).populate("author", "name email");
        res.json({
            message: "Post updated successfully",
            post: updatedPost,
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to update post" });
    }
};
// 🗑️ Delete a post
export const deletePost = async (req, res) => {
    try {
        const { id } = req.params;
        const post = await ServicePost.findById(id);
        if (!post) {
            return res.status(404).json({ message: "Post not found" });
        }
        // Delete associated Cloudinary image if exists
        if (post.image && post.image.includes('cloudinary.com')) {
            await deleteCloudinaryImage(post.image);
        }
        await ServicePost.findByIdAndDelete(id);
        res.json({ message: "Post deleted successfully" });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to delete post" });
    }
};
// 🌟 Toggle featured status
export const toggleFeatured = async (req, res) => {
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
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to toggle featured status" });
    }
};
// 📤 Toggle published status
export const togglePublished = async (req, res) => {
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
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to toggle published status" });
    }
};
// 📊 Get post statistics
export const getPostStats = async (req, res) => {
    try {
        const [totalPosts, publishedPosts, featuredPosts, draftPosts, categoryStats,] = await Promise.all([
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
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to get post statistics" });
    }
};
//# sourceMappingURL=adminServicePostController.js.map