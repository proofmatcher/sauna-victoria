import { Request, Response } from "express";
import Booking from "../models/Booking.js";
import Trip from "../models/Trip.js";
import Vessel from "../models/Vessel.js";
import { validateRentalDates } from "../utils/rentalDateUtils.js";
import { 
  calculateDistanceFromHillsideMall, 
  calculateDeliveryFee, 
  calculateWoodBinsCost 
} from "../utils/deliveryCalculations.js";

/**
 * Check if vessel has available inventory for the date range
 * Returns number of available units
 */
async function checkVesselAvailability(
  vesselId: string,
  startDate: Date,
  endDate: Date,
  excludeBookingId?: string
): Promise<{ available: number; booked: number; total: number }> {
  const vessel = await Vessel.findById(vesselId);
  if (!vessel) {
    throw new Error("Vessel not found");
  }

  const totalUnits = vessel.inventory || 1;

  const query: any = {
    vessel: vesselId,
    status: { $in: ['pending', 'confirmed'] },
    startTime: { $lte: endDate },
    endTime: { $gte: startDate }
  };

  // Exclude current booking if updating
  if (excludeBookingId) {
    query._id = { $ne: excludeBookingId };
  }

  const bookedUnits = await Booking.countDocuments(query);
  const availableUnits = totalUnits - bookedUnits;

  return {
    available: Math.max(0, availableUnits),
    booked: bookedUnits,
    total: totalUnits
  };
}

// 📘 Get all bookings (with optional filters)
export const getAllBookings = async (req: Request, res: Response) => {
  try {
    const { status, tripId, userId } = req.query;

    const query: any = {};
    if (status) query.status = status;
    if (tripId) query.trip = tripId;
    if (userId) query.user = userId;

    const bookings = await Booking.find(query)
      .populate({ path: "user", select: "name email", strictPopulate: false }) // Guest bookings have null user
      .populate("trip", "title type startTime")
      .populate("vessel", "name type capacity");
    
    res.json(bookings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch bookings" });
  }
};

// 📗 Manually confirm a booking (useful if payment verified outside Stripe)
export const confirmBooking = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findById(id);
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    booking.status = "confirmed";
    await booking.save();

    res.json({ message: "Booking confirmed", booking });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error confirming booking" });
  }
};

// 📕 Cancel a booking manually
export const cancelBooking = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findById(id);
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    // Restore seats if trip exists
    if (booking.trip) {
      const trip = await Trip.findById(booking.trip).populate('vessel');
      if (trip) {
        trip.remainingSeats += booking.seatsBooked || 0;
        const vesselCapacity = (trip.vessel as any)?.capacity || 8;
        if (trip.remainingSeats > vesselCapacity) trip.remainingSeats = vesselCapacity;
        trip.groupBooked = false;
        await trip.save();
      }
    }

    booking.status = "cancelled";
    await booking.save();

    res.json({ message: "Booking cancelled", booking });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error cancelling booking" });
  }
};

// 📄 Get booking details by ID
export const getBookingById = async (req: Request, res: Response) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate({ path: "user", select: "name email", strictPopulate: false }) // Guest bookings have null user
      .populate("trip", "title type startTime")
      .populate("vessel", "name type capacity pricingTiers");
    if (!booking) return res.status(404).json({ message: "Booking not found" });
    res.json(booking);
  } catch (err) {
    res.status(500).json({ message: "Error fetching booking details" });
  }
};

