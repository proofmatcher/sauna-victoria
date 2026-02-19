/**
 * Utility functions for mobile sauna rental date validation
 * Implements Friday-to-Friday weekly structure with strict booking rules
 * 
 * CONFIGURATION: Set enforceWeeklyBoundary to false to allow any-day-to-any-day bookings
 */

interface DateValidationResult {
  isValid: boolean;
  message?: string;
  days?: number;
  requiresWeeklyPrice?: boolean;
  pickupDay?: string;
  dropoffDay?: string;
  suggestion?: string;
}

/**
 * Get day of week name from date
 */
function getDayName(date: Date): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[date.getDay()];
}

/**
 * Check if a date matches the designated pickup/dropoff day
 */
function isDesignatedDay(date: Date, dayOfWeek: number): boolean {
  return date.getDay() === dayOfWeek;
}

/**
 * Check if date crosses a boundary from day before designated day to days after
 * If booking spans through the transition, it must be upgraded to weekly price
 */
function crossesDayBoundary(startDate: Date, endDate: Date, designatedDay: number): boolean {
  const current = new Date(startDate);
  const dayBefore = (designatedDay - 1 + 7) % 7; // Day before designated day
  
  while (current <= endDate) {
    // Check if we're on the day before designated day
    if (current.getDay() === dayBefore) {
      const nextDay = new Date(current);
      nextDay.setDate(nextDay.getDate() + 1);
      
      // If next day (designated day) is within or before end date, we cross the boundary
      if (nextDay <= endDate) {
        return true;
      }
    }
    current.setDate(current.getDate() + 1);
  }
  
  return false;
}

/**
 * Get the designated day of the current week
 */
function getDesignatedDayOfWeek(date: Date, designatedDay: number): Date {
  const result = new Date(date);
  const dayOfWeek = date.getDay();
  const daysUntilDesignated = (designatedDay - dayOfWeek + 7) % 7;
  result.setDate(date.getDate() + daysUntilDesignated);
  return result;
}

/**
 * Get the previous designated day from a given date
 */
function getPreviousDesignatedDay(date: Date, designatedDay: number): Date {
  const result = new Date(date);
  const dayOfWeek = date.getDay();
  
  if (dayOfWeek === designatedDay) {
    // If it's the designated day, go back 7 days
    result.setDate(date.getDate() - 7);
  } else if (dayOfWeek > designatedDay) {
    // After designated day in week, go back to designated day
    result.setDate(date.getDate() - (dayOfWeek - designatedDay));
  } else {
    // Before designated day, go back to last week's designated day
    result.setDate(date.getDate() - (dayOfWeek + 7 - designatedDay));
  }
  
  return result;
}

/**
 * Check if booking stays within the same weekly cycle
 */
function isWithinSameWeeklyCycle(startDate: Date, endDate: Date, designatedDay: number): boolean {
  // Get the designated day that defines the current week's boundary
  const weekBoundaryDay = getDesignatedDayOfWeek(startDate, designatedDay);
  
  // Check if end date is before or on the week boundary
  return endDate <= weekBoundaryDay;
}

/**
 * Calculate number of days between two dates (inclusive)
 */
function calculateDays(startDate: Date, endDate: Date): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Reset time to midnight for accurate day calculation
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  
  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  // Add 1 to make it inclusive (e.g., Friday to Friday = 1 day, not 0)
  return diffDays + 1;
}

/**
 * Main validation function for weekly booking structure with configurable pickup/dropoff day
 * 
 * Rules (when enforceWeeklyBoundary = true):
 * - Pick-up and drop-off on designated day (default Friday, configurable per vessel)
 * - Bookings cannot disrupt the weekly cycle
 * - Bookings that cross day-before to designated-day boundary must use weekly price
 * - Designated-day to designated-day or within same week is allowed
 * 
 * When enforceWeeklyBoundary = false:
 * - Any start date to any end date is allowed
 * - Simple day-count pricing (no weekly boundary restrictions)
 * 
 * @param startDate - Pick-up date
 * @param endDate - Drop-off date
 * @param designatedDay - Day of week for pickup/dropoff (0=Sunday, 1=Monday, ... 5=Friday, 6=Saturday). Default: 5 (Friday)
 * @param enforceWeeklyBoundary - Whether to enforce Friday-to-Friday weekly structure. Default: false (disabled)
 * @returns Validation result with details
 */
