import mongoose, { Document } from "mongoose";

export interface IVessel extends Document {
  name: string;
  type: "boat" | "trailer";
  capacity?: number;          // for boats
  basePriceCents: number;     // price unit (cents)
  active: boolean;
}

const vesselSchema = new mongoose.Schema<IVessel>({
  name: { type: String, required: true },
  type: { type: String, enum: ["boat", "trailer"], required: true },
  capacity: { type: Number }, 
  basePriceCents: { type: Number, default: 0 },
  active: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.model<IVessel>("Vessel", vesselSchema);