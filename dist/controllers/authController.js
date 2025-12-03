import crypto from "crypto";
import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
import { BlacklistedToken } from "../models/BlacklistedToken.js";
import { generateToken, generateTokenPair } from "../utils/generateToken.js";
import { sendEmail } from "../utils/sendEmail.js";
// Password validation function
const validatePassword = (password) => {
    // Check minimum length
    if (password.length < 8) {
        return { isValid: false, message: "Password must be at least 8 characters long" };
    }
    // Check for uppercase letter
    if (!/[A-Z]/.test(password)) {
        return { isValid: false, message: "Password must contain at least one uppercase letter" };
    }
    // Check for lowercase letter
    if (!/[a-z]/.test(password)) {
        return { isValid: false, message: "Password must contain at least one lowercase letter" };
    }
    // Check for number
    if (!/\d/.test(password)) {
        return { isValid: false, message: "Password must contain at least one number" };
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        return { isValid: false, message: "Password must contain at least one special character" };
    }
    return { isValid: true };
};
// Register User
export const registerUser = async (req, res) => {
    const { name, email, password, role } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
    }
    // Validate password strength
    const { isValid, message } = validatePassword(password);
    if (!isValid) {
        return res.status(400).json({ message });
    }
    const user = await User.create({
        name,
        email,
        password,
        role: role || "user",
    });
    // Auto-set isStaff flag if role is "staff"
    if (user.role === "staff") {
        user.isStaff = true;
        await user.save();
        console.log(`✅ Auto-set isStaff=true for user ${user.email}`);
    }
    const tokens = generateTokenPair(user._id.toString());
    res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isStaff: user.isStaff,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        message: "User registered successfully"
    });
};
// Login User
export const loginUser = async (req, res) => {
    const { email, password } = req.body;
    // Validate input
    if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
    }
    try {
        // Important: Include password field explicitly since it has select: false
        const user = await User.findOne({ email }).select("+password");
        if (!user) {
            return res.status(400).json({ message: "Invalid credentials" });
        }
        // Check if user is active
        if (!user.isActive) {
            return res.status(403).json({ message: "Account has been deactivated. Please contact support." });
        }
        // Check if user's password exists
        if (!user.password) {
            console.error('User password is undefined for:', email);
            return res.status(400).json({ message: "Invalid credentials" });
        }
        // Compare passwords
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            return res.status(400).json({ message: "Invalid credentials" });
        }
        const tokens = generateTokenPair(user._id.toString());
        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            isStaff: user.isStaff,
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            message: "Login successful"
        });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: "Login failed" });
    }
};
// Forgot Password
export const forgotPassword = async (req, res) => {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }
    const resetToken = user.getResetPasswordToken();
    await user.save({ validateBeforeSave: false });
    // // For development - return the token directly for testing
    // if (process.env.NODE_ENV === 'development') {
    //   return res.json({ 
    //     message: "Password reset token generated (development mode)",
    //     resetToken: resetToken,
    //   });
    // }
    // For production - send email and return generic message
    try {
        const resetURL = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
        const message = `<p>Click below to reset your password:</p><a href="${resetURL}">Reset Password</a>`;
        await sendEmail(user.email, "Password Reset", message);
        res.json({ message: "Password reset link sent to your email" });
    }
    catch (error) {
        console.error('Email sending failed:', error);
        res.status(500).json({ message: "Error sending email" });
    }
};
// Reset Password
export const resetPassword = async (req, res) => {
    const { token } = req.params;
    const { password } = req.body;
    if (!token) {
        return res.status(400).json({ message: "Token is required" });
    }
    if (!password) {
        return res.status(400).json({ message: "Password is required" });
    }
    try {
        const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
        const user = await User.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpire: { $gt: Date.now() },
        });
        if (!user) {
            return res.status(400).json({ message: "Invalid or expired token" });
        }
        // Validate password strength for reset
        const { isValid, message: validationMessage } = validatePassword(password);
        if (!isValid) {
            return res.status(400).json({ message: validationMessage });
        }
        user.password = password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        await user.save();
        // Invalidate all existing tokens for this user (security measure)
        await BlacklistedToken.create({
            token: "ALL_TOKENS", // Special marker for password reset
            userId: user._id,
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
            reason: "password-change"
        });
        console.log(`✅ Password reset successful for user: ${user.email}`);
        res.status(200).json({
            message: "Password reset successful. Please login with your new password."
        });
    }
    catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ message: "Password reset failed" });
    }
};
// Logout User - Blacklist the current token
export const logoutUser = async (req, res) => {
    try {
        const token = req.token; // Retrieved from authMiddleware
        const userId = req.user?._id;
        if (!token || !userId) {
            return res.status(400).json({ message: "No active session found" });
        }
        // Decode token to get expiration time
        const decoded = jwt.decode(token);
        const expiresAt = decoded?.exp ? new Date(decoded.exp * 1000) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        // Add token to blacklist
        await BlacklistedToken.create({
            token,
            userId,
            expiresAt,
            reason: "logout"
        });
        console.log(`✅ User logged out successfully: ${req.user.email}`);
        res.status(200).json({
            message: "Logged out successfully",
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ message: "Logout failed" });
    }
};
// Refresh Token - Generate new access token
export const refreshToken = async (req, res) => {
    try {
        const { refreshToken: token } = req.body;
        if (!token) {
            return res.status(400).json({ message: "Refresh token is required" });
        }
        // Verify refresh token
        const refreshSecret = process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET || "fallback-refresh-secret";
        const decoded = jwt.verify(token, refreshSecret);
        // Check if user exists and is active
        const user = await User.findById(decoded.id);
        if (!user) {
            return res.status(401).json({ message: "User not found" });
        }
        if (!user.isActive) {
            return res.status(403).json({ message: "Account has been deactivated" });
        }
        // Generate new access token
        const newAccessToken = generateToken(user._id.toString());
        console.log(`✅ Access token refreshed for user: ${user.email}`);
        res.status(200).json({
            accessToken: newAccessToken,
            message: "Token refreshed successfully"
        });
    }
    catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            return res.status(401).json({
                message: "Refresh token expired",
                reason: "Please login again"
            });
        }
        else if (error instanceof jwt.JsonWebTokenError) {
            return res.status(401).json({
                message: "Invalid refresh token",
                reason: "Please login again"
            });
        }
        console.error('Refresh token error:', error);
        res.status(401).json({ message: "Invalid refresh token" });
    }
};
// Logout All Sessions - Blacklist all tokens for a user (admin action or security breach)
export const logoutAllSessions = async (req, res) => {
    try {
        const userId = req.user?._id;
        if (!userId) {
            return res.status(400).json({ message: "User not found" });
        }
        // Create a special blacklist entry that invalidates all tokens for this user
        await BlacklistedToken.create({
            token: `ALL_TOKENS_${userId}`,
            userId,
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
            reason: "admin-revoke"
        });
        console.log(`✅ All sessions invalidated for user: ${req.user.email}`);
        res.status(200).json({
            message: "All sessions have been logged out successfully",
            reason: "Please login again on all devices"
        });
    }
    catch (error) {
        console.error('Logout all sessions error:', error);
        res.status(500).json({ message: "Failed to logout all sessions" });
    }
};
// Get Current User Profile
export const getCurrentUser = async (req, res) => {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ message: "User not found" });
        }
        res.status(200).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            isStaff: user.isStaff,
            isActive: user.isActive,
            phone: user.phone,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
        });
    }
    catch (error) {
        console.error('Get current user error:', error);
        res.status(500).json({ message: "Failed to get user profile" });
    }
};
//# sourceMappingURL=authController.js.map