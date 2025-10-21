import type { Request, Response } from "express";
import crypto from "crypto";

import { User } from "../models/User.js";
import { generateToken } from "../utils/generateToken.js";
import { sendEmail } from "../utils/sendEmail.js";

// Password validation function
const validatePassword = (password: string): { isValid: boolean; message?: string } => {
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
export const registerUser = async (req: Request, res: Response) => {
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

  await user.save({ validateBeforeSave: false });

  res.status(201).json({
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    token: generateToken((user._id as any).toString()),
  });
};

// Login User
export const loginUser = async (req: Request, res: Response) => {
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

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken((user._id as any).toString()),
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: "Login failed" });
  }
};
// Forgot Password
export const forgotPassword = async (req: Request, res: Response) => {
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
  } catch (error) {
    console.error('Email sending failed:', error);
    res.status(500).json({ message: "Error sending email" });
  }
};

// Reset Password
export const resetPassword = async (req: Request, res: Response) => {
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

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();
    
    res.status(200).json({ message: "Password reset successful" });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: "Password reset failed" });
  }
};