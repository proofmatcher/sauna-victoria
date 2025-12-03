import mongoose from "mongoose";
const tripSchema = new mongoose.Schema({
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
    get: function () {
        // This will be populated when vessel is populated
        return this.vessel?.capacity || 0;
    }
});
// Ensure virtual fields are serialized
tripSchema.set('toJSON', { virtuals: true });
tripSchema.set('toObject', { virtuals: true });
export default mongoose.model("Trip", tripSchema);
// Note: capacity is now always derived from vessel.capacity. 
// When creating a Trip, set remainingSeats = vessel.capacity initially.
//# sourceMappingURL=Trip.js.map