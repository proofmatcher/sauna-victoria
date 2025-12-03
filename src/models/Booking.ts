import mongoose, { Document } from "mongoose";

export interface IBooking extends Document {
  user?: mongoose.Types.ObjectId;
  trip?: mongoose.Types.ObjectId;     // null for trailer/mobile sauna rentals
  vessel: mongoose.Types.ObjectId;
  seatsBooked?: number;              // for trip bookings (not used for mobile saunas)
  startTime?: Date;                  // for trailer/mobile sauna rental start
  endTime?: Date;                    // for trailer/mobile sauna rental end
  totalPriceCents: number;
  status: "pending" | "confirmed" | "cancelled";
  holdExpiresAt?: Date;
  stripeSessionId?: string;
  // Mobile sauna specific fields
  deliveryAddress?: string;          // delivery address for mobile saunas
  customerPhone?: string;            // customer phone for delivery coordination
  customerName?: string;             // customer full name for delivery
  daysBooked?: number;               // number of days for mobile sauna rental
  rulesAgreed?: boolean;             // customer agreed to rules
  waiverSigned?: boolean;            // customer signed waiver
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
  // Mobile sauna specific fields
  deliveryAddress: String,
  customerPhone: String,
  customerName: String,
  daysBooked: Number,
  rulesAgreed: { type: Boolean, default: false },
  waiverSigned: { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.model<IBooking>("Booking", bookingSchema);