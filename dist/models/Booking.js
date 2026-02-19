import mongoose from "mongoose";
const bookingSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    trip: { type: mongoose.Schema.Types.ObjectId, ref: "Trip" },
    vessel: { type: mongoose.Schema.Types.ObjectId, ref: "Vessel", required: true },
    seatsBooked: Number,
    startTime: Date,
    endTime: Date,
    totalPriceCents: { type: Number, required: true },
    status: { type: String, enum: ["pending", "confirmed", "cancelled"], default: "pending" },
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
export default mongoose.model("Booking", bookingSchema);
//# sourceMappingURL=Booking.js.map