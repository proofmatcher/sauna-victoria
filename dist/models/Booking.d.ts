import mongoose, { Document } from "mongoose";
export interface IBooking extends Document {
    user?: mongoose.Types.ObjectId;
    trip?: mongoose.Types.ObjectId;
    vessel: mongoose.Types.ObjectId;
    seatsBooked?: number;
    startTime?: Date;
    endTime?: Date;
    totalPriceCents: number;
    status: "pending" | "confirmed" | "cancelled";
    holdExpiresAt?: Date;
    stripeSessionId?: string;
    deliveryAddress?: string;
    customerPhone?: string;
    customerName?: string;
    daysBooked?: number;
    rulesAgreed?: boolean;
    waiverSigned?: boolean;
}
declare const _default: mongoose.Model<IBooking, {}, {}, {}, mongoose.Document<unknown, {}, IBooking, {}, {}> & IBooking & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
export default _default;
