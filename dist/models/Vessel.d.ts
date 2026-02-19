import mongoose, { Document } from "mongoose";
export interface IVessel extends Document {
    name: string;
    type: "boat" | "trailer" | "mobile_sauna";
    capacity?: number;
    inventory?: number;
    basePriceCents: number;
    active: boolean;
    minimumDays?: number;
    discountThreshold?: number;
    discountPercent?: number;
    pickupDropoffDay?: number;
    pricingTiers?: {
        days1to3: number;
        day4: number;
        day5: number;
        day6: number;
        day7: number;
    };
}
declare const _default: mongoose.Model<IVessel, {}, {}, {}, mongoose.Document<unknown, {}, IVessel, {}, {}> & IVessel & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
export default _default;
