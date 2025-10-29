import { Request, Response } from "express";
import Trip from "../models/Trip.js";
import Vessel from "../models/Vessel.js";

export const listUpcomingTrips = async (req: Request, res: Response) => {
  // Show all trips without date filtering
  const trips = await Trip.find({})
    .populate("vessel")
    .sort({ departureTime: 1 });

  res.json(trips);
};

export const tripDetails = async (req: Request, res: Response) => {
  const trip = await Trip.findById(req.params.id).populate("vessel");
  if (!trip) return res.status(404).json({ message: "Trip not found" });
  res.json(trip);
};
