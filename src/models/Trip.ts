import mongoose, { Document } from "mongoose";

export interface ITrip extends Document {
  vessel: mongoose.Types.ObjectId;
  title: string;
  departureTime: Date;
  durationMinutes: number;
  remainingSeats: number;
  groupBooked: boolean;
  assignedStaff: mongoose.Types.ObjectId[];  // Staff members assigned to this trip
  staffNotified: boolean;  // Track if staff have been notified about this trip
  // Note: capacity is now derived from the vessel, not stored in trip
}

const tripSchema = new mongoose.Schema<ITrip>({
  vessel: { type: mongoose.Schema.Types.ObjectId, ref: "Vessel", required: true },
  title: { type: String, required: true },
  departureTime: { type: Date, required: true },
  durationMinutes: { type: Number, default: 180 },
  remainingSeats: { type: Number, required: true },
  groupBooked: { type: Boolean, default: false },
  assignedStaff: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User" 
  }],
  staffNotified: { type: Boolean, default: false },
}, { timestamps: true });

// Virtual field to get capacity from the associated vessel
tripSchema.virtual('capacity', {
  ref: 'Vessel',
  localField: 'vessel',
  foreignField: '_id',
  justOne: true,
  get: function() {
    // This will be populated when vessel is populated
    return (this as any).vessel?.capacity || 0;
  }
});

// Ensure virtual fields are serialized
tripSchema.set('toJSON', { virtuals: true });
tripSchema.set('toObject', { virtuals: true });

export default mongoose.model<ITrip>("Trip", tripSchema);

// Note: capacity is now always derived from vessel.capacity. 
// When creating a Trip, set remainingSeats = vessel.capacity initially.