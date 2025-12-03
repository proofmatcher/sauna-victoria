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
    daysBooked: Number,
    rulesAgreed: { type: Boolean, default: false },
    waiverSigned: { type: Boolean, default: false },
}, { timestamps: true });
export default mongoose.model("Booking", bookingSchema);
//# sourceMappingURL=Booking.js.map