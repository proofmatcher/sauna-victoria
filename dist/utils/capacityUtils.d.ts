export interface CapacityChangeResult {
    success: boolean;
    message: string;
    affectedTrips?: number;
    details?: {
        oldCapacity: number;
        newCapacity: number;
        tripsUpdated: string[];
        errors?: string[];
    };
}
/**
 * Handles vessel capacity changes and updates all affected trips
 * @param vesselId - The vessel ID to update
 * @param newCapacity - The new capacity to set
 * @returns Result of the capacity change operation
 */
export declare const handleVesselCapacityChange: (vesselId: string, newCapacity: number) => Promise<CapacityChangeResult>;
/**
 * Get booking statistics for a trip
 * @param trip - The trip document (must have vessel populated)
 * @returns Booking statistics
 */
export declare const getTripBookingStats: (trip: any) => {
    capacity: any;
    booked: number;
    available: number;
    utilizationPercent: number;
    isFullyBooked: boolean;
    isGroupBooking: any;
};