// 📝 Update booking details (dates, wood bins, delivery address)
export const updateBooking = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { startDate, endDate, additionalWoodBins, deliveryAddress, customerName, customerPhone, customerEmail } = req.body;

    const booking = await Booking.findById(id)
      .populate("vessel")
      .populate("trip");
    
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const vessel = booking.vessel as any;
    const trip = booking.trip as any;

    if (!vessel) {
      return res.status(400).json({ message: "Vessel not found for this booking" });
    }

    let priceRecalculated = false;
    let newTotalPrice = booking.totalPriceCents;

    // Update dates if provided
    if (startDate && endDate) {
      const newStartDate = new Date(startDate);
      const newEndDate = new Date(endDate);

      // Validate new dates
      const pickupDay = vessel.pickupDropoffDay !== undefined ? vessel.pickupDropoffDay : 5;
      const dateValidation = validateRentalDates(newStartDate, newEndDate, pickupDay);
      
      if (!dateValidation.isValid) {
        return res.status(400).json({ 
          message: "Invalid rental dates", 
          error: dateValidation.message 
        });
      }

      // Check availability for new dates (exclude current booking)
      const availability = await checkVesselAvailability(
        vessel._id.toString(),
        newStartDate,
        newEndDate,
        id // Exclude current booking from conflict check
      );

      if (availability.available === 0) {
        return res.status(409).json({ 
          message: "No units available for the selected dates",
          availability 
        });
      }

      // Calculate new pricing
      const days = Math.ceil((newEndDate.getTime() - newStartDate.getTime()) / (1000 * 60 * 60 * 24));
      let rentalPrice = 0;

      if (vessel.pricingTiers) {
        if (days <= 3) {
          rentalPrice = vessel.pricingTiers.days1to3 || 0;
        } else if (days === 4) {
          rentalPrice = vessel.pricingTiers.day4 || 0;
        } else if (days === 5) {
          rentalPrice = vessel.pricingTiers.day5 || 0;
        } else if (days === 6) {
          rentalPrice = vessel.pricingTiers.day6 || 0;
        } else if (days === 7) {
          rentalPrice = vessel.pricingTiers.day7 || 0;
        } else if (days > 7) {
          const completeWeeks = Math.floor(days / 7);
          const remainingDays = days % 7;
          rentalPrice = completeWeeks * (vessel.pricingTiers.day7 || 0);
          
          if (remainingDays > 0) {
            if (remainingDays <= 3) {
              rentalPrice += vessel.pricingTiers.days1to3 || 0;
            } else if (remainingDays === 4) {
              rentalPrice += vessel.pricingTiers.day4 || 0;
            } else if (remainingDays === 5) {
              rentalPrice += vessel.pricingTiers.day5 || 0;
            } else if (remainingDays === 6) {
              rentalPrice += vessel.pricingTiers.day6 || 0;
            }
          }
        }
      }

      booking.startTime = newStartDate;
      booking.endTime = newEndDate;
      booking.daysBooked = days;
      newTotalPrice = rentalPrice + (booking.deliveryFeeCents || 0) + (booking.woodBinsCostCents || 0);
      priceRecalculated = true;
    }

    // Update wood bins if provided
    if (additionalWoodBins !== undefined) {
      if (additionalWoodBins < 0 || additionalWoodBins > 10) {
        return res.status(400).json({ 
          message: "Additional wood bins must be between 0 and 10" 
        });
      }

      const newWoodBinsCost = calculateWoodBinsCost(additionalWoodBins);
      const oldWoodBinsCost = booking.woodBinsCostCents || 0;
      
      booking.additionalWoodBins = additionalWoodBins;
      booking.woodBinsCostCents = newWoodBinsCost;
      
      // Update total price
      newTotalPrice = newTotalPrice - oldWoodBinsCost + newWoodBinsCost;
      priceRecalculated = true;
    }

    // Update delivery address if provided
    if (deliveryAddress) {
      try {
        const distanceResult = await calculateDistanceFromHillsideMall(deliveryAddress);
        const newDeliveryFee = calculateDeliveryFee(distanceResult.distanceKm);
        const oldDeliveryFee = booking.deliveryFeeCents || 0;

        booking.deliveryAddress = deliveryAddress;
        booking.deliveryDistanceKm = distanceResult.distanceKm;
        booking.deliveryFeeCents = newDeliveryFee;

        // Update total price
        newTotalPrice = newTotalPrice - oldDeliveryFee + newDeliveryFee;
        priceRecalculated = true;

        console.log(`📍 Updated delivery address: ${deliveryAddress} (${distanceResult.distanceKm}km)`);
      } catch (error: any) {
        return res.status(400).json({
          message: "Failed to calculate delivery distance for new address",
          error: error.message
        });
      }
    }

    // Update customer info if provided
    if (customerName) booking.customerName = customerName;
    if (customerPhone) booking.customerPhone = customerPhone;
    if (customerEmail) booking.customerEmail = customerEmail;

    // Update total price if recalculated
    if (priceRecalculated) {
      booking.totalPriceCents = Math.round(newTotalPrice);
    }

    await booking.save();

    res.json({ 
      message: "Booking updated successfully", 
      booking,
      priceRecalculated,
      newTotalPrice: (newTotalPrice / 100).toFixed(2)
    });
  } catch (err) {
    console.error("Error updating booking:", err);
    res.status(500).json({ message: "Error updating booking" });
  }
};

