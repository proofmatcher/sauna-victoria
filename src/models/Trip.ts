import mongoose, { Document } from "mongoose";

export interface ITrip extends Document {
  vessel: mongoose.Types.ObjectId;
  departureTime: Date;
  durationMinutes: number;
  capacity: number;
  remainingSeats: number;
  groupBooked: boolean;
}

const tripSchema = new mongoose.Schema<ITrip>({
  vessel: { type: mongoose.Schema.Types.ObjectId, ref: "Vessel", required: true },
  departureTime: { type: Date, required: true },
  durationMinutes: { type: Number, default: 180 },
  capacity: { type: Number, required: true },
  remainingSeats: { type: Number, required: true },
  groupBooked: { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.model<ITrip>("Trip", tripSchema);

// Note: when creating a Trip, set capacity from vessel.capacity and remainingSeats = capacity.