import mongoose, { Schema, Document } from "mongoose";

export interface IVerificationCode extends Document {
  email: string;
  code: string;
  purpose: "booking" | "staff-verification";
  expiresAt: Date;
  verified: boolean;
  attempts: number;
  createdAt: Date;
  isValid(): boolean;
  incrementAttempts(): Promise<void>;
}

const verificationCodeSchema = new Schema<IVerificationCode>(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true, // Index for faster lookups
    },
    code: {
      type: String,
      required: true,
      length: 6,
    },
    purpose: {
      type: String,
      enum: ["booking", "staff-verification"],
      default: "booking",
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true, // Index for cleanup queries
    },
    verified: {
      type: Boolean,
      default: false,
    },
    attempts: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
  },
  { 
    timestamps: true 
  }
);

// Compound index for email + purpose queries
verificationCodeSchema.index({ email: 1, purpose: 1 });

// TTL index - MongoDB will automatically delete documents after expiry
// This removes expired codes automatically without manual cleanup
verificationCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Method to check if code is still valid
verificationCodeSchema.methods.isValid = function(): boolean {
  return !this.verified && this.attempts < 5 && this.expiresAt > new Date();
};

// Method to increment attempts
verificationCodeSchema.methods.incrementAttempts = async function(): Promise<void> {
  this.attempts += 1;
  await this.save();
};

export const VerificationCode = mongoose.model<IVerificationCode>(
  "VerificationCode",
  verificationCodeSchema
);
