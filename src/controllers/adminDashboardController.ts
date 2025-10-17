import { Request, Response } from "express";
import Booking from "../models/Booking.js";
import {User} from "../models/User.js";
import Trip from "../models/Trip.js";

export const getDashboardStats = async (_req: Request, res: Response) => {
  try {
    const [
      totalUsers,
      totalBookings,
      confirmedBookings,
      cancelledBookings,
      trips,
    ] = await Promise.all([
      User.countDocuments(),
      Booking.countDocuments(),
      Booking.countDocuments({ status: "confirmed" }),
      Booking.countDocuments({ status: "cancelled" }),
      Trip.find(),
    ]);

    // Revenue = sum of confirmed bookings' totalPriceCents (convert to dollars)
    const revenueAgg = await Booking.aggregate([
      { $match: { status: "confirmed" } },
      { $group: { _id: null, totalRevenueCents: { $sum: "$totalPriceCents" } } },
    ]);
    const totalRevenueCents = revenueAgg[0]?.totalRevenueCents || 0;
    const totalRevenue = totalRevenueCents / 100; // Convert cents to dollars

    // Utilization: % of total booked seats per trip
    const tripUtilization = trips.map((t) => ({
      title: t.title,
      capacity: t.capacity,
      booked: t.capacity - t.remainingSeats,
      utilization:
        t.capacity > 0
          ? Math.round(((t.capacity - t.remainingSeats) / t.capacity) * 100)
          : 0,
    }));

    res.json({
      summary: {
        totalUsers,
        totalBookings,
        confirmedBookings,
        cancelledBookings,
        totalRevenue,
      },
      tripUtilization,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to get dashboard stats" });
  }
};
