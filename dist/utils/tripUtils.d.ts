/**
 * Get the current capacity for a trip by fetching it from the associated vessel
 * This ensures capacity is always up-to-date with vessel changes
 */
export declare const getTripCapacity: (tripId: string) => Promise<number>;
/**
 * Update remaining seats for a trip based on current vessel capacity
 * Useful when vessel capacity changes and you need to adjust existing trips
 */
export declare const updateTripSeatsBasedOnVessel: (tripId: string) => Promise<{
    oldCapacity: number;
    newCapacity: any;
    oldRemainingSeats: number;
    newRemainingSeats: number;
    bookedSeats: number;
}>;
/**
 * Get trip with capacity information
 * This ensures the capacity is always fetched from vessel
 */
export declare const getTripWithCapacity: (tripId: string) => Promise<any>;
