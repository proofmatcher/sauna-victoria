import mongoose, { Document } from "mongoose";
export interface IBlacklistedToken extends Document {
    token: string;
    userId: mongoose.Types.ObjectId;
    expiresAt: Date;
    reason: string;
    createdAt: Date;
}
export declare const BlacklistedToken: mongoose.Model<IBlacklistedToken, {}, {}, {}, mongoose.Document<unknown, {}, IBlacklistedToken, {}, {}> & IBlacklistedToken & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
