import mongoose from "mongoose";
const vesselSchema = new mongoose.Schema({
    name: { type: String, required: true },
    type: { type: String, enum: ["boat", "trailer", "mobile_sauna"], required: true },
    capacity: { type: Number },
    basePriceCents: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
    minimumDays: { type: Number }, // minimum rental days for mobile saunas
    discountThreshold: { type: Number }, // days threshold for discount (7+ days)
    discountPercent: { type: Number }, // discount percentage (20% for Large Luxury)
    // Tiered pricing for mobile saunas
    pricingTiers: {
        days1to3: { type: Number }, // Total price for 1-3 days rental (cents)
        day4: { type: Number }, // Total price for 4 day rental (cents)
        day5: { type: Number }, // Total price for 5 day rental (cents)
        day6: { type: Number }, // Total price for 6 day rental (cents)
        day7: { type: Number }, // Total price for 7 day rental (cents)
    }
}, { timestamps: true });
export default mongoose.model("Vessel", vesselSchema);
//# sourceMappingURL=Vessel.js.map