export function validateRentalDates(
  startDate: Date | string, 
  endDate: Date | string, 
  designatedDay: number = 5,
  enforceWeeklyBoundary: boolean = false  // DISABLED BY DEFAULT - allows any-day-to-any-day
): DateValidationResult {
  // Parse dates if strings
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;
  
  // Reset time to midnight for consistent comparison
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  
  const pickupDay = getDayName(start);
  const dropoffDay = getDayName(end);
  
  // Basic validation: end date must be same or after start date
  if (end < start) {
    return {
      isValid: false,
      message: "Drop-off date cannot be before pick-up date",
      pickupDay,
      dropoffDay
    };
  }
  
  // Calculate days
  const days = calculateDays(start, end);
  
  // ============================================================
  // FLEXIBLE MODE: When weekly boundary enforcement is disabled
  // ============================================================
  if (!enforceWeeklyBoundary) {
    // Simple validation - any date range is valid
    return {
      isValid: true,
      message: `Valid rental (${pickupDay} to ${dropoffDay}, ${days} day${days > 1 ? 's' : ''})`,
      days,
      requiresWeeklyPrice: days >= 7,  // Weekly price for 7+ days
      pickupDay,
      dropoffDay
    };
  }
  
  // ============================================================
  // STRICT MODE: Friday-to-Friday weekly boundary enforcement
  // (Original behavior - kept for future use if needed)
  // ============================================================
  
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const designatedDayName = dayNames[designatedDay];
  
  // Check if booking crosses boundary
  const crossesBoundary = crossesDayBoundary(start, end, designatedDay);
  
  // Rule 1: Ideal case - Designated day to designated day (full week)
  if (isDesignatedDay(start, designatedDay) && isDesignatedDay(end, designatedDay)) {
    return {
      isValid: true,
      message: `Valid ${designatedDayName}-to-${designatedDayName} weekly rental`,
      days,
      requiresWeeklyPrice: days >= 7,
      pickupDay,
      dropoffDay
    };
  }
  
  // Rule 2: Designated day start - strict Friday-to-Friday enforcement
  if (isDesignatedDay(start, designatedDay)) {
    const nextDesignatedDay = new Date(start);
    nextDesignatedDay.setDate(start.getDate() + 7);
    
    // Case 1: Ends before next designated day (within same week)
    if (end < nextDesignatedDay) {
      return {
        isValid: true,
        message: `Valid rental starting ${designatedDayName} (${days} days)`,
        days,
        requiresWeeklyPrice: false,
        pickupDay,
        dropoffDay
      };
    }
    
    // Case 2: Ends exactly on a designated day (Friday-to-Friday pattern)
    if (isDesignatedDay(end, designatedDay)) {
      const weeks = days / 7;
      const isExactWeeks = weeks === Math.floor(weeks);
      
      return {
        isValid: true,
        message: isExactWeeks
          ? `Valid ${Math.floor(weeks)}-week rental (${designatedDayName} to ${designatedDayName})`
          : `Valid ${designatedDayName}-to-${designatedDayName} rental (${days} days)`,
        days,
        requiresWeeklyPrice: true,
        pickupDay,
        dropoffDay
      };
    }
    
    // Case 3: Crosses designated day boundary but doesn't end on designated day
    // This violates the Friday-to-Friday weekly structure
    return {
      isValid: false,
      message: `For multi-week rentals, drop-off must be on ${designatedDayName}. Your booking crosses ${designatedDayName} but ends on ${dropoffDay}. Please adjust to end on ${designatedDayName}.`,
      pickupDay,
      dropoffDay,
      suggestion: `Try ending on the nearest ${designatedDayName} to maintain the weekly cycle.`
    };
  }
  
  // Rule 3: Non-designated day start - check if within same weekly cycle
  if (!isDesignatedDay(start, designatedDay)) {
    const weekBoundaryDay = getDesignatedDayOfWeek(start, designatedDay);
    
    // Check if end date stays within the same week (doesn't go past designated day)
    if (end <= weekBoundaryDay) {
      // Allowed: stays within same week, doesn't break boundary
      return {
        isValid: true,
        message: `Valid rental within weekly cycle (${pickupDay} to ${dropoffDay})`,
        days,
        requiresWeeklyPrice: false,
        pickupDay,
        dropoffDay
      };
    }
    
    // Check if booking crosses boundary
    if (crossesBoundary) {
      const dayBefore = dayNames[(designatedDay - 1 + 7) % 7];
      return {
        isValid: false,
        message: `Booking crosses ${dayBefore}-${designatedDayName} weekly boundary. Please book from ${designatedDayName} or within same week (before ${designatedDayName}).`,
        pickupDay,
        dropoffDay
      };
    }
    
    // Booking goes past the week boundary
    return {
      isValid: false,
      message: `Booking extends past ${designatedDayName} boundary. Please adjust dates to stay within weekly cycle or book from ${designatedDayName}.`,
      pickupDay,
      dropoffDay
    };
  }
  
  // Fallback - should not reach here
  return {
    isValid: false,
    message: "Invalid date combination",
    pickupDay,
    dropoffDay
  };
}

/**
 * Get recommended valid date ranges for user
 */
export function getRecommendedDates(requestedStart: Date | string, designatedDay: number = 5): { 
  weekToWeek: { start: Date; end: Date; days: number };
  sameWeek: { start: Date; end: Date; days: number };
} {
  const start = typeof requestedStart === 'string' ? new Date(requestedStart) : requestedStart;
  
  // Option 1: Nearest designated day to next designated day (full week)
  const nearestDesignatedDay = isDesignatedDay(start, designatedDay) ? start : getDesignatedDayOfWeek(start, designatedDay);
  const nextDesignatedDay = new Date(nearestDesignatedDay);
  nextDesignatedDay.setDate(nearestDesignatedDay.getDate() + 7);
  
  // Option 2: From start date to end of same week (designated day boundary)
  const weekEndDay = getDesignatedDayOfWeek(start, designatedDay);
  
  return {
    weekToWeek: {
      start: nearestDesignatedDay,
      end: nextDesignatedDay,
      days: 7
    },
    sameWeek: {
      start: start,
      end: weekEndDay,
      days: calculateDays(start, weekEndDay)
    }
  };
}

/**
 * Normalize date to midnight for consistent comparison
 */
export function normalizeDateToMidnight(date: Date | string): Date {
  const d = typeof date === 'string' ? new Date(date) : new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}
