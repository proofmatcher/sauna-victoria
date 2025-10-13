import { Request, Response } from "express";
import Vessel from "../models/Vessel.js";

export const createVessel = async (req: Request, res: Response) => {
  const { name, type, capacity, basePriceCents } = req.body;
  const vessel = await Vessel.create({ name, type, capacity, basePriceCents });
  res.status(201).json(vessel);
};

export const listVessels = async (req: Request, res: Response) => {
  const vessels = await Vessel.find().sort({ createdAt: -1 });
  res.json(vessels);
};

export const updateVessel = async (req: Request, res: Response) => {
  const v = await Vessel.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!v) return res.status(404).json({ message: "Vessel not found" });
  res.json(v);
};

export const deleteVessel = async (req: Request, res: Response) => {
  try {
    const vessel = await Vessel.findByIdAndDelete(req.params.id);
    if (!vessel) {
      return res.status(404).json({ message: "Vessel not found" });
    }

    res.status(201).json({ 
      message: "Vessel deleted successfully",
      deletedVessel: {
        id: vessel._id,
        name: vessel.name
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Error deleting vessel" });
  }
};