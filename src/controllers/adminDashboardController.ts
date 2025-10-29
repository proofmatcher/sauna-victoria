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
      Trip.find().populate('vessel', 'name capacity type'), // Populate vessel to get capacity
    ]);

    // Revenue = sum of confirmed bookings' totalPriceCents (convert to dollars)
    const revenueAgg = await Booking.aggregate([
      { $match: { status: "confirmed" } },
      { $group: { _id: null, totalRevenueCents: { $sum: "$totalPriceCents" } } },
    ]);
    const totalRevenueCents = revenueAgg[0]?.totalRevenueCents || 0;
    const totalRevenue = totalRevenueCents / 100; // Convert cents to dollars

    // Utilization: % of total booked seats per trip
    const tripUtilization = trips.map((t) => {
      // Get capacity from associated vessel
      const vesselCapacity = (t.vessel as any)?.capacity || 8;
      const booked = vesselCapacity - t.remainingSeats;
      const utilization = vesselCapacity > 0 
        ? Math.round((booked / vesselCapacity) * 100) 
        : 0;
      
      return {
        title: t.title,
        vesselName: (t.vessel as any)?.name || 'Unknown Vessel',
        capacity: vesselCapacity,
        booked: Math.max(0, booked), // Ensure non-negative
        utilization,
      };
    });

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
