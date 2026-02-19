/**
 * Delivery Fee and Wood Bins Calculation Utilities
 */

// Hillside Mall location (Victoria, BC, Canada)
const HILLSIDE_MALL_ADDRESS = "1644 Hillside Ave, Victoria, BC V8T 2C5, Canada";
const HILLSIDE_MALL_LAT = 48.4501;
const HILLSIDE_MALL_LNG = -123.3449;

// Pricing constants
const FREE_DELIVERY_RADIUS_KM = 20;
const ADDITIONAL_KM_PRICE_CENTS = 400; // $4 per km
const FREE_WOOD_BINS = 2;
const ADDITIONAL_WOOD_BIN_PRICE_CENTS = 1500; // $15 per bin

interface DistanceCalculationResult {
  distanceKm: number;
  durationMinutes: number;
  originAddress: string;
  destinationAddress: string;
}

/**
 * Calculate distance using Google Maps Distance Matrix API
 * @param deliveryAddress - Customer delivery address
 * @returns Distance in kilometers and duration
 */
export async function calculateDistanceFromHillsideMall(
  deliveryAddress: string
): Promise<DistanceCalculationResult> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    throw new Error("Google Maps API key not configured. Please set GOOGLE_MAPS_API_KEY in environment variables.");
  }

  try {
    // URL encode addresses
    const origin = encodeURIComponent(HILLSIDE_MALL_ADDRESS);
    const destination = encodeURIComponent(deliveryAddress);

    // Call Google Maps Distance Matrix API
    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin}&destinations=${destination}&units=metric&key=${apiKey}`;

    const response = await fetch(url);
    const data = await response.json();

    // Check for API errors
    if (data.status !== 'OK') {
      throw new Error(`Google Maps API error: ${data.status} - ${data.error_message || 'Unknown error'}`);
    }

    // Check if route was found
    const element = data.rows[0]?.elements[0];
    if (!element || element.status !== 'OK') {
      throw new Error(`Could not calculate route to address: ${element?.status || 'No route found'}. Please verify the address is correct and accessible.`);
    }

    // Extract distance and duration
    const distanceMeters = element.distance.value;
    const durationSeconds = element.duration.value;
    const distanceKm = Math.round((distanceMeters / 1000) * 10) / 10; // Round to 1 decimal
    const durationMinutes = Math.round(durationSeconds / 60);

    return {
      distanceKm,
      durationMinutes,
      originAddress: data.origin_addresses[0],
      destinationAddress: data.destination_addresses[0]
    };

  } catch (error: any) {
    console.error('Google Maps API Error:', error);
    throw new Error(`Failed to calculate delivery distance: ${error.message}`);
  }
}

/**
 * Calculate delivery fee based on distance
 * Free delivery for ≤20km, $4/km for additional distance
 * @param distanceKm - Distance in kilometers
 * @returns Delivery fee in cents
 */
export function calculateDeliveryFee(distanceKm: number): number {
  if (distanceKm <= FREE_DELIVERY_RADIUS_KM) {
    return 0; // Free delivery
  }

  const additionalKm = distanceKm - FREE_DELIVERY_RADIUS_KM;
  const feeCents = Math.ceil(additionalKm) * ADDITIONAL_KM_PRICE_CENTS;
  
  return feeCents;
}

/**
 * Calculate wood bins cost
 * 2 bins included free, $15 per additional bin
 * @param additionalBins - Number of bins beyond the 2 free ones (0-10)
 * @returns Cost in cents
 */
export function calculateWoodBinsCost(additionalBins: number): number {
  if (additionalBins < 0) {
    return 0;
  }

  if (additionalBins > 10) {
    throw new Error("Maximum 10 additional wood bins allowed");
  }

  return additionalBins * ADDITIONAL_WOOD_BIN_PRICE_CENTS;
}

/**
 * Get delivery fee breakdown for display
 */
export function getDeliveryFeeBreakdown(distanceKm: number): {
  distanceKm: number;
  freeRadiusKm: number;
  additionalKm: number;
  pricePerKm: number;
  deliveryFeeCents: number;
  isFree: boolean;
} {
  const isFree = distanceKm <= FREE_DELIVERY_RADIUS_KM;
  const additionalKm = isFree ? 0 : Math.ceil(distanceKm - FREE_DELIVERY_RADIUS_KM);
  const deliveryFeeCents = calculateDeliveryFee(distanceKm);

  return {
    distanceKm: Math.round(distanceKm * 10) / 10,
    freeRadiusKm: FREE_DELIVERY_RADIUS_KM,
    additionalKm,
    pricePerKm: ADDITIONAL_KM_PRICE_CENTS / 100, // In dollars
    deliveryFeeCents,
    isFree
  };
}

/**
 * Get wood bins breakdown for display
 */
export function getWoodBinsBreakdown(additionalBins: number): {
  freeBins: number;
  additionalBins: number;
  totalBins: number;
  pricePerBin: number;
  woodBinsCostCents: number;
} {
  return {
    freeBins: FREE_WOOD_BINS,
    additionalBins,
    totalBins: FREE_WOOD_BINS + additionalBins,
    pricePerBin: ADDITIONAL_WOOD_BIN_PRICE_CENTS / 100, // In dollars
    woodBinsCostCents: calculateWoodBinsCost(additionalBins)
  };
}
