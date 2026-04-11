import { Request, Response } from 'express';
import mongoose from 'mongoose';
import BlockedPeriod from '../models/BlockedPeriod.js';
import Booking from '../models/Booking.js';
import Vessel from '../models/Vessel.js';
import { normalizeDateToMidnight } from '../utils/rentalDateUtils.js';

export const listBlockedPeriods = async (req: Request, res: Response) => {
  try {
    const { vesselId, startDate, endDate, reason } = req.query;

    const query: any = {};

    if (vesselId) {
      query.vessel = vesselId;
    }

    if (reason) {
      query.reason = reason;
    }

    if (startDate || endDate) {
      query.$and = [];
      if (startDate) {
        query.$and.push({ endDate: { $gte: normalizeDateToMidnight(startDate as string) } });
      }
      if (endDate) {
        query.$and.push({ startDate: { $lte: normalizeDateToMidnight(endDate as string) } });
      }
      if (query.$and.length === 0) {
        delete query.$and;
      }
    }

    const blockedPeriods = await BlockedPeriod.find(query)
      .populate('vessel', 'name type')
      .populate('createdBy', 'name email')
      .sort({ startDate: 1 });

    res.json({
      count: blockedPeriods.length,
      blockedPeriods,
    });
  } catch (error: any) {
    console.error('Error listing blocked periods:', error);
    res.status(500).json({ message: error.message || 'Failed to list blocked periods' });
  }
};

export const createBlockedPeriod = async (req: Request, res: Response) => {
  try {
    const { vesselId, startDate, endDate, reason, adminNote } = req.body;

    if (!vesselId || !startDate || !endDate || !reason) {
      return res.status(400).json({
        message: 'vesselId, startDate, endDate, and reason are required',
      });
    }

    if (!mongoose.Types.ObjectId.isValid(vesselId)) {
      return res.status(400).json({ message: 'Invalid vesselId' });
    }

    if (!['maintenance', 'personal_use'].includes(reason)) {
      return res.status(400).json({
        message: 'reason must be one of: maintenance, personal_use',
      });
    }

    const vessel = await Vessel.findById(vesselId);
    if (!vessel) {
      return res.status(404).json({ message: 'Vessel not found' });
    }

    if (vessel.type !== 'mobile_sauna') {
      return res.status(400).json({ message: 'Blocked periods are only supported for mobile saunas' });
    }

    const normalizedStart = normalizeDateToMidnight(startDate);
    const normalizedEnd = normalizeDateToMidnight(endDate);

    if (Number.isNaN(normalizedStart.getTime()) || Number.isNaN(normalizedEnd.getTime())) {
      return res.status(400).json({ message: 'Invalid startDate or endDate' });
    }

    if (normalizedEnd < normalizedStart) {
      return res.status(400).json({ message: 'endDate cannot be before startDate' });
    }

    const overlappingBlock = await BlockedPeriod.findOne({
      vessel: vesselId,
      startDate: { $lte: normalizedEnd },
      endDate: { $gte: normalizedStart },
    });

    if (overlappingBlock) {
      return res.status(409).json({
        message: 'Selected date range overlaps an existing blocked period',
        conflict: overlappingBlock,
      });
    }

    const overlappingBookings = await Booking.countDocuments({
      vessel: vesselId,
      status: { $in: ['pending', 'confirmed'] },
      startTime: { $lte: normalizedEnd },
      endTime: { $gte: normalizedStart },
    });

    if (overlappingBookings > 0) {
      return res.status(409).json({
        message: 'Selected date range overlaps existing customer bookings',
        overlappingBookings,
      });
    }

    const blockedPeriod = await BlockedPeriod.create({
      vessel: vessel._id,
      startDate: normalizedStart,
      endDate: normalizedEnd,
      reason,
      adminNote,
      createdBy: (req as any).user?._id,
    });

    const populated = await blockedPeriod.populate('vessel', 'name type');

    return res.status(201).json({
      message: 'Blocked period created successfully',
      blockedPeriod: populated,
    });
  } catch (error: any) {
    console.error('Error creating blocked period:', error);
    return res.status(500).json({ message: error.message || 'Failed to create blocked period' });
  }
};

export const deleteBlockedPeriod = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid blocked period ID' });
    }

    const blockedPeriod = await BlockedPeriod.findByIdAndDelete(id);

    if (!blockedPeriod) {
      return res.status(404).json({ message: 'Blocked period not found' });
    }

    return res.json({
      message: 'Blocked period removed successfully',
      blockedPeriod,
    });
  } catch (error: any) {
    console.error('Error deleting blocked period:', error);
    return res.status(500).json({ message: error.message || 'Failed to delete blocked period' });
  }
};
