import mongoose, { Schema } from "mongoose";
import bcrypt from "bcryptjs";
import crypto from "crypto";
const userSchema = new Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: {
        type: String,
        required: false,
        select: false
    },
    role: { type: String, enum: ["user", "admin", "staff"], default: "user" },
    isActive: { type: Boolean, default: true },
    isStaff: { type: Boolean, default: false }, // Staff member flag
    phone: { type: String }, // Phone number for contact and booking deliveries
    address: { type: String }, // Address for mobile sauna deliveries
    isEmailVerified: { type: Boolean, default: false }, // Email verification status
    emailVerificationToken: String,
    emailVerificationExpire: Date,
    resetPasswordToken: String,
    resetPasswordExpire: Date,
}, { timestamps: true });
// Validate that admin users must have a password
userSchema.pre("save", async function (next) {
    if (this.role === 'admin' && !this.password) {
        throw new Error('Password is required for admin users');
    }
    next();
});
userSchema.pre("save", async function (next) {
    // Skip password hashing if password is not modified or not provided
    if (!this.isModified("password") || !this.password) {
        return next();
    }
    this.password = await bcrypt.hash(this.password, 10);
    next();
});
userSchema.methods.comparePassword = async function (candidate) {
    return bcrypt.compare(candidate, this.password);
};
userSchema.methods.getResetPasswordToken = function () {
    const token = crypto.randomBytes(32).toString("hex");
    this.resetPasswordToken = crypto.createHash("sha256").update(token).digest("hex");
    this.resetPasswordExpire = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
    return token;
};
userSchema.methods.getEmailVerificationToken = function () {
    const token = crypto.randomBytes(32).toString("hex");
    this.emailVerificationToken = crypto.createHash("sha256").update(token).digest("hex");
    this.emailVerificationExpire = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    return token;
};
export const User = mongoose.model("User", userSchema);
//# sourceMappingURL=User.js.map