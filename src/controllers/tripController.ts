import { Request, Response } from "express";
import Trip from "../models/Trip.js";
import Vessel from "../models/Vessel.js";

export const createTrip = async (req: Request, res: Response) => {
  const { vesselId, departureTime, durationMinutes } = req.body;
  const vessel = await Vessel.findById(vesselId);
  if (!vessel){
    return res.status(404).json({ message: "Vessel not found" });
  } 
  const capacity = vessel.capacity ?? req.body.capacity ?? 8;
  const trip = await Trip.create({
    vessel: vessel._id,
    departureTime,
    durationMinutes: durationMinutes || 180,
    capacity,
    remainingSeats: capacity,
  });

  res.status(201).json(trip);
};

export const listTripsAdmin = async (req: Request, res: Response) => {
  const trips = await Trip.find().populate("vessel").sort({ departureTime: 1 });
  res.json(trips);
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
