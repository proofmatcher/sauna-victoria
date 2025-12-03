import mongoose, { Document } from "mongoose";
export interface ITrip extends Document {
    vessel: mongoose.Types.ObjectId;
    title: string;
    departureTime: Date;
    durationMinutes: number;
    remainingSeats: number;
    groupBooked: boolean;
    assignedStaff: mongoose.Types.ObjectId[];
    staffNotified: boolean;
}
declare const _default: mongoose.Model<ITrip, {}, {}, {}, mongoose.Document<unknown, {}, ITrip, {}, {}> & ITrip & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
export default _default;
