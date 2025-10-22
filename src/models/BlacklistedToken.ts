import mongoose, { Schema, Document } from "mongoose";

export interface IBlacklistedToken extends Document {
  token: string;
  userId: mongoose.Types.ObjectId;
  expiresAt: Date;
  reason: string; // 'logout', 'password-change', 'admin-revoke'
  createdAt: Date;
}

const blacklistedTokenSchema = new Schema<IBlacklistedToken>(
  {
    token: { 
      type: String, 
      required: true, 
      unique: true,
      index: true // Index for fast lookups
    },
    userId: { 
      type: Schema.Types.ObjectId, 
      ref: "User", 
      required: true,
      index: true
    },
    expiresAt: { 
      type: Date, 
      required: true,
      index: { expireAfterSeconds: 0 } // MongoDB will auto-delete expired documents
    },
    reason: { 
      type: String, 
      enum: ['logout', 'password-change', 'admin-revoke', 'security-breach'],
      default: 'logout'
    }
  },
  { 
    timestamps: true 
  }
);

// Compound index for efficient queries
blacklistedTokenSchema.index({ token: 1, expiresAt: 1 });

export const BlacklistedToken = mongoose.model<IBlacklistedToken>("BlacklistedToken", blacklistedTokenSchema);