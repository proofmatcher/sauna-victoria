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
  customerEmail?: string;            // customer email address
  customerBirthdate?: Date;          // customer birthdate
  daysBooked?: number;               // number of days for mobile sauna rental
  rulesAgreed?: boolean;             // customer agreed to rules
  waiverSigned?: boolean;            // customer signed waiver
  // Delivery fee calculation
  deliveryDistanceKm?: number;       // Distance from Hillside Mall to delivery address
  deliveryFeeCents?: number;         // Calculated delivery fee (free ≤20km, $3/km after)
  // Wood bins
  additionalWoodBins?: number;       // Number of additional wood bins (2 free, then $15 each)
  woodBinsCostCents?: number;        // Cost for additional wood bins
  // Rental Agreement tracking (for mobile sauna rentals)
  agreementVersion?: string;         // Agreement capacity version: "4-person", "8-person", "10-person"
  agreementAcceptedAt?: Date;        // Timestamp when customer accepted agreement
  agreementIpAddress?: string;       // IP address from which agreement was accepted
  agreementPdfUrl?: string;          // Cloudinary URL of the filled/signed agreement PDF
  damageDepositCents?: number;       // Damage deposit amount (default $250 = 25000 cents)
  damageDepositStatus?: 'held' | 'refunded' | 'forfeited'; // Deposit status tracking
  damageDepositRefundId?: string;    // Stripe refund ID when deposit is refunded
  damageDepositRefundDate?: Date;    // Date when deposit was refunded
  damageDepositNotes?: string;       // Admin notes explaining forfeit reason
  stripePaymentIntentId?: string;    // Stripe PaymentIntent ID for refunds
  rentalPriceCents?: number;         // Base rental price (for easier PDF generation)
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
  customerEmail: String,
  customerBirthdate: Date,
  daysBooked: Number,
  rulesAgreed: { type: Boolean, default: false },
  waiverSigned: { type: Boolean, default: false },
  // Delivery fee fields
  deliveryDistanceKm: Number,
  deliveryFeeCents: Number,
  // Wood bins fields
  additionalWoodBins: { type: Number, default: 0, min: 0, max: 10 },
  woodBinsCostCents: Number,
  // Rental Agreement fields
  agreementVersion: String,
  agreementAcceptedAt: Date,
  agreementIpAddress: String,
  agreementPdfUrl: String,
  damageDepositCents: { type: Number, default: 25000 }, // $250.00 default
  damageDepositStatus: { 
    type: String, 
    enum: ['held', 'refunded', 'forfeited'], 
    default: 'held' 
  },
  damageDepositRefundId: String,
  damageDepositRefundDate: Date,
  damageDepositNotes: String,
  stripePaymentIntentId: String,
  rentalPriceCents: Number,
}, { timestamps: true });

export default mongoose.model<IBooking>("Booking", bookingSchema);