import mongoose, { Document } from "mongoose";

export interface IVessel extends Document {
  name: string;
  type: "boat" | "trailer" | "mobile_sauna";
  capacity?: number;          // for boats and mobile saunas (people capacity per unit)
  inventory?: number;         // number of physical units available (default: 1)
  basePriceCents: number;     // price unit (cents per day for boats, base for mobile sauna tiers)
  active: boolean;
  minimumDays?: number;       // minimum rental days for mobile saunas
  discountThreshold?: number; // days threshold for discount (7+ days)
  discountPercent?: number;   // discount percentage (20% for Large Luxury)
  pickupDropoffDay?: number;  // Day of week for pickup/dropoff (0=Sunday, 1=Monday, ... 5=Friday, 6=Saturday). Default: 5 (Friday)
  enforceWeeklyBoundary?: boolean; // When true: pickup/dropoff must land on pickupDropoffDay. Default: false
  // Tiered pricing for mobile saunas (total price, not per day)
  pricingTiers?: {
    days1to3: number;    // Total price for 1-3 days rental
    day4: number;        // Total price for 4 day rental
    day5: number;        // Total price for 5 day rental  
    day6: number;        // Total price for 6 day rental
    day7: number;        // Total price for 7 day rental
  };
  // Images
  images?: string[]; // Array of original image paths
  imageVariants?: {
    mobile?: string;
    tablet?: string;
    desktop?: string;
  }[]; // Array of responsive variants matching the order of images
}

const vesselSchema = new mongoose.Schema<IVessel>({
  name: { type: String, required: true },
  type: { type: String, enum: ["boat", "trailer", "mobile_sauna"], required: true },
  capacity: { type: Number }, 
  inventory: { type: Number, default: 1, min: 1 }, // Default 1 unit, minimum 1
  basePriceCents: { type: Number, default: 0 },
  active: { type: Boolean, default: true },
  minimumDays: { type: Number }, // minimum rental days for mobile saunas
  discountThreshold: { type: Number }, // days threshold for discount (7+ days)
  discountPercent: { type: Number }, // discount percentage (20% for Large Luxury)
  pickupDropoffDay: { type: Number, default: 5, min: 0, max: 6 }, // Default Friday (5), configurable per vessel
  enforceWeeklyBoundary: { type: Boolean, default: false }, // When true: restricts booking to designated day boundaries
  // Tiered pricing for mobile saunas
  pricingTiers: {
    days1to3: { type: Number }, // Total price for 1-3 days rental (cents)
    day4: { type: Number },     // Total price for 4 day rental (cents)
    day5: { type: Number },     // Total price for 5 day rental (cents)
    day6: { type: Number },     // Total price for 6 day rental (cents)
    day7: { type: Number },     // Total price for 7 day rental (cents)
  },
  images: [{ type: String }],
  imageVariants: [{
    mobile: { type: String },
    tablet: { type: String },
    desktop: { type: String }
  }]
}, { timestamps: true });

export default mongoose.model<IVessel>("Vessel", vesselSchema);