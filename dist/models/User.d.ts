import mongoose, { Document } from "mongoose";
export interface IUser extends Document {
    name: string;
    email: string;
    password: string;
    role: string;
    isActive: boolean;
    isStaff: boolean;
    phone?: string;
    address?: string;
    resetPasswordToken?: string | undefined;
    resetPasswordExpire?: Date | undefined;
    comparePassword(enteredPassword: string): Promise<boolean>;
    getResetPasswordToken(): string;
}
export declare const User: mongoose.Model<IUser, {}, {}, {}, mongoose.Document<unknown, {}, IUser, {}, {}> & IUser & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
