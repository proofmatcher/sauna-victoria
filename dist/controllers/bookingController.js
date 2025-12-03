import { createBooking } from "../services/bookingService.js";
import Booking from "../models/Booking.js";
import Trip from "../models/Trip.js";
import { User } from "../models/User.js";
import mongoose from "mongoose";
import { createCheckoutSession, verifyPaymentStatus, } from "../services/stripePaymentService.js";
/**
 * Reserve a booking (trip or trailer)
 */
export const createBookingController = async (req, res) => {
    const userId = req.user._id;
    const { tripId, vesselId, seatsBooked, startTime, endTime, isGroup } = req.body;
    try {
        const booking = await createBooking({
            userId,
            tripId,
            vesselId,
            seatsBooked,
            startTime,
            endTime,
            isGroup,
        });
        res.status(201).json({
            message: "Booking created successfully",
            booking,
        });
    }
    catch (err) {
        res.status(400).json({ message: err.message });
    }
};
/**
 * Get all bookings for current user
 */
export const getMyBookings = async (req, res) => {
    const userId = req.user._id;
    const bookings = await Booking.find({ user: userId })
        .populate("trip vessel")
        .sort({ createdAt: -1 });
    res.json(bookings);
};
/**
 * Cancel a pending booking (restore seats)
 */
export const cancelBooking = async (req, res) => {
    const userId = req.user._id;
    const booking = await Booking.findOne({ _id: req.params.id, user: userId });
    if (!booking)
        return res.status(404).json({ message: "Booking not found" });
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
            const vessel = trip.vessel;
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
    await booking.save();
    res.json({ message: "Booking cancelled successfully", booking });
};
/**
 * Initialize payment for a booking
 * Creates a Stripe Checkout session
 */
export const initiatePayment = async (req, res) => {
    const userId = req.user._id;
    const { bookingId, successUrl, cancelUrl } = req.body;
    try {
        // Verify booking belongs to user
        const booking = await Booking.findOne({ _id: bookingId, user: userId });
        if (!booking) {
            return res.status(404).json({ message: "Booking not found" });
        }
        if (booking.status !== "pending") {
            return res.status(400).json({
                message: `Cannot initiate payment. Booking status is ${booking.status}`
            });
        }
        // Create Stripe checkout session
        const checkoutSession = await createCheckoutSession(bookingId, successUrl || `${process.env.FRONTEND_URL}/booking/success?bookingId=${bookingId}`, cancelUrl || `${process.env.FRONTEND_URL}/booking/cancel?bookingId=${bookingId}`);
        res.json({
            message: "Checkout session created",
            sessionId: checkoutSession.sessionId,
            url: checkoutSession.url,
        });
    }
    catch (err) {
        res.status(400).json({ message: err.message });
    }
};
/**
 * Verify payment status for a booking
 */
export const checkPaymentStatus = async (req, res) => {
    const userId = req.user._id;
    const bookingId = req.params.bookingId;
    if (!bookingId) {
        return res.status(400).json({ message: "Booking ID is required" });
    }
    try {
        // Verify booking belongs to user
        const booking = await Booking.findOne({ _id: bookingId, user: userId });
        if (!booking) {
            return res.status(404).json({ message: "Booking not found" });
        }
        const paymentStatus = await verifyPaymentStatus(bookingId);
        res.json({
            bookingId,
            ...paymentStatus,
        });
    }
    catch (err) {
        res.status(400).json({ message: err.message });
    }
};
// ===== MOBILE SAUNA BOOKING FUNCTIONS =====
/**
 * Enhanced createBooking to handle mobile sauna pricing and customer details
 */
