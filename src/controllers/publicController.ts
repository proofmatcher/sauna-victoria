import { Request, Response } from "express";
import Trip from "../models/Trip.js";
import Vessel from "../models/Vessel.js";

export const listUpcomingTrips = async (req: Request, res: Response) => {
  const from = req.query.from ? new Date(String(req.query.from)) : new Date(); // now
  const to = req.query.to ? new Date(String(req.query.to)) : new Date(Date.now() + 14*24*60*60*1000); // 2 weeks ahead
  const trips = await Trip.find({
    departureTime: { $gte: from, $lte: to }
  }).populate("vessel").sort({ departureTime: 1 });

  res.json(trips);
};

export const tripDetails = async (req: Request, res: Response) => {
  const trip = await Trip.findById(req.params.id).populate("vessel");
  if (!trip) return res.status(404).json({ message: "Trip not found" });
  res.json(trip);
};
