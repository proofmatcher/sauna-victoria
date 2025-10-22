import { Request, Response } from "express";
import { User } from "../models/User.js";
import Booking from "../models/Booking.js";
import { create } from "domain";

// 📘 Get all users (with optional filters)
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const { role, isActive, search } = req.query;

    const query: any = {};
    
    // Filter by role
    if (role && (role === "user" || role === "admin")) {
      query.role = role;
    }
    
    // Filter by active status
    if (isActive !== undefined) {
      query.isActive = isActive === "true";
    }
    
    // Search by name or email
    if (search && typeof search === "string") {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const users = await User.find(query).select("-password");
    
    res.json({
      count: users.length,
      users,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch users" });
  }
};

// 📗 Get user by ID with their booking history
export const getUserById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const user = await User.findById(id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Get user's booking history
    const bookings = await Booking.find({ user: id })
      .populate("trip", "title departureTime")
      .populate("vessel", "name type")
      .sort({ createdAt: -1 });

    // Calculate user statistics
    const totalBookings = bookings.length;
    const confirmedBookings = bookings.filter(b => b.status === "confirmed").length;
    const totalSpentCents = bookings
      .filter(b => b.status === "confirmed")
      .reduce((sum, b) => sum + b.totalPriceCents, 0);

    res.json({
      user,
      statistics: {
        totalBookings,
        confirmedBookings,
        totalSpent: totalSpentCents / 100, // Convert to dollars
      },
      bookings,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch user details" });
  }
};

// 🔴 Deactivate a user (soft delete)
export const deactivateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Prevent deactivating admin accounts
    if (user.role === "admin") {
      return res.status(400).json({ message: "Cannot deactivate admin accounts" });
    }

    // Check if already deactivated
    if (!user.isActive) {
      return res.status(400).json({ message: "User is already deactivated" });
    }

    user.isActive = false;
    await user.save();

    // Optional: Cancel all pending bookings for this user
    await Booking.updateMany(
      { user: id, status: "pending" },
      { $set: { status: "cancelled" } }
    );

    res.json({
      message: "User deactivated successfully",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        isActive: user.isActive,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to deactivate user" });
  }
};

// 🟢 Reactivate a user
export const reactivateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if already active
    if (user.isActive) {
      return res.status(400).json({ message: "User is already active" });
    }

    user.isActive = true;
    await user.save();

    res.json({
      message: "User reactivated successfully",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        isActive: user.isActive,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to reactivate user" });
  }
};

// 📊 Update user role (promote to admin or demote to user)
export const updateUserRole = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!role || (role !== "user" && role !== "admin" && role !== "staff")) {
      return res.status(400).json({ message: "Invalid role. Must be 'user', 'admin', or 'staff'" });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.role = role;
    
    // 🚀 Automatically set isStaff flag when role is changed to "staff"
    if (role === "staff") {
      user.isStaff = true;
      console.log(`✅ Auto-set isStaff=true for user ${user.email}`);
    } else if (role === "user" || role === "admin") {
      // Optional: reset isStaff when changing away from staff role
      user.isStaff = false;
    }
    
    await user.save();

    res.json({
      message: `User role updated to ${role}`,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isStaff: user.isStaff,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update user role" });
  }
};

// 👥 Get all staff members (for trip assignment)
export const getStaffMembers = async (req: Request, res: Response) => {
  try {
    const { isActive } = req.query;

    const query: any = { 
      $or: [
        { isStaff: true },
        { role: "staff" },
      ]
    };

    // Filter by active status
    if (isActive !== undefined) {
      query.isActive = isActive === "true";
    }

    const staff = await User.find(query)
      .select("name email phone isStaff role isActive createdAt")
      .sort({ name: 1 });

    res.json({
      count: staff.length,
      staff,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch staff members" });
  }
};
