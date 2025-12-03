import mongoose, { Schema } from "mongoose";
const servicePostSchema = new Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },
    excerpt: {
        type: String,
        required: true,
        trim: true,
        maxlength: 300
    },
    content: {
        type: String,
        required: true
    },
    readTime: {
        type: String,
        required: true,
        default: "5 min read"
    },
    category: {
        type: String,
        required: true,
        enum: ["boat-sauna", "trailer-sauna", "events", "wellness", "news", "general"],
        default: "general"
    },
    image: {
        type: String,
        default: null
    },
    featured: {
        type: Boolean,
        default: false
    },
    published: {
        type: Boolean,
        default: false
    },
    author: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    slug: {
        type: String,
        unique: true,
        lowercase: true,
        trim: true
    },
    views: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});
// Create slug from title before saving
servicePostSchema.pre("save", async function (next) {
    if (this.isModified("title")) {
        let slug = this.title
            .toLowerCase()
            .replace(/[^\w\s-]/g, "")
            .replace(/\s+/g, "-")
            .replace(/-+/g, "-")
            .trim();
        // Check for duplicate slugs and append number if needed
        const ServicePostModel = mongoose.model("ServicePost");
        const existingPost = await ServicePostModel.findOne({ slug });
        if (existingPost && String(existingPost._id) !== String(this._id)) {
            slug = `${slug}-${Date.now()}`;
        }
        this.slug = slug;
    }
    next();
});
// Index for better query performance
servicePostSchema.index({ published: 1, featured: 1 });
servicePostSchema.index({ category: 1 });
servicePostSchema.index({ createdAt: -1 });
export default mongoose.model("ServicePost", servicePostSchema);
//# sourceMappingURL=ServicePost.js.map