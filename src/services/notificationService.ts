import { sendEmail } from "../utils/sendEmail.js";
import { User } from "../models/User.js";
import Trip from "../models/Trip.js";
import Booking from "../models/Booking.js";
import Vessel from "../models/Vessel.js";

/**
 * Send trip assignment notification to staff members
 */
export const notifyStaffAboutTrip = async (tripId: string) => {
  try {
    const trip = await Trip.findById(tripId)
      .populate("vessel")
      .populate("assignedStaff");

    if (!trip) {
      throw new Error("Trip not found");
    }

    if (!trip.assignedStaff || trip.assignedStaff.length === 0) {
      console.log("No staff assigned to this trip");
      return;
    }

    const vessel = trip.vessel as any;
    const tripDate = new Date(trip.departureTime).toLocaleString();
    const duration = Math.floor(trip.durationMinutes / 60);

    // Send email to each assigned staff member
    for (const staff of trip.assignedStaff as any[]) {
      const emailSubject = `Trip Assignment: ${trip.title}`;
      const emailBody = `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>🚤 You've been assigned to a trip!</h2>
          
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3>Trip Details:</h3>
            <p><strong>Trip:</strong> ${trip.title}</p>
            <p><strong>Vessel:</strong> ${vessel.name} (${vessel.type})</p>
            <p><strong>Departure:</strong> ${tripDate}</p>
            <p><strong>Duration:</strong> ${duration} hour(s)</p>
            <p><strong>Capacity:</strong> ${trip.capacity} passengers</p>
          </div>

          <div style="margin: 20px 0;">
            <h3>Your Responsibilities:</h3>
            <ul>
              <li>Arrive 30 minutes before departure</li>
              <li>Prepare the vessel and sauna</li>
              <li>Ensure all safety equipment is ready</li>
              <li>Greet passengers and provide excellent service</li>
            </ul>
          </div>

          <p style="color: #666;">
            If you have any questions or need to adjust your schedule, please contact the administrator immediately.
          </p>

          <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
        </div>
      `;

      await sendEmail(staff.email, emailSubject, emailBody);
      console.log(`✅ Notification sent to staff: ${staff.name} (${staff.email})`);
    }

    // Update trip to mark staff as notified
    trip.staffNotified = true;
    await trip.save();

    return { success: true, notifiedCount: trip.assignedStaff.length };
  } catch (error) {
    console.error("Error notifying staff:", error);
    throw error;
  }
};

/**
 * Send booking confirmation email to customer with trip details
 */
export const notifyCustomerBookingConfirmed = async (bookingId: string) => {
  try {
    const booking = await Booking.findById(bookingId)
      .populate("user")
      .populate({
        path: "trip",
        populate: [
          { path: "vessel" },
          { path: "assignedStaff", select: "name" }
        ]
      });

    if (!booking) {
      throw new Error("Booking not found");
    }

    const user = booking.user as any;
    const trip = booking.trip as any;
    const vessel = trip?.vessel as any;

    if (!user || !trip) {
      throw new Error("Booking data incomplete");
    }

    const tripDate = new Date(trip.departureTime).toLocaleString();
    const duration = Math.floor(trip.durationMinutes / 60);
    const price = (booking.totalPriceCents / 100).toFixed(2);
    const staffNames = trip.assignedStaff?.map((s: any) => s.name).join(", ") || "TBA";

    const emailSubject = `Booking Confirmed: ${trip.title}`;
    const emailBody = `
      <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px;">
        <h2 style="color: #2c3e50;">🎉 Your Booking is Confirmed!</h2>
        
        <p>Dear ${user.name},</p>
        
        <p>Thank you for your payment! Your booking has been confirmed.</p>

        <div style="background-color: #e8f5e9; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #2e7d32;">Booking Details</h3>
          <p><strong>Booking ID:</strong> ${booking._id}</p>
          <p><strong>Trip:</strong> ${trip.title}</p>
          <p><strong>Vessel:</strong> ${vessel.name} (${vessel.type})</p>
          <p><strong>Date & Time:</strong> ${tripDate}</p>
          <p><strong>Duration:</strong> ${duration} hour(s)</p>
          <p><strong>Seats Booked:</strong> ${booking.seatsBooked || 1}</p>
          <p><strong>Amount Paid:</strong> $${price}</p>
        </div>

        <div style="background-color: #fff3e0; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #ef6c00;">Important Information</h3>
          <p><strong>Your Staff:</strong> ${staffNames}</p>
          <ul style="margin: 10px 0;">
            <li>Please arrive 15 minutes before departure</li>
            <li>Bring towels and swimwear</li>
            <li>Light refreshments are provided</li>
            <li>Weather-appropriate clothing recommended</li>
          </ul>
        </div>

        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">What to Expect</h3>
          <p>Experience the authentic Finnish sauna tradition while cruising pristine waters. Our professional staff will ensure you have a memorable and relaxing experience.</p>
        </div>

        <p style="margin-top: 30px;">If you need to make any changes or have questions, please contact us.</p>

        <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
        <p style="font-size: 12px; color: #999;">
          This confirmation was sent to ${user.email}<br>
          Sauna Boat Booking System
        </p>
      </div>
    `;

    await sendEmail(user.email, emailSubject, emailBody);
    console.log(`✅ Confirmation email sent to customer: ${user.name} (${user.email})`);

    return { success: true };
  } catch (error) {
    console.error("Error notifying customer:", error);
    throw error;
  }
};

