import mongoose, { Document } from "mongoose";

export interface IBooking extends Document {
  user?: mongoose.Types.ObjectId;
  trip?: mongoose.Types.ObjectId;     // null for trailer free-form rentals
  vessel: mongoose.Types.ObjectId;
  seatsBooked?: number;              // for trip bookings
  startTime?: Date;                  // for trailer rental start
  endTime?: Date;                    // for trailer rental end
  totalPriceCents: number;
  status: "pending" | "confirmed" | "cancelled";
  holdExpiresAt?: Date;
  stripeSessionId?: string;
}

const bookingSchema = new mongoose.Schema<IBooking>({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  trip: { type: mongoose.Schema.Types.ObjectId, ref: "Trip" },
  vessel: { type: mongoose.Schema.Types.ObjectId, ref: "Vessel", required: true },
  seatsBooked: Number,
  startTime: Date,
  endTime: Date,
  totalPriceCents: { type: Number, required: true },
  status: { type: String, enum: ["pending","confirmed","cancelled"], default: "pending" },
  holdExpiresAt: Date,
  stripeSessionId: String,
}, { timestamps: true });

export default mongoose.model<IBooking>("Booking", bookingSchema);