// 📅 Extend rental period
export const extendRental = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { newEndDate } = req.body;

    if (!newEndDate) {
      return res.status(400).json({ message: "newEndDate is required" });
    }

    const booking = await Booking.findById(id)
      .populate("vessel");
    
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const vessel = booking.vessel as any;
    if (!vessel) {
      return res.status(400).json({ message: "Vessel not found for this booking" });
    }

    const currentEndDate = new Date(booking.endTime!);
    const extendedEndDate = new Date(newEndDate);

    if (extendedEndDate <= currentEndDate) {
      return res.status(400).json({ 
        message: "New end date must be after current end date",
        currentEndDate: currentEndDate.toISOString().split('T')[0],
        providedEndDate: extendedEndDate.toISOString().split('T')[0]
      });
    }

    // Validate extended date follows pickup day rules
    const pickupDay = vessel.pickupDropoffDay !== undefined ? vessel.pickupDropoffDay : 5;
    const dateValidation = validateRentalDates(new Date(booking.startTime!), extendedEndDate, pickupDay);
    
    if (!dateValidation.isValid) {
      return res.status(400).json({ 
        message: "Extended date violates rental day rules", 
        error: dateValidation.message 
      });
    }

    // Check availability for extended period
    const availability = await checkVesselAvailability(
      vessel._id.toString(),
      new Date(booking.startTime!),
      extendedEndDate,
      id // Exclude current booking
    );

    if (availability.available === 0) {
      return res.status(409).json({ 
        message: "Vessel not available for extended period",
        availability 
      });
    }

    // Calculate new pricing
    const newTotalDays = Math.ceil((extendedEndDate.getTime() - new Date(booking.startTime!).getTime()) / (1000 * 60 * 60 * 24));
    let newRentalPrice = 0;

    if (vessel.pricingTiers) {
      if (newTotalDays <= 3) {
        newRentalPrice = vessel.pricingTiers.days1to3 || 0;
      } else if (newTotalDays === 4) {
        newRentalPrice = vessel.pricingTiers.day4 || 0;
      } else if (newTotalDays === 5) {
        newRentalPrice = vessel.pricingTiers.day5 || 0;
      } else if (newTotalDays === 6) {
        newRentalPrice = vessel.pricingTiers.day6 || 0;
      } else if (newTotalDays === 7) {
        newRentalPrice = vessel.pricingTiers.day7 || 0;
      } else if (newTotalDays > 7) {
        const completeWeeks = Math.floor(newTotalDays / 7);
        const remainingDays = newTotalDays % 7;
        newRentalPrice = completeWeeks * (vessel.pricingTiers.day7 || 0);
        
        if (remainingDays > 0) {
          if (remainingDays <= 3) {
            newRentalPrice += vessel.pricingTiers.days1to3 || 0;
          } else if (remainingDays === 4) {
            newRentalPrice += vessel.pricingTiers.day4 || 0;
          } else if (remainingDays === 5) {
            newRentalPrice += vessel.pricingTiers.day5 || 0;
          } else if (remainingDays === 6) {
            newRentalPrice += vessel.pricingTiers.day6 || 0;
          }
        }
      }
    }

    const oldTotalPrice = booking.totalPriceCents;
    const newTotalPrice = newRentalPrice + (booking.deliveryFeeCents || 0) + (booking.woodBinsCostCents || 0);
    const additionalCharge = newTotalPrice - oldTotalPrice;

    booking.endTime = extendedEndDate;
    booking.daysBooked = newTotalDays;
    booking.totalPriceCents = Math.round(newTotalPrice);

    await booking.save();

    res.json({ 
      message: "Rental period extended successfully", 
      booking,
      extension: {
        previousDays: booking.daysBooked - (newTotalDays - booking.daysBooked),
        newTotalDays,
        additionalDays: newTotalDays - (booking.daysBooked - (newTotalDays - booking.daysBooked)),
        previousTotal: (oldTotalPrice / 100).toFixed(2),
        newTotal: (newTotalPrice / 100).toFixed(2),
        additionalCharge: (additionalCharge / 100).toFixed(2)
      }
    });
  } catch (err) {
    console.error("Error extending rental:", err);
    res.status(500).json({ message: "Error extending rental" });
  }
};