/**
 * Send trip reminder to both staff and customers (24 hours before trip)
 */
export const sendTripReminders = async (tripId: string) => {
  try {
    const trip = await Trip.findById(tripId)
      .populate("vessel")
      .populate("assignedStaff");

    if (!trip) {
      throw new Error("Trip not found");
    }

    const vessel = trip.vessel as any;
    const tripDate = new Date(trip.departureTime).toLocaleString();

    // Get all confirmed bookings for this trip
    const bookings = await Booking.find({ 
      trip: tripId, 
      status: "confirmed" 
    }).populate("user");

    // Send reminders to customers
    for (const booking of bookings) {
      const user = booking.user as any;
      if (!user) continue;

      const emailSubject = `Reminder: Your Trip Tomorrow - ${trip.title}`;
      const emailBody = `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>⏰ Trip Reminder</h2>
          <p>Hi ${user.name},</p>
          <p>This is a friendly reminder about your upcoming sauna boat trip tomorrow!</p>
          
          <div style="background-color: #e3f2fd; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Trip:</strong> ${trip.title}</p>
            <p><strong>Vessel:</strong> ${vessel.name}</p>
            <p><strong>Departure:</strong> ${tripDate}</p>
            <p><strong>Seats:</strong> ${booking.seatsBooked || 1}</p>
          </div>

          <p><strong>Remember to bring:</strong></p>
          <ul>
            <li>Towel and swimwear</li>
            <li>Weather-appropriate clothing</li>
            <li>This confirmation email</li>
          </ul>

          <p>We look forward to seeing you! 🚤</p>
        </div>
      `;

      await sendEmail(user.email, emailSubject, emailBody);
    }

    // Send reminders to staff
    for (const staff of trip.assignedStaff as any[]) {
      const emailSubject = `Trip Reminder: ${trip.title} Tomorrow`;
      const emailBody = `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>⏰ Staff Reminder</h2>
          <p>Hi ${staff.name},</p>
          <p>Reminder: You're scheduled for a trip tomorrow.</p>
          
          <div style="background-color: #fff3e0; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Trip:</strong> ${trip.title}</p>
            <p><strong>Departure:</strong> ${tripDate}</p>
            <p><strong>Passengers:</strong> ${bookings.length} booking(s)</p>
          </div>

          <p>Please arrive 30 minutes early for preparation.</p>
        </div>
      `;

      await sendEmail(staff.email, emailSubject, emailBody);
    }

    console.log(`✅ Reminders sent for trip: ${trip.title}`);
    return { 
      success: true, 
      customersSent: bookings.length, 
      staffSent: trip.assignedStaff.length 
    };
  } catch (error) {
    console.error("Error sending trip reminders:", error);
    throw error;
  }
};
