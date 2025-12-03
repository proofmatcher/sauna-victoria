import { Request, Response } from "express";
import Booking from "../models/Booking.js";
import {User} from "../models/User.js";
import Trip from "../models/Trip.js";
import Vessel from "../models/Vessel.js";

export const getDashboardStats = async (_req: Request, res: Response) => {
  try {
    const [
      totalUsers,
      totalBookings,
      confirmedBookings,
      cancelledBookings,
      trips,
      mobileSaunaBookings,
    ] = await Promise.all([
      User.countDocuments(),
      Booking.countDocuments(),
      Booking.countDocuments({ status: "confirmed" }),
      Booking.countDocuments({ status: "cancelled" }),
      Trip.find().populate('vessel', 'name capacity type'), // Populate vessel to get capacity
      Booking.find().populate('vessel', 'name type capacity pricingTiers'), // Get mobile sauna bookings
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

    // Mobile Sauna Utilization: count bookings for each mobile sauna type
    const mobileSaunaStats = mobileSaunaBookings
      .filter((booking) => (booking.vessel as any)?.type === 'mobile_sauna')
      .reduce((acc, booking) => {
        const vessel = booking.vessel as any;
        const vesselName = vessel?.name || 'Unknown Mobile Sauna';
        const vesselId = vessel?._id?.toString() || 'unknown';
        
        if (!acc[vesselId]) {
          acc[vesselId] = {
            name: vesselName,
            capacity: vessel?.capacity || 0,
            totalBookings: 0,
            confirmedBookings: 0,
            cancelledBookings: 0,
            pendingBookings: 0,
            totalRevenue: 0, // in cents
            totalDaysBooked: 0,
          };
        }
        
        acc[vesselId].totalBookings += 1;
        
        if (booking.status === 'confirmed') {
          acc[vesselId].confirmedBookings += 1;
          acc[vesselId].totalRevenue += booking.totalPriceCents || 0;
          acc[vesselId].totalDaysBooked += booking.daysBooked || 0;
        } else if (booking.status === 'cancelled') {
          acc[vesselId].cancelledBookings += 1;
        } else if (booking.status === 'pending') {
          acc[vesselId].pendingBookings += 1;
        }
        
        return acc;
      }, {} as Record<string, any>);

    // Get current active bookings (currently ongoing rentals)
    const now = new Date();
    const activeBookings = mobileSaunaBookings.filter((booking) => {
      const vessel = booking.vessel as any;
      return vessel?.type === 'mobile_sauna' &&
             booking.status === 'confirmed' &&
             booking.startTime &&
             booking.endTime &&
             new Date(booking.startTime) <= now &&
             new Date(booking.endTime) >= now;
    });

    // Count active bookings per mobile sauna
    const activeBookingStats = activeBookings.reduce((acc, booking) => {
      const vessel = booking.vessel as any;
      const vesselId = vessel?._id?.toString() || 'unknown';
      acc[vesselId] = (acc[vesselId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Convert to array format
    const mobileSaunaUtilization = Object.values(mobileSaunaStats).map((stats: any) => ({
      name: stats.name,
      capacity: stats.capacity,
      totalBookings: stats.totalBookings,
      confirmedBookings: stats.confirmedBookings,
      cancelledBookings: stats.cancelledBookings,
      pendingBookings: stats.pendingBookings,
      currentlyBooked: activeBookingStats[Object.keys(mobileSaunaStats).find(key => mobileSaunaStats[key].name === stats.name) || ''] || 0,
      totalRevenue: Math.round((stats.totalRevenue / 100) * 100) / 100, // Convert to dollars with 2 decimals
      totalDaysBooked: stats.totalDaysBooked,
    }));

    // Mobile sauna summary statistics
    const totalMobileSaunas = await Vessel.countDocuments({ type: 'mobile_sauna', active: true });
    const totalCurrentlyBooked = Object.values(activeBookingStats).reduce((sum: number, count: number) => sum + count, 0);
    const totalMobileSaunaBookings = mobileSaunaBookings.filter(b => (b.vessel as any)?.type === 'mobile_sauna').length;
    const confirmedMobileSaunaBookings = mobileSaunaBookings.filter(b => 
      (b.vessel as any)?.type === 'mobile_sauna' && b.status === 'confirmed'
    ).length;

    res.json({
      summary: {
        totalUsers,
        totalBookings,
        confirmedBookings,
        cancelledBookings,
        totalRevenue,
      },
      mobileSaunaSummary: {
        totalMobileSaunas,
        totalCurrentlyBooked,
        availableForBooking: totalMobileSaunas, // Mobile saunas can have multiple bookings for different periods
        totalMobileSaunaBookings,
        confirmedMobileSaunaBookings,
        mobileSaunaRevenue: Math.round(
          (mobileSaunaBookings
            .filter(b => (b.vessel as any)?.type === 'mobile_sauna' && b.status === 'confirmed')
            .reduce((sum, b) => sum + (b.totalPriceCents || 0), 0) / 100) * 100
        ) / 100,
      },
      tripUtilization,
      mobileSaunaUtilization,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to get dashboard stats" });
  }
};
