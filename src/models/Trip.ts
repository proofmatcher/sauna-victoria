import mongoose, { Document } from "mongoose";

export interface ITrip extends Document {
  vessel: mongoose.Types.ObjectId;
  title: string;
  departureTime: Date;
  durationMinutes: number;
  capacity: number;
  remainingSeats: number;
  groupBooked: boolean;
  assignedStaff: mongoose.Types.ObjectId[];  // Staff members assigned to this trip
  staffNotified: boolean;  // Track if staff have been notified about this trip
}

const tripSchema = new mongoose.Schema<ITrip>({
  vessel: { type: mongoose.Schema.Types.ObjectId, ref: "Vessel", required: true },
  title: { type: String, required: true },
  departureTime: { type: Date, required: true },
  durationMinutes: { type: Number, default: 180 },
  capacity: { type: Number, required: true },
  remainingSeats: { type: Number, required: true },
  groupBooked: { type: Boolean, default: false },
  assignedStaff: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User" 
  }],
  staffNotified: { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.model<ITrip>("Trip", tripSchema);

// Note: when creating a Trip, set capacity from vessel.capacity and remainingSeats = capacity.