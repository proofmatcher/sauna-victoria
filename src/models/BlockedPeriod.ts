import mongoose, { Document } from 'mongoose';

export type BlockReason = 'maintenance' | 'personal_use';

export interface IBlockedPeriod extends Document {
  vessel: mongoose.Types.ObjectId;
  startDate: Date;
  endDate: Date;
  reason: BlockReason;
  adminNote?: string;
  createdBy?: mongoose.Types.ObjectId;
}

const blockedPeriodSchema = new mongoose.Schema<IBlockedPeriod>(
  {
    vessel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vessel',
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    reason: {
      type: String,
      enum: ['maintenance', 'personal_use'],
      required: true,
    },
    adminNote: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

blockedPeriodSchema.index({ vessel: 1, startDate: 1, endDate: 1 });

blockedPeriodSchema.pre('validate', function (next) {
  if (this.startDate && this.endDate && this.endDate < this.startDate) {
    return next(new Error('endDate cannot be before startDate'));
  }
  return next();
});

export default mongoose.model<IBlockedPeriod>('BlockedPeriod', blockedPeriodSchema);