export const createMobileSaunaBooking = async (req, res) => {
    const userId = req.user._id;
    const { tripId, days, customerName, customerPhone, deliveryAddress, rulesAgreed, waiverSigned } = req.body;
    try {
        // Validation for mobile sauna bookings
        if (!tripId || !days || !customerName || !customerPhone || !deliveryAddress) {
            return res.status(400).json({
                message: "Missing required fields: tripId, days, customerName, customerPhone, deliveryAddress"
            });
        }
        if (!rulesAgreed || !waiverSigned) {
            return res.status(400).json({
                message: "Customer must agree to rules and sign waiver before booking"
            });
        }
        // Get trip and populate vessel
        const trip = await Trip.findById(tripId).populate('vessel');
        if (!trip) {
            return res.status(404).json({ message: "Trip not found" });
        }
        const vessel = trip.vessel;
        if (!vessel || vessel.type !== "mobile_sauna") {
            return res.status(404).json({ message: "This trip is not for a mobile sauna" });
        }
        // Validate minimum days based on sauna type
        if (days < (vessel.minimumDays || 1)) {
            return res.status(400).json({
                message: `Minimum ${vessel.minimumDays} days required for ${vessel.name}`
            });
        }
        // Calculate pricing using tiered system
        let totalPrice = 0;
        if (vessel.pricingTiers) {
            // Use tiered pricing system
            if (days <= 3) {
                totalPrice = vessel.pricingTiers.days1to3 || 0;
            }
            else if (days === 4) {
                totalPrice = vessel.pricingTiers.day4 || 0;
            }
            else if (days === 5) {
                totalPrice = vessel.pricingTiers.day5 || 0;
            }
            else if (days === 6) {
                totalPrice = vessel.pricingTiers.day6 || 0;
            }
            else if (days === 7) {
                totalPrice = vessel.pricingTiers.day7 || 0;
            }
            else if (days > 7) {
                // For 8+ days, use 7-day price as base and add extra days
                const basePrice = vessel.pricingTiers.day7 || 0;
                const extraDays = days - 7;
                const dailyRateFor8Plus = Math.round(basePrice / 7); // Average daily rate for 7+ days
                totalPrice = basePrice + (extraDays * dailyRateFor8Plus);
            }
        }
        else {
            // Fallback to old per-day pricing if tiers not set
            totalPrice = vessel.basePriceCents * days;
        }
        // Apply discount if applicable (Large Luxury Sauna: 20% off for 7+ days)
        const isDiscountApplicable = vessel.discountThreshold && vessel.discountPercent && days >= vessel.discountThreshold;
        if (isDiscountApplicable) {
            const discount = totalPrice * (vessel.discountPercent / 100);
            totalPrice = totalPrice - discount;
        }
        // For mobile saunas, rental period starts when payment is approved (not trip departure)
        // Initially set startTime and endTime to null - they will be set when payment is confirmed
        const bookingTime = new Date(); // When user made the booking request
        // Update user profile with delivery information
        await User.findByIdAndUpdate(userId, {
            phone: customerPhone,
            address: deliveryAddress
        });
        // Create mobile sauna booking
        const booking = await Booking.create({
            user: new mongoose.Types.ObjectId(userId),
            trip: trip._id,
            vessel: vessel._id,
            startTime: null, // Will be set when payment is approved
            endTime: null, // Will be set when payment is approved (startTime + days)
            totalPriceCents: Math.round(totalPrice),
            status: "pending",
            daysBooked: days,
            customerName,
            customerPhone,
            deliveryAddress,
            rulesAgreed,
            waiverSigned,
            holdExpiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes hold
        });
        res.status(201).json({
            message: "Mobile sauna booking created successfully. Rental period will begin when payment is approved.",
            booking: {
                id: booking._id,
                trip: trip.title || `${vessel.name} Rental`,
                vessel: vessel.name,
                bookingTime: bookingTime,
                rentalStartsOnPayment: true,
                days,
                totalPriceCents: Math.round(totalPrice),
                pricePerDay: Math.round(totalPrice / days),
                deliveryAddress,
                status: booking.status,
                discountApplied: isDiscountApplicable,
                pricingBreakdown: {
                    baseTierPrice: isDiscountApplicable ? Math.round(totalPrice / (1 - vessel.discountPercent / 100)) : Math.round(totalPrice),
                    discountAmount: isDiscountApplicable ? Math.round((totalPrice / (1 - vessel.discountPercent / 100)) - totalPrice) : 0,
                    finalPrice: Math.round(totalPrice)
                },
                note: `Rental period: ${days} days starting when payment is confirmed`
            }
        });
    }
    catch (err) {
        res.status(400).json({ message: err.message });
    }
};
//# sourceMappingURL=bookingController.js.map