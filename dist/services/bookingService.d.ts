import mongoose from "mongoose";
interface CreateBookingInput {
    userId: string;
    tripId?: string;
    vesselId: string;
    seatsBooked?: number;
    startTime?: Date;
    endTime?: Date;
    isGroup?: boolean;
}
/**
 * Reserve seats or create trailer rental booking
 * This function ensures atomic update of remaining seats for trips.
 */
export declare const createBooking: ({ userId, tripId, vesselId, seatsBooked, startTime, endTime, isGroup, }: CreateBookingInput) => Promise<mongoose.Document<unknown, {}, import("../models/Booking.js").IBooking, {}, {}> & import("../models/Booking.js").IBooking & Required<{
    _id: unknown;
}> & {
    __v: number;
}>;
export {};
