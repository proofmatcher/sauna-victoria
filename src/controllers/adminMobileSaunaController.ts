import { Request, Response } from "express";
import Booking from "../models/Booking.js";
import mongoose from "mongoose";

/**
 * Get all confirmed mobile sauna bookings for admin management
 */
export const getMobileSaunaBookings = async (_req: Request, res: Response) => {
  try {
    // Find all confirmed mobile sauna bookings with populated vessel and user data
    const mobileSaunaBookings = await Booking.find({
      status: "confirmed" // Only approved payments
    })
      .populate({
        path: 'vessel',
        match: { type: 'mobile_sauna' },
        select: 'name type capacity'
      })
      .populate('user', 'name email')
      .sort({ createdAt: -1 });

    // Filter out bookings where vessel is null (not mobile sauna)
    const filteredBookings = mobileSaunaBookings.filter(booking => booking.vessel !== null);

    // Format the response to show only required fields
    const formattedBookings = filteredBookings.map(booking => ({
      id: booking._id,
      customerName: booking.customerName,
      days: booking.daysBooked,
      customerPhone: booking.customerPhone,
      deliveryAddress: booking.deliveryAddress,
      vesselName: (booking.vessel as any)?.name,
      userEmail: (booking.user as any)?.email,
      totalPrice: booking.totalPriceCents / 100,
      startTime: booking.startTime,
      endTime: booking.endTime,
      createdAt: (booking as any).createdAt,
      rulesAgreed: booking.rulesAgreed,
      waiverSigned: booking.waiverSigned
    }));

    res.json({
      message: "Mobile sauna bookings retrieved successfully",
      count: formattedBookings.length,
      bookings: formattedBookings
    });
  } catch (err: any) {
    console.error("Error fetching mobile sauna bookings:", err);
    res.status(500).json({ message: "Failed to fetch mobile sauna bookings" });
  }
};

/**
 * Update mobile sauna booking details (admin only)
 */
export const updateMobileSaunaBooking = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { customerName, days, customerPhone, deliveryAddress } = req.body;

    // Validate the booking ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid booking ID" });
    }

    // Find the booking and verify it's a confirmed mobile sauna booking
    const booking = await Booking.findById(id).populate('vessel', 'type name');
    
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (booking.status !== "confirmed") {
      return res.status(400).json({ 
        message: "Can only update confirmed bookings" 
      });
    }

    const vessel = booking.vessel as any;
    if (!vessel || vessel.type !== "mobile_sauna") {
      return res.status(400).json({ 
        message: "This is not a mobile sauna booking" 
      });
    }

    // Prepare update object with only provided fields
    const updateData: any = {};
    if (customerName !== undefined) updateData.customerName = customerName;
    if (days !== undefined) {
      updateData.daysBooked = days;
      // Recalculate end time if days changed and startTime exists
      if (booking.startTime && days) {
        const newEndTime = new Date(booking.startTime);
        newEndTime.setDate(newEndTime.getDate() + days);
        updateData.endTime = newEndTime;
      }
    }
    if (customerPhone !== undefined) updateData.customerPhone = customerPhone;
    if (deliveryAddress !== undefined) updateData.deliveryAddress = deliveryAddress;

    // Update the booking
    const updatedBooking = await Booking.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('vessel', 'name type');

    if (!updatedBooking) {
      return res.status(404).json({ message: "Booking not found after update" });
    }

    res.json({
      message: "Mobile sauna booking updated successfully",
      booking: {
        id: updatedBooking._id,
        customerName: updatedBooking.customerName,
        days: updatedBooking.daysBooked,
        customerPhone: updatedBooking.customerPhone,
        deliveryAddress: updatedBooking.deliveryAddress,
        vesselName: (updatedBooking.vessel as any)?.name,
        totalPrice: updatedBooking.totalPriceCents / 100,
        startTime: updatedBooking.startTime,
        endTime: updatedBooking.endTime,
        updatedAt: (updatedBooking as any).updatedAt
      }
    });
  } catch (err: any) {
    console.error("Error updating mobile sauna booking:", err);
    res.status(400).json({ message: err.message || "Failed to update mobile sauna booking" });
  }
};

/**
 * Delete mobile sauna booking (admin only)
 */
export const deleteMobileSaunaBooking = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Validate the booking ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid booking ID" });
    }

    // Find the booking and verify it's a mobile sauna booking
    const booking = await Booking.findById(id).populate('vessel', 'type name');
    
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const vessel = booking.vessel as any;
    if (!vessel || vessel.type !== "mobile_sauna") {
      return res.status(400).json({ 
        message: "This is not a mobile sauna booking" 
      });
    }

    // Store booking info before deletion
    const bookingInfo = {
      id: booking._id,
      customerName: booking.customerName,
      vesselName: vessel.name,
      days: booking.daysBooked,
      totalPrice: booking.totalPriceCents / 100
    };

    // Delete the booking
    await Booking.findByIdAndDelete(id);

    res.json({
      message: "Mobile sauna booking deleted successfully",
      deletedBooking: bookingInfo
    });
  } catch (err: any) {
    console.error("Error deleting mobile sauna booking:", err);
    res.status(500).json({ message: "Failed to delete mobile sauna booking" });
  }
};

/**
 * Get single mobile sauna booking by ID (admin only)
 */
export const getMobileSaunaBookingById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Validate the booking ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid booking ID" });
    }

    const booking = await Booking.findById(id)
      .populate('vessel', 'name type capacity')
      .populate('user', 'name email');
    
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const vessel = booking.vessel as any;
    if (!vessel || vessel.type !== "mobile_sauna") {
      return res.status(404).json({ 
        message: "This is not a mobile sauna booking" 
      });
    }

    const formattedBooking = {
      id: booking._id,
      customerName: booking.customerName,
      days: booking.daysBooked,
      customerPhone: booking.customerPhone,
      deliveryAddress: booking.deliveryAddress,
      vesselName: vessel?.name,
      vesselCapacity: vessel?.capacity,
      userEmail: (booking.user as any)?.email,
      totalPrice: booking.totalPriceCents / 100,
      startTime: booking.startTime,
      endTime: booking.endTime,
      status: booking.status,
      rulesAgreed: booking.rulesAgreed,
      waiverSigned: booking.waiverSigned,
      createdAt: (booking as any).createdAt,
      updatedAt: (booking as any).updatedAt
    };

    res.json({
      message: "Mobile sauna booking retrieved successfully",
      booking: formattedBooking
    });
  } catch (err: any) {
    console.error("Error fetching mobile sauna booking:", err);
    res.status(500).json({ message: "Failed to fetch mobile sauna booking" });
  }
};