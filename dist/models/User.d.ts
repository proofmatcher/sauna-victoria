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
    isEmailVerified: boolean;
    emailVerificationToken?: string | undefined;
    emailVerificationExpire?: Date | undefined;
    resetPasswordToken?: string | undefined;
    resetPasswordExpire?: Date | undefined;
    comparePassword(enteredPassword: string): Promise<boolean>;
    getResetPasswordToken(): string;
    getEmailVerificationToken(): string;
}
export declare const User: mongoose.Model<IUser, {}, {}, {}, mongoose.Document<unknown, {}, IUser, {}, {}> & IUser & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
