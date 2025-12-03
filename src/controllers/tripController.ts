import { Request, Response } from "express";
import Trip from "../models/Trip.js";
import Vessel from "../models/Vessel.js";

export const createTrip = async (req: Request, res: Response) => {
  try {
    const { vesselId, departureTime, durationMinutes, assignedStaff } = req.body;
    const vessel = await Vessel.findById(vesselId);
    if (!vessel){
      return res.status(404).json({ message: "Vessel not found" });
    } 
    
    // Handle mobile saunas differently from regular trips
    if (vessel.type === 'mobile_sauna') {
      // For mobile saunas, create an availability slot (not a scheduled departure)
      const trip = await Trip.create({
        vessel: vessel._id,
        title: `${vessel.name} - Available for Rental`,
        departureTime: new Date(), // Availability starts now
        durationMinutes: 0, // No fixed duration - rental period set when booking
        remainingSeats: 1, // Mobile sauna is rented as one unit
        assignedStaff: assignedStaff || [],
        staffNotified: false,
      });

      await trip.populate("vessel", "name capacity type basePriceCents minimumDays discountThreshold discountPercent");
      await trip.populate("assignedStaff", "name email phone isStaff");

      return res.status(201).json({
        ...trip.toObject(),
        note: "Mobile sauna availability slot created. Rental period will be determined when customers book."
      });
    }
    
    // For regular boats/trailers, use the standard trip format
    const vesselCapacity = vessel.capacity || 8; // Default capacity if not set
    
    const trip = await Trip.create({
      vessel: vessel._id,
      title: vessel.name + " Trip on " + new Date(departureTime).toDateString(),
      departureTime,
      durationMinutes: durationMinutes || 180,
      remainingSeats: vesselCapacity, // Initially, all seats are available
      assignedStaff: assignedStaff || [],  // Array of staff user IDs
      staffNotified: false,
    });

    // Populate vessel and staff details for response (vessel needed for capacity virtual field)
    await trip.populate("vessel", "name capacity type");
    await trip.populate("assignedStaff", "name email phone isStaff");

    // 🚀 Automatically send email notifications to assigned staff
    if (assignedStaff && assignedStaff.length > 0) {
      try {
        const { notifyStaffAboutTrip } = await import("../services/notificationService.js");
        await notifyStaffAboutTrip(String(trip._id));
        console.log(`✅ Staff notifications sent for trip ${trip._id}`);
      } catch (emailError) {
        console.error("⚠️ Failed to send staff notifications:", emailError);
        // Don't fail trip creation if email fails
      }
    }

    res.status(201).json(trip);
  } catch (err) {
    console.error("Error creating trip:", err);
    res.status(500).json({ message: "Failed to create trip", error: String(err) });
  }
};

export const listTripsAdmin = async (req: Request, res: Response) => {
  const trips = await Trip.find()
    .populate("vessel", "name capacity type basePriceCents active") // Always populate vessel for capacity
    .populate("assignedStaff", "name email phone isStaff")
    .sort({ departureTime: 1 });
  res.json(trips);
};

export const getTripById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ message: "Trip ID is required" });
    }
    
    const trip = await Trip.findById(id)
      .populate('vessel', 'name capacity type basePriceCents active')
      .populate('assignedStaff', 'name email phone isStaff');
      
    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }
    
    // Get booking statistics
    const { getTripBookingStats } = await import("../utils/capacityUtils.js");
    const bookingStats = getTripBookingStats(trip);
    
    res.json({
      ...trip.toObject(),
      bookingStats
    });
  } catch (error) {
    console.error('Error getting trip:', error);
    res.status(500).json({ message: "Error retrieving trip", error: String(error) });
  }
};

export const updateTrip = async (req: Request, res: Response) => {
  const { vesselId } = req.body;
  const vessel = await Vessel.findById(vesselId);
  if(vesselId && !vessel){
    return res.status(404).json({ message: "Vessel not found" });
  }
  const t = await Trip.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!t){
    return res.status(404).json({ message: "Trip not found" });
  }
  res.json(t);
};

export const deleteTrip = async (req: Request, res: Response) => {
  try{
    const trip = await Trip.findById(req.params.id);
    if(!trip){
      return res.status(404).json({ message: "Trip not found" });
    }
    await Trip.findByIdAndDelete(req.params.id);
    res.status(201).json({
      message: "Trip deleted successfully",
      deletedTrip: {
        id: trip._id,
        vessel: trip.vessel,
      }
    });
  }catch(err){
    res.status(500).json({ message: "Server error", error: err });
  }
};

// 📧 Notify staff about trip assignment
export const notifyStaff = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ message: "Trip ID is required" });
    }
    
    const trip = await Trip.findById(id).populate("assignedStaff");
    
    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    if (!trip.assignedStaff || trip.assignedStaff.length === 0) {
      return res.status(400).json({ message: "No staff assigned to this trip" });
    }

    // Import and call notification service
    const { notifyStaffAboutTrip } = await import("../services/notificationService.js");
    const result = await notifyStaffAboutTrip(id);

    res.json({
      message: "Staff notifications sent successfully",
      notifiedCount: result?.notifiedCount || 0,
      trip: {
        id: trip._id,
        title: trip.title,
        staffNotified: true
      }
    });
  } catch (err) {
    console.error("Error notifying staff:", err);
    res.status(500).json({ message: "Failed to notify staff", error: String(err) });
  }
};
