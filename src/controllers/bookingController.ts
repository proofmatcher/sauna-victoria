import { Request, Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware.js";
import { createBooking } from "../services/bookingService.js";
import Booking from "../models/Booking.js";
import BlockedPeriod from "../models/BlockedPeriod.js";
import Trip from "../models/Trip.js";
import Vessel from "../models/Vessel.js";
import { User } from "../models/User.js";
import mongoose from "mongoose";
import {
  createCheckoutSession,
  verifyPaymentStatus,
} from "../services/stripePaymentService.js";
import { validateRentalDates, normalizeDateToMidnight } from "../utils/rentalDateUtils.js";
import {
  calculateDistanceFromHillsideMall,
  calculateDeliveryFee,
  calculateWoodBinsCost,
  getDeliveryFeeBreakdown,
  getWoodBinsBreakdown
} from "../utils/deliveryCalculations.js";
import {
  calculateAgeYears,
  calculateMobileSaunaPricing,
} from "../services/mobileSaunaPricingService.js";

/**
 * Check if vessel has available inventory for the date range
 * Returns number of available units
 */
async function checkVesselAvailability(
  vesselId: string,
  startDate: Date,
  endDate: Date
): Promise<{ available: number; booked: number; total: number }> {
  // Get vessel to check total inventory
  const vessel = await Vessel.findById(vesselId);
  if (!vessel) {
    throw new Error("Vessel not found");
  }

  const totalUnits = vessel.inventory || 1;

  // A blocked period makes the vessel unavailable regardless of booking count.
  const blockedPeriodsCount = await BlockedPeriod.countDocuments({
    vessel: vesselId,
    startDate: { $lte: endDate },
    endDate: { $gte: startDate },
  });

  if (blockedPeriodsCount > 0) {
    return {
      available: 0,
      booked: totalUnits,
      total: totalUnits,
    };
  }

  // Count confirmed or pending bookings that overlap with requested dates
  // A booking overlaps if: booking.startTime <= endDate AND booking.endTime >= startDate
  const bookedUnits = await Booking.countDocuments({
    vessel: vesselId,
    status: { $in: ['pending', 'confirmed'] },
    startTime: { $lte: endDate },
    endTime: { $gte: startDate }
  });

  const availableUnits = totalUnits - bookedUnits;

  return {
    available: Math.max(0, availableUnits),
    booked: bookedUnits,
    total: totalUnits
  };
}

/**
 * Reserve a booking (trip or trailer)
 * Supports both guest and admin bookings
 */
export const createBookingController = async (req: AuthRequest, res: Response) => {
  const { 
    tripId, 
    vesselId, 
    seatsBooked, 
    startTime, 
    endTime, 
    isGroup,
    customerName,
    customerEmail,
    customerPhone
  } = req.body;

  try {
    // Determine user ID and customer email based on authentication type
    let userId: string | null = null;
    let finalCustomerEmail = customerEmail;
    
    if (req.isGuest) {
      // Guest booking - no user account
      userId = null;
      finalCustomerEmail = req.guestEmail || customerEmail; // Use verified guest email
    } else if (req.user) {
      // Admin creating booking
      userId = req.user._id.toString();
      finalCustomerEmail = customerEmail || req.user.email; // Use provided email or admin's email
    }

    const booking = await createBooking({
      userId,
      tripId,
      vesselId,
      seatsBooked,
      startTime,
      endTime,
      isGroup,
      customerName,
      customerEmail: finalCustomerEmail,
      customerPhone,
    });

    res.status(201).json({
      message: "Booking created successfully",
      booking,
    });
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

/**
 * Get all bookings for current user
 */
export const getMyBookings = async (req: Request, res: Response) => {
  const userId = (req as any).user._id;
  const bookings = await Booking.find({ user: userId })
    .populate("trip vessel")
    .sort({ createdAt: -1 });
  res.json(bookings);
};

/**
 * Cancel a pending booking (restore seats)
 */
export const cancelBooking = async (req: Request, res: Response) => {
  const userId = (req as any).user._id;
  const booking = await Booking.findOne({ _id: req.params.id, user: userId });
  if (!booking) return res.status(404).json({ message: "Booking not found" });

  if (booking.status === "cancelled") {
    return res.status(400).json({ message: "Booking is already cancelled" });
  }

  if (booking.status === "confirmed") {
    return res.status(400).json({ message: "Cannot cancel confirmed booking. Please contact support." });
  }

  // restore seats if pending trip booking (but not for mobile saunas)
  if (booking.status === "pending" && booking.trip) {
    const trip = await Trip.findById(booking.trip).populate('vessel');
    if (trip) {
      const vessel = trip.vessel as any;
      
      // Only restore seats for regular boats/trailers, not mobile saunas
      if (vessel?.type !== 'mobile_sauna') {
        // Restore seats
        if (booking.seatsBooked) {
          trip.remainingSeats += booking.seatsBooked;
          // Get capacity from associated vessel
          const vesselCapacity = vessel?.capacity || 8;
          // Ensure we don't exceed capacity
          if (trip.remainingSeats > vesselCapacity) {
            trip.remainingSeats = vesselCapacity;
          }
        }
        
        // Reset group booking flag if this was a group booking
        // Check if this booking had booked all seats
        const vesselCapacity = vessel?.capacity || 8;
        if (trip.remainingSeats === vesselCapacity) {
          trip.groupBooked = false;
        }
        
        await trip.save();
      }
      // For mobile saunas, no need to restore seats since they weren't reduced
    }
  }

  booking.status = "cancelled";

  // If payment was never captured, there is no real deposit hold to refund later.
  // Mark as refunded-equivalent to avoid leaving stale "held" state.
  if (!booking.stripePaymentIntentId && booking.damageDepositStatus === 'held') {
    booking.damageDepositStatus = 'refunded';
    booking.damageDepositRefundDate = new Date();
    booking.damageDepositNotes = booking.damageDepositNotes || 'Booking cancelled before payment capture; no deposit charge was collected.';
  }

  await booking.save();

  res.json({ message: "Booking cancelled successfully", booking });
};

/**
 * Initialize payment for a booking
 * Creates a Stripe Checkout session
 */
export const initiatePayment = async (req: Request, res: Response) => {
  const { bookingId, successUrl, cancelUrl } = req.body;

  try {
    // Verify booking belongs to user (admin) or guest email matches
    let booking;
    if ((req as any).isGuest) {
      // Guest booking - match by booking ID and email
      const guestEmail = (req as any).guestEmail;
      booking = await Booking.findOne({ _id: bookingId, customerEmail: guestEmail });
    } else if ((req as any).user) {
      // Admin booking - match by booking ID and user ID
      const userId = (req as any).user._id;
      booking = await Booking.findOne({ _id: bookingId, user: userId });
    }
    
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Validate that customer has agreed to rules and signed waiver
    if (!booking.rulesAgreed || !booking.waiverSigned) {
      return res.status(400).json({ 
        message: "Customer must agree to rules and sign waiver before payment",
        rulesAgreed: booking.rulesAgreed || false,
        waiverSigned: booking.waiverSigned || false
      });
    }

    if (booking.status !== "pending") {
      return res.status(400).json({ 
        message: `Cannot initiate payment. Booking status is ${booking.status}` 
      });
    }

    // Create Stripe checkout session
    const checkoutSession = await createCheckoutSession(
      bookingId,
      successUrl || `${process.env.FRONTEND_URL}/booking/success?bookingId=${bookingId}`,
      cancelUrl || `${process.env.FRONTEND_URL}/booking/cancel?bookingId=${bookingId}`
    );

    res.json({
      message: "Checkout session created",
      sessionId: checkoutSession.sessionId,
      url: checkoutSession.url,
    });
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

/**
 * Verify payment status for a booking
 */
export const checkPaymentStatus = async (req: Request, res: Response) => {
  const bookingId = req.params.bookingId;

  if (!bookingId) {
    return res.status(400).json({ message: "Booking ID is required" });
  }

  try {
    // Verify booking belongs to user (admin) or guest email matches
    let booking;
    if ((req as any).isGuest) {
      // Guest booking - match by booking ID and email
      const guestEmail = (req as any).guestEmail;
      booking = await Booking.findOne({ _id: bookingId, customerEmail: guestEmail });
    } else if ((req as any).user) {
      // Admin booking - match by booking ID and user ID
      const userId = (req as any).user._id;
      booking = await Booking.findOne({ _id: bookingId, user: userId });
    }
    
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const paymentStatus = await verifyPaymentStatus(bookingId);

    res.json({
      bookingId,
      ...paymentStatus,
    });
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

// ===== MOBILE SAUNA BOOKING FUNCTIONS =====

/**
 * Enhanced createBooking to handle mobile sauna pricing and customer details
 * Now accepts startDate and endDate instead of days
 */
export const createMobileSaunaBooking = async (req: Request, res: Response) => {
  const { 
    tripId,
    startDate,
    endDate,
    customerName,
    customerEmail,
    customerBirthdate,
    customerPhone, 
    deliveryAddress,
    additionalWoodBins = 0, // Default to 0 additional bins
    rulesAgreed,
    waiverSigned
  } = req.body;

  try {
    // Determine user ID and customer email based on authentication type
    let userId: string | null = null;
    let finalCustomerEmail = customerEmail;
    
    if ((req as any).isGuest) {
      // Guest booking - no user account
      userId = null;
      finalCustomerEmail = (req as any).guestEmail || customerEmail; // Use verified guest email
    } else if ((req as any).user) {
      // Admin creating booking
      userId = (req as any).user._id.toString();
      finalCustomerEmail = customerEmail || (req as any).user.email; // Use provided email or admin's email
    }

    // Validation for mobile sauna bookings
    if (!tripId || !startDate || !endDate || !customerName || !customerEmail || !customerBirthdate || !customerPhone || !deliveryAddress) {
      return res.status(400).json({ 
        message: "Missing required fields: tripId, startDate, endDate, customerName, customerEmail, customerBirthdate, customerPhone, deliveryAddress" 
      });
    }

    // Note: rulesAgreed and waiverSigned can be false during booking creation
    // Payment will be blocked until both are true (validated in initiatePayment)
    
    // Validate additionalWoodBins
    if (additionalWoodBins < 0 || additionalWoodBins > 10) {
      return res.status(400).json({
        message: "Additional wood bins must be between 0 and 10"
      });
    }

    // Validate customer age (must be 18+)
    const birthdate = normalizeDateToMidnight(customerBirthdate);
    if (Number.isNaN(birthdate.getTime())) {
      return res.status(400).json({ message: "Invalid birthdate provided" });
    }

    const ageYears = calculateAgeYears(birthdate);
    if (ageYears < 18) {
      return res.status(400).json({
        message: "You must be at least 18 years old to book a mobile sauna",
        minimumAge: 18,
        providedAge: ageYears,
      });
    }

    // Calculate delivery distance and fee using Google Maps API
    let deliveryDistanceKm = 0;
    let deliveryFeeCents = 0;
    let deliveryFeeBreakdown;

    try {
      const distanceResult = await calculateDistanceFromHillsideMall(deliveryAddress);
      deliveryDistanceKm = distanceResult.distanceKm;
      deliveryFeeCents = calculateDeliveryFee(deliveryDistanceKm);
      deliveryFeeBreakdown = getDeliveryFeeBreakdown(deliveryDistanceKm);

      console.log(`📍 Delivery distance calculated: ${deliveryDistanceKm}km from Hillside Mall to ${deliveryAddress}`);
      console.log(`💰 Delivery fee: $${(deliveryFeeCents / 100).toFixed(2)}`);
    } catch (error: any) {
      return res.status(400).json({
        message: "Failed to calculate delivery distance",
        error: error.message,
        suggestion: "Please verify the delivery address is correct and complete (include city, province, postal code)"
      });
    }

    // Calculate wood bins cost
    const woodBinsCostCents = calculateWoodBinsCost(additionalWoodBins);
    const woodBinsBreakdown = getWoodBinsBreakdown(additionalWoodBins);

    console.log(`🪵 Wood bins: ${additionalWoodBins} additional bins = $${(woodBinsCostCents / 100).toFixed(2)}`);


    // Normalize dates to midnight for consistent comparison
    const pickupDate = normalizeDateToMidnight(startDate);
    const dropoffDate = normalizeDateToMidnight(endDate);

    // Validate dates are not in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (pickupDate < today) {
      return res.status(400).json({
        message: "Pickup date cannot be in the past",
        requestedDate: pickupDate.toISOString().split('T')[0],
        currentDate: today.toISOString().split('T')[0],
        error: "Invalid date"
      });
    }

    if (dropoffDate < today) {
      return res.status(400).json({
        message: "Drop-off date cannot be in the past",
        requestedDate: dropoffDate.toISOString().split('T')[0],
        currentDate: today.toISOString().split('T')[0],
        error: "Invalid date"
      });
    }

    // Get trip and populate vessel
    const trip = await Trip.findById(tripId).populate('vessel');
    if (!trip) {
      return res.status(404).json({ message: "Trip not found" });
    }

    const vessel = trip.vessel as any;
    if (!vessel || vessel.type !== "mobile_sauna") {
      return res.status(404).json({ message: "This trip is not for a mobile sauna" });
    }

    // Check vessel availability for the selected dates
    const availability = await checkVesselAvailability(vessel._id, pickupDate, dropoffDate);
    
    if (availability.available <= 0) {
      return res.status(409).json({ 
        message: `No units available for selected dates. All ${availability.total} unit(s) are booked.`,
        availability: {
          totalUnits: availability.total,
          bookedUnits: availability.booked,
          availableUnits: availability.available
        },
        suggestion: "Please select different dates or contact us for assistance."
      });
    }

    // Get configured pickup/dropoff day for this vessel (default: Friday = 5)
    const designatedDay = vessel.pickupDropoffDay !== undefined ? vessel.pickupDropoffDay : 5;

    // Validate rental dates using configurable weekly logic
    const dateValidation = validateRentalDates(pickupDate, dropoffDate, designatedDay, vessel.enforceWeeklyBoundary ?? false);
    
    if (!dateValidation.isValid) {
      return res.status(400).json({ 
        message: dateValidation.message,
        pickupDay: dateValidation.pickupDay,
        dropoffDay: dateValidation.dropoffDay,
        error: "Invalid rental dates"
      });
    }

    // Get calculated days from validation
    const days = dateValidation.days!;

    // Validate minimum days based on sauna type
    if (days < (vessel.minimumDays || 1)) {
      return res.status(400).json({ 
        message: `Minimum ${vessel.minimumDays} days required for ${vessel.name}`,
        requestedDays: days,
        minimumRequired: vessel.minimumDays || 1
      });
    }

    // Calculate final pricing using shared pricing service
    const damageDepositCents = 25000; // $250.00 refundable damage deposit
    const pricing = calculateMobileSaunaPricing({
      days,
      vessel: {
        basePriceCents: vessel.basePriceCents,
        pricingTiers: vessel.pricingTiers,
        discountThreshold: vessel.discountThreshold,
        discountPercent: vessel.discountPercent,
      },
      deliveryFeeCents,
      woodBinsCostCents,
      damageDepositCents,
    });

    console.log(`💵 Pricing breakdown:`);
    console.log(`   Base rental: $${(pricing.baseRentalPriceCents / 100).toFixed(2)}`);
    console.log(`   Discount: -$${(pricing.discountAmountCents / 100).toFixed(2)}`);
    console.log(`   Rental after discount: $${(pricing.rentalPriceCents / 100).toFixed(2)}`);
    console.log(`   Delivery: $${(pricing.deliveryFeeCents / 100).toFixed(2)}`);
    console.log(`   Wood bins: $${(pricing.woodBinsCostCents / 100).toFixed(2)}`);
    console.log(`   GST (5%): $${(pricing.gstCents / 100).toFixed(2)}`);
    console.log(`   Damage Deposit: $${(pricing.damageDepositCents / 100).toFixed(2)} (Refundable)`);
    console.log(`   TOTAL DUE NOW: $${(pricing.totalDueNowCents / 100).toFixed(2)}`);

    // For mobile saunas, rental period starts when payment is approved (not trip departure)
    // Initially set startTime and endTime to null - they will be set when payment is confirmed
    const bookingTime = new Date(); // When user made the booking request

    // Update user profile with delivery information (only if admin booking for a user)
    if (userId) {
      await User.findByIdAndUpdate(userId, {
        phone: customerPhone,
        address: deliveryAddress
      });
    }

    // Create mobile sauna booking with selected dates
    const booking = await Booking.create({
      user: userId ? new mongoose.Types.ObjectId(userId) : null,
      trip: trip._id,
      vessel: vessel._id,
      startTime: pickupDate, // Selected pick-up date
      endTime: dropoffDate,   // Selected drop-off date
      totalPriceCents: pricing.totalDueNowCents,
      status: "pending",
      daysBooked: days,
      customerName,
      customerEmail: finalCustomerEmail,
      customerBirthdate: birthdate,
      customerPhone,
      deliveryAddress,
      deliveryDistanceKm,
      deliveryFeeCents: pricing.deliveryFeeCents,
      additionalWoodBins,
      woodBinsCostCents: pricing.woodBinsCostCents,
      rentalPriceCents: pricing.rentalPriceCents,
      baseRentalPriceCents: pricing.baseRentalPriceCents,
      discountAmountCents: pricing.discountAmountCents,
      gstCents: pricing.gstCents,
      gstRate: pricing.gstRate,
      taxableSubtotalCents: pricing.taxableSubtotalCents,
      damageDepositCents: pricing.damageDepositCents,
      damageDepositStatus: 'held', // Initial deposit status
      rulesAgreed,
      waiverSigned,
      holdExpiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes hold
    });

    res.status(201).json({
      message: "Mobile sauna booking created successfully",
      booking: {
        id: booking._id,
        trip: trip.title || `${vessel.name} Rental`,
        vessel: vessel.name,
        pickupDate: pickupDate.toISOString().split('T')[0],
        dropoffDate: dropoffDate.toISOString().split('T')[0],
        pickupDay: dateValidation.pickupDay,
        dropoffDay: dateValidation.dropoffDay,
        days,
        totalPriceCents: pricing.totalDueNowCents,
        pricePerDay: Math.round(pricing.rentalPriceCents / days),
        deliveryAddress,
        status: booking.status,
        discountApplied: pricing.discountApplied,
        requiresWeeklyPrice: dateValidation.requiresWeeklyPrice,
        pricingBreakdown: {
          baseTierPrice: pricing.baseRentalPriceCents,
          discountAmount: pricing.discountAmountCents,
          rentalPrice: pricing.rentalPriceCents,
          deliveryFee: pricing.deliveryFeeCents,
          deliveryDistance: deliveryDistanceKm,
          deliveryFreeRadius: 20,
          taxableSubtotal: pricing.taxableSubtotalCents,
          gstRate: pricing.gstRate,
          gstAmount: pricing.gstCents,
          totalBeforeDeposit: pricing.totalBeforeDepositCents,
          damageDeposit: pricing.damageDepositCents,
          woodBins: {
            additional: additionalWoodBins,
            free: 2,
            total: 2 + additionalWoodBins,
            cost: pricing.woodBinsCostCents
          },
          finalPrice: pricing.totalDueNowCents
        },
        dateValidation: {
          isValid: dateValidation.isValid,
          message: dateValidation.message
        }
      }
    });
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

/**
 * Get vessel availability for date range
 * Query params: startDate, endDate
 * Returns day-by-day availability
 */
export const getVesselAvailability = async (req: Request, res: Response) => {
  const { vesselId } = req.params;
  const { startDate, endDate } = req.query;

  try {
    if (!startDate || !endDate) {
      return res.status(400).json({
        message: "startDate and endDate query parameters are required",
        example: "/api/vessels/:vesselId/availability?startDate=2026-01-16&endDate=2026-01-31"
      });
    }

    // Get vessel info
    const vessel = await Vessel.findById(vesselId);
    if (!vessel) {
      return res.status(404).json({ message: "Vessel not found" });
    }

    const start = normalizeDateToMidnight(startDate as string);
    const end = normalizeDateToMidnight(endDate as string);

    // Validate dates are not in the past
    const today = normalizeDateToMidnight(new Date());
    if (start < today) {
      return res.status(400).json({
        message: "Start date cannot be in the past",
        providedStartDate: start.toISOString().split('T')[0],
        today: today.toISOString().split('T')[0]
      });
    }

    if (end < start) {
      return res.status(400).json({
        message: "End date cannot be before start date",
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0]
      });
    }

    // Get all bookings for this vessel in the date range
    const bookings = await Booking.find({
      vessel: vesselId,
      status: { $in: ['pending', 'confirmed'] },
      startTime: { $lte: end },
      endTime: { $gte: start }
    }).select('startTime endTime status');

      const blockedPeriods = await BlockedPeriod.find({
        vessel: vesselId,
        startDate: { $lte: end },
        endDate: { $gte: start },
      }).select('startDate endDate reason');

    // Build day-by-day availability
    const availability = [];
    const currentDate = new Date(start);
    const totalUnits = vessel.inventory || 1;

    while (currentDate <= end) {
      const activeBlock = blockedPeriods.find((period) => {
        const blockStart = new Date(period.startDate);
        const blockEnd = new Date(period.endDate);
        blockStart.setHours(0, 0, 0, 0);
        blockEnd.setHours(0, 0, 0, 0);
        return currentDate >= blockStart && currentDate <= blockEnd;
      });

      // Count how many bookings include this date
      const bookedUnitsFromBookings = bookings.filter(booking => {
        const bookingStart = new Date(booking.startTime!);
        const bookingEnd = new Date(booking.endTime!);
        bookingStart.setHours(0, 0, 0, 0);
        bookingEnd.setHours(0, 0, 0, 0);
        return currentDate >= bookingStart && currentDate <= bookingEnd;
      }).length;

      const blockedByMaintenance = Boolean(activeBlock);
      const bookedUnits = blockedByMaintenance ? totalUnits : bookedUnitsFromBookings;
      const availableUnits = blockedByMaintenance ? 0 : totalUnits - bookedUnits;

      availability.push({
        date: currentDate.toISOString().split('T')[0],
        dayOfWeek: currentDate.toLocaleDateString('en-US', { weekday: 'long' }),
        totalUnits,
        bookedUnits,
        availableUnits,
        isAvailable: availableUnits > 0,
        isBlocked: blockedByMaintenance,
        blockedReason: activeBlock?.reason || null,
        unavailableReason: blockedByMaintenance ? 'maintenance' : (availableUnits === 0 ? 'fully_booked' : null)
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Calculate summary: minimum available units across all days in range
    const minAvailable = availability.reduce((min, day) => 
      day.availableUnits < min ? day.availableUnits : min, 
      totalUnits
    );
    const maxBooked = availability.reduce((max, day) => 
      day.bookedUnits > max ? day.bookedUnits : max, 
      0
    );

    res.json({
      vessel: {
        id: vessel._id,
        name: vessel.name,
        type: vessel.type,
        capacity: vessel.capacity,
        totalUnits: totalUnits,
        pickupDropoffDay: vessel.pickupDropoffDay || 5
      },
      dateRange: {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0]
      },
      // Summary for quick availability check
      available: minAvailable,
      booked: maxBooked,
      total: totalUnits,
      // Detailed day-by-day breakdown
      availability
    });

  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * Get all booked date ranges for a vessel
 * Returns simplified list of booked periods
 */
export const getVesselBookedDates = async (req: Request, res: Response) => {
  const { vesselId } = req.params;

  console.log('📅 Booked dates request:', { vesselId, timestamp: new Date().toISOString() });

  try {
    const vessel = await Vessel.findById(vesselId);
    if (!vessel) {
      console.warn('⚠️  Vessel not found:', vesselId);
      return res.status(404).json({ message: "Vessel not found" });
    }

    console.log('✅ Vessel found:', { id: vessel._id, name: vessel.name, type: vessel.type });

    // Get all confirmed and pending bookings
    const bookings = await Booking.find({
      vessel: vesselId,
      status: { $in: ['pending', 'confirmed'] }
    })
    .select('startTime endTime status customerName')
    .sort({ startTime: 1 });

    console.log('📊 Bookings found:', { 
      count: bookings.length,
      statuses: bookings.map(b => b.status)
    });

    const bookedPeriods = bookings.map(booking => ({
      startDate: booking.startTime?.toISOString().split('T')[0],
      endDate: booking.endTime?.toISOString().split('T')[0],
      status: booking.status,
      customerName: booking.customerName || 'Reserved'
    }));

    const blockedPeriods = await BlockedPeriod.find({ vessel: vesselId })
      .select('startDate endDate reason')
      .sort({ startDate: 1 });

    const blockedAsBookedPeriods = blockedPeriods.map((period) => ({
      startDate: period.startDate?.toISOString().split('T')[0],
      endDate: period.endDate?.toISOString().split('T')[0],
      status: 'blocked',
      customerName: period.reason === 'personal_use' ? 'Maintenance Block' : 'Maintenance Block',
      reason: period.reason,
    }));

    const mergedPeriods = [...bookedPeriods, ...blockedAsBookedPeriods].sort((a, b) => {
      const dateA = new Date(a.startDate || 0).getTime();
      const dateB = new Date(b.startDate || 0).getTime();
      return dateA - dateB;
    });

    console.log('✅ Returning booked periods:', bookedPeriods);

    res.json({
      vessel: {
        id: vessel._id,
        name: vessel.name,
        totalUnits: vessel.inventory || 1
      },
      totalBookings: bookings.length,
      totalBlockedPeriods: blockedPeriods.length,
      bookedPeriods: mergedPeriods
    });

  } catch (err: any) {
    console.error('❌ Error fetching booked dates:', {
      vesselId,
      error: err.message,
      stack: err.stack
    });
    res.status(500).json({ message: err.message });
  }
};

/**
 * Calculate pricing preview for mobile sauna booking
 * Returns breakdown of rental, delivery, wood bins costs
 * Does NOT create a booking - just previews pricing
 */
export const getMobileSaunaPricingPreview = async (req: Request, res: Response) => {
  const { vesselId } = req.params;
  const { startDate, endDate, deliveryAddress, additionalWoodBins = 0 } = req.query;

  try {
    // Validate required parameters
    if (!startDate || !endDate) {
      return res.status(400).json({ 
        message: "Missing required parameters: startDate and endDate" 
      });
    }

    // Normalize dates
    const pickupDate = normalizeDateToMidnight(startDate as string);
    const dropoffDate = normalizeDateToMidnight(endDate as string);

    // Validate dates are not in the past
    const today = normalizeDateToMidnight(new Date());
    if (pickupDate < today) {
      return res.status(400).json({
        message: "Start date cannot be in the past",
        providedStartDate: pickupDate.toISOString().split('T')[0],
        today: today.toISOString().split('T')[0]
      });
    }

    if (dropoffDate < pickupDate) {
      return res.status(400).json({
        message: "End date cannot be before start date",
        startDate: pickupDate.toISOString().split('T')[0],
        endDate: dropoffDate.toISOString().split('T')[0]
      });
    }

    // Get vessel
    const vessel = await Vessel.findById(vesselId);
    if (!vessel) {
      return res.status(404).json({ message: "Vessel not found" });
    }

    if (vessel.type !== "mobile_sauna") {
      return res.status(400).json({ message: "This endpoint is only for mobile saunas" });
    }

    // Get designated pickup/dropoff day
    const designatedDay = vessel.pickupDropoffDay !== undefined ? vessel.pickupDropoffDay : 5;

    // Validate rental dates
    const dateValidation = validateRentalDates(pickupDate, dropoffDate, designatedDay, vessel.enforceWeeklyBoundary ?? false);
    
    if (!dateValidation.isValid) {
      return res.status(400).json({ 
        message: dateValidation.message,
        pickupDay: dateValidation.pickupDay,
        dropoffDay: dateValidation.dropoffDay,
        error: "Invalid rental dates"
      });
    }

    const days = dateValidation.days!;

    // Calculate delivery fee if address provided
    let deliveryFeeCents = 0;
    let deliveryDistanceKm = 0;
    let deliveryBreakdown = null;

    if (deliveryAddress) {
      try {
        const distanceResult = await calculateDistanceFromHillsideMall(deliveryAddress as string);
        deliveryDistanceKm = distanceResult.distanceKm;
        deliveryFeeCents = calculateDeliveryFee(deliveryDistanceKm);
        deliveryBreakdown = getDeliveryFeeBreakdown(deliveryDistanceKm);
      } catch (error: any) {
        return res.status(400).json({
          message: "Failed to calculate delivery distance",
          error: error.message,
          suggestion: "Please verify the delivery address is correct and complete"
        });
      }
    }

    // Calculate wood bins cost
    const woodBins = Math.max(0, Math.min(10, parseInt(additionalWoodBins as string) || 0));
    const woodBinsCostCents = calculateWoodBinsCost(woodBins);
    const woodBinsBreakdown = getWoodBinsBreakdown(woodBins);
    const damageDepositCents = 25000;
    const pricing = calculateMobileSaunaPricing({
      days,
      vessel: {
        basePriceCents: vessel.basePriceCents,
        pricingTiers: vessel.pricingTiers,
        discountThreshold: vessel.discountThreshold,
        discountPercent: vessel.discountPercent,
      },
      deliveryFeeCents,
      woodBinsCostCents,
      damageDepositCents,
    });

    res.json({
      vesselId: vessel._id,
      vesselName: vessel.name,
      dateRange: {
        startDate: pickupDate.toISOString().split('T')[0],
        endDate: dropoffDate.toISOString().split('T')[0],
        days,
        pickupDay: dateValidation.pickupDay,
        dropoffDay: dateValidation.dropoffDay
      },
      pricing: {
        baseRentalCostCents: pricing.baseRentalPriceCents,
        discountApplied: pricing.discountApplied,
        discountPercent: pricing.discountPercent,
        discountThresholdDays: pricing.discountThresholdDays,
        discountAmountCents: pricing.discountAmountCents,
        rentalCostCents: pricing.rentalPriceCents,
        deliveryFeeCents: pricing.deliveryFeeCents,
        woodBinsCostCents: pricing.woodBinsCostCents,
        taxableSubtotalCents: pricing.taxableSubtotalCents,
        gstRate: pricing.gstRate,
        gstCents: pricing.gstCents,
        totalCostCents: pricing.totalBeforeDepositCents,
        damageDepositCents: pricing.damageDepositCents,
        totalDueNowCents: pricing.totalDueNowCents,
        dailyIncrementCents: pricing.dailyIncrementCents,
        // Breakdown in dollars for display
        breakdown: {
          rentalBase: (pricing.baseRentalPriceCents / 100).toFixed(2),
          rentalDiscount: (pricing.discountAmountCents / 100).toFixed(2),
          rental: (pricing.rentalPriceCents / 100).toFixed(2),
          delivery: (pricing.deliveryFeeCents / 100).toFixed(2),
          woodBins: (pricing.woodBinsCostCents / 100).toFixed(2),
          taxableSubtotal: (pricing.taxableSubtotalCents / 100).toFixed(2),
          gst: (pricing.gstCents / 100).toFixed(2),
          total: (pricing.totalBeforeDepositCents / 100).toFixed(2),
          deposit: (pricing.damageDepositCents / 100).toFixed(2),
          totalDueNow: (pricing.totalDueNowCents / 100).toFixed(2)
        }
      },
      deliveryDetails: deliveryBreakdown ? {
        distanceKm: deliveryBreakdown.distanceKm,
        freeRadiusKm: deliveryBreakdown.freeRadiusKm,
        additionalKm: deliveryBreakdown.additionalKm,
        pricePerKm: deliveryBreakdown.pricePerKm,
        isFree: deliveryBreakdown.isFree
      } : null,
      woodBinsDetails: {
        freeBins: woodBinsBreakdown.freeBins,
        additionalBins: woodBinsBreakdown.additionalBins,
        totalBins: woodBinsBreakdown.totalBins,
        pricePerBin: woodBinsBreakdown.pricePerBin
      }
    });
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

/**
 * Update booking to accept agreement (set rulesAgreed to true)
 * Called after user reviews agreement modal and clicks "I agree"
 */
export const acceptBookingAgreement = async (req: Request, res: Response) => {
  const { bookingId } = req.body;

  try {
    if (!bookingId) {
      return res.status(400).json({ message: "bookingId is required" });
    }

    // Verify booking belongs to user (admin) or guest email matches
    let booking;
    if ((req as any).isGuest) {
      // Guest booking - match by booking ID and email
      const guestEmail = (req as any).guestEmail;
      booking = await Booking.findOne({ _id: bookingId, customerEmail: guestEmail });
    } else if ((req as any).user) {
      // Admin booking - match by booking ID and user ID
      const userId = (req as any).user._id;
      booking = await Booking.findOne({ _id: bookingId, user: userId });
    }
    
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (booking.status !== "pending") {
      return res.status(400).json({ 
        message: `Cannot update agreement. Booking status is ${booking.status}` 
      });
    }

    // Update rulesAgreed and waiverSigned to true
    booking.rulesAgreed = true;
    booking.waiverSigned = true;
    booking.agreementAcceptedAt = new Date();
    
    // Store IP address if available (from request)
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    if (ipAddress) {
      booking.agreementIpAddress = ipAddress.toString();
    }

    await booking.save();

    res.json({
      success: true,
      message: "Agreement accepted successfully. You can now proceed to payment.",
      booking: {
        id: booking._id,
        rulesAgreed: booking.rulesAgreed,
        waiverSigned: booking.waiverSigned,
        agreementAcceptedAt: booking.agreementAcceptedAt,
        status: booking.status
      }
    });
  } catch (err: any) {
    res.status(400).json({ message: err.message });
  }
};

/**
 * Lookup booking by email and booking ID (for guests)
 * Public endpoint - no authentication required
 */
export const lookupBooking = async (req: Request, res: Response) => {
  try {
    const { email, bookingId } = req.body;

    if (!email) {
      return res.status(400).json({ 
        message: 'Email address is required' 
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // If bookingId provided, look up a specific booking
    if (bookingId) {
      if (!mongoose.Types.ObjectId.isValid(bookingId)) {
        return res.status(404).json({ message: 'Booking not found' });
      }

      const booking: any = await Booking.findOne({
        _id: bookingId,
        customerEmail: normalizedEmail
      })
        .populate('trip')
        .populate('vessel')
        .lean();

      if (!booking) {
        return res.status(404).json({ 
          message: 'Booking not found. Please check your email and booking ID.' 
        });
      }

      return res.json({
        success: true,
        bookings: [formatBookingForGuest(booking)]
      });
    }

    // Email-only lookup: return all bookings for this email
    const bookings: any[] = await Booking.find({
      customerEmail: normalizedEmail
    })
      .populate('trip')
      .populate('vessel')
      .sort({ createdAt: -1 })
      .lean();

    if (!bookings || bookings.length === 0) {
      return res.status(404).json({ 
        message: 'No bookings found for this email address.' 
      });
    }

    return res.json({
      success: true,
      bookings: bookings.map(formatBookingForGuest)
    });

  } catch (err: any) {
    console.error('Lookup booking error:', err);
    res.status(500).json({ 
      message: 'Failed to lookup booking. Please try again.' 
    });
  }
};

function formatBookingForGuest(booking: any) {
  return {
    _id: booking._id,
    bookingId: booking._id,
    customerName: booking.customerName,
    customerEmail: booking.customerEmail,
    customerPhone: booking.customerPhone,
    trip: booking.trip,
    vessel: booking.vessel,
    startTime: booking.startTime,
    endTime: booking.endTime,
    numberOfSeats: booking.numberOfSeats,
    isGroup: booking.isGroup,
    totalAmount: booking.totalAmount,
    totalPriceCents: booking.totalPriceCents,
    status: booking.status,
    paymentStatus: booking.paymentStatus,
    rulesAgreed: booking.rulesAgreed,
    waiverSigned: booking.waiverSigned,
    createdAt: booking.createdAt,
    deliveryAddress: booking.deliveryAddress,
    additionalWoodBins: booking.additionalWoodBins,
    deliveryFee: booking.deliveryFee || booking.deliveryFeeCents,
    woodBinsFee: booking.woodBinsFee || booking.woodBinsCostCents,
    damageDepositCents: booking.damageDepositCents,
    damageDepositStatus: booking.damageDepositStatus,
  };
}
