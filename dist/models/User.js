import mongoose, { Schema } from "mongoose";
import bcrypt from "bcryptjs";
import crypto from "crypto";
const userSchema = new Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ["user", "admin", "staff"], default: "user" },
    isActive: { type: Boolean, default: true },
    isStaff: { type: Boolean, default: false }, // Staff member flag
    phone: { type: String }, // Phone number for contact and booking deliveries
    address: { type: String }, // Address for mobile sauna deliveries
    resetPasswordToken: String,
    resetPasswordExpire: Date,
}, { timestamps: true });
userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) {
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
export const User = mongoose.model("User", userSchema);
//# sourceMappingURL=User.js.map