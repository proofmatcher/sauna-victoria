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
            <p><strong>Capacity:</strong> ${vessel.capacity || 8} passengers</p>
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
        
        <p>Dear ${booking.customerName || user.name},</p>
        
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
          This confirmation was sent to ${booking.customerEmail || user.email}<br>
          Sauna Boat Booking System
        </p>
      </div>
    `;

    // Send email to customerEmail (the email provided in booking form) or fallback to user account email
    const recipientEmail = booking.customerEmail || user.email;
    const recipientName = booking.customerName || user.name;

    await sendEmail(recipientEmail, emailSubject, emailBody);
    console.log(`✅ Confirmation email sent to customer: ${recipientName} (${recipientEmail})`);

    return { success: true };
  } catch (error) {
    console.error("Error notifying customer:", error);
    throw error;
  }
};

/**
 * Send mobile sauna booking confirmation email with delivery and rental details
 */
export const notifyCustomerMobileSaunaBookingConfirmed = async (bookingId: string) => {
  try {
    const booking = await Booking.findById(bookingId)
      .populate("user")
      .populate("vessel");

    if (!booking) {
      throw new Error("Booking not found");
    }

    const user = booking.user as any;
    const vessel = booking.vessel as any;

    if (!user || !vessel) {
      throw new Error("Booking data incomplete");
    }

    const pickupDate = new Date(booking.startTime!).toLocaleDateString('en-US', { 
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
    });
    const returnDate = new Date(booking.endTime!).toLocaleDateString('en-US', { 
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
    });
    
    const deliveryFeeCents = booking.deliveryFeeCents || 0;
    const woodBinsCostCents = booking.woodBinsCostCents || 0;
    const deliveryDistanceKm = booking.deliveryDistanceKm || 0;
    const damageDepositCents = booking.damageDepositCents || 25000;
    
    // Use stored rental price if available, otherwise calculate from total
    const rentalPriceCents = booking.rentalPriceCents || 
      (booking.totalPriceCents - deliveryFeeCents - woodBinsCostCents - damageDepositCents);
    
    const rentalPrice = (rentalPriceCents / 100).toFixed(2);
    const deliveryFee = (deliveryFeeCents / 100).toFixed(2);
    const woodBinsCost = (woodBinsCostCents / 100).toFixed(2);
    const damageDeposit = (damageDepositCents / 100).toFixed(2);
    const totalPrice = (booking.totalPriceCents / 100).toFixed(2);
    
    const totalWoodBins = 2 + (booking.additionalWoodBins || 0);
    const isDeliveryFree = deliveryFeeCents === 0;

    // Mock rental agreement - will be replaced with actual legal document
    const rentalAgreementText = `
      <h3 style="color: #2c3e50; margin-top: 30px;">Mobile Sauna Rental Agreement</h3>
      <div style="background-color: #f9f9f9; padding: 20px; border-left: 4px solid #3498db; font-size: 14px; line-height: 1.6;">
        <p><strong>This Agreement is made on:</strong> ${new Date().toLocaleDateString()}</p>
        <p><strong>Between:</strong> HAVN SUNAS ("Renter") and ${user.name} ("Customer")</p>
        
        <h4>Rental Details:</h4>
        <ul style="margin: 10px 0;">
          <li><strong>Sauna Model:</strong> ${vessel.name} (${vessel.capacity}-person capacity)</li>
          <li><strong>Rental Period:</strong> ${booking.daysBooked} day(s)</li>
          <li><strong>Pickup Date:</strong> ${pickupDate}</li>
          <li><strong>Return Date:</strong> ${returnDate}</li>
          <li><strong>Delivery Address:</strong> ${booking.deliveryAddress}</li>
          <li><strong>Total Amount Paid:</strong> $${totalPrice}</li>
        </ul>

        <h4>Terms & Conditions:</h4>
        <ol style="margin: 10px 0;">
          <li><strong>Delivery & Setup:</strong> The sauna will be delivered and set up at the specified address on the pickup date. Customer must provide a level surface with adequate clearance (minimum 10ft x 10ft).</li>
          <li><strong>Safe Operation:</strong> Customer agrees to operate the sauna safely and in accordance with provided instructions. Adult supervision is required during use.</li>
          <li><strong>Fire Safety:</strong> Customer must maintain a safe distance from structures (minimum 15ft) and have fire safety equipment readily available.</li>
          <li><strong>Wood Supply:</strong> ${totalWoodBins} bin(s) of firewood are included. Additional wood can be purchased separately.</li>
          <li><strong>Damage Liability:</strong> Customer is responsible for any damage to the sauna during the rental period, excluding normal wear and tear.</li>
          <li><strong>Weather Conditions:</strong> Sauna can be used in most weather conditions. Customer must secure sauna in high winds.</li>
          <li><strong>Pickup:</strong> Sauna must be cooled down and ready for pickup on the return date. Renter will collect the sauna between 9:00 AM - 5:00 PM.</li>
          <li><strong>Cancellation:</strong> Cancellations must be made at least 48 hours in advance for a full refund. Late cancellations subject to fees.</li>
          <li><strong>Extensions:</strong> To extend your rental period, contact us at least 24 hours before the return date (subject to availability).</li>
          <li><strong>Liability:</strong> Customer assumes all risk and liability for injuries or accidents occurring during sauna use.</li>
        </ol>

        <p style="margin-top: 20px;"><strong>By completing this booking, you agree to all terms and conditions stated above.</strong></p>
        <p><em>Note: This is a summary. Full legal agreement provided at delivery.</em></p>
      </div>
    `;

    const emailSubject = `Mobile Sauna Rental Confirmed - ${vessel.name}`;
    const emailBody = `
      <div style="font-family: Arial, sans-serif; padding: 30px; max-width: 600px; margin: 0 auto; color: #333;">
        <h2 style="color: #2c3e50; margin-bottom: 20px;">Hello ${booking.customerName || user.name},</h2>
        
        <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
          Thank you so much for booking with us! We're sure you'll have a relaxing, rejuvenating time. 
          To make sure you get the most out of your experience, we have provided you with a copy of the 
          rental agreement and sauna rules. Please make sure you take the time to familiarise yourself 
          with the rules and terms at your leisure.
        </p>

        <p style="font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
          If you have any questions, please feel free to contact us by email at 
          <a href="mailto:info@example.com" style="color: #3498db;">info@example.com</a>
        </p>

        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 25px 0;">
          <h3 style="margin-top: 0; color: #2c3e50;">Your Booking Details</h3>
          
          <p style="margin: 10px 0;"><strong>The date of your booking:</strong></p>
          <p style="margin: 5px 0; padding-left: 20px;"><strong>From:</strong> ${pickupDate}</p>
          <p style="margin: 5px 0; padding-left: 20px;"><strong>To:</strong> ${returnDate}</p>
          
          <p style="margin: 15px 0 5px 0;"><strong>The address for delivery provided is:</strong></p>
          <p style="margin: 5px 0; padding-left: 20px;">${booking.deliveryAddress}</p>
          
          <p style="margin: 15px 0 5px 0;"><strong>Payment Breakdown:</strong></p>
          <p style="margin: 5px 0; padding-left: 20px;">Rental Fee: $${rentalPrice}</p>
          ${deliveryFeeCents > 0 ? `<p style="margin: 5px 0; padding-left: 20px;">Delivery Fee: $${deliveryFee}</p>` : ''}
          ${woodBinsCostCents > 0 ? `<p style="margin: 5px 0; padding-left: 20px;">Additional Wood Bins: $${woodBinsCost}</p>` : ''}
          <p style="margin: 5px 0; padding-left: 20px; color: #27ae60;"><strong>Refundable Damage Deposit: $${damageDeposit}</strong></p>
          <p style="margin: 10px 0 5px 20px; border-top: 1px solid #ddd; padding-top: 10px;"><strong>Total Charged: $${totalPrice}</strong></p>
          
          <p style="margin: 15px 0 5px 0; padding: 10px; background-color: #e8f5e9; border-left: 4px solid #27ae60; font-size: 14px;">
            💰 <strong>About Your Damage Deposit:</strong><br>
            Your damage deposit of $${damageDeposit} will be automatically refunded 2 days after your rental ends, 
            unless there are damages to the equipment. The refund will appear in your account within 5-10 business days.
          </p>
        </div>

        <p style="font-size: 16px; line-height: 1.6; margin-top: 30px; font-style: italic;">
          Have a beautiful life!
        </p>
        
        <p style="font-size: 16px; line-height: 1.6; margin-top: 10px;">
          Matt
        </p>

        <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
        <p style="font-size: 12px; color: #999; margin-top: 20px;">
          This confirmation was sent to ${booking.customerEmail || user.email}<br>
          Please find the rental agreement attached to this email.
        </p>
      </div>

          <div style="background-color: #e0f2f1; padding: 25px; border-radius: 8px; margin: 25px 0; text-align: center;">
            <h2 style="margin-top: 0; color: #00695c; font-size: 20px;">📞 Need Help?</h2>
            <p style="color: #333; font-size: 16px; margin: 15px 0;">
              Questions about your rental? We're here to help!
            </p>
            <p style="color: #333; font-size: 16px; margin: 10px 0;">
              <strong>Phone:</strong> 250-885-4955<br>
              <strong>Email:</strong> Reply to this email
            </p>
            <p style="color: #666; font-size: 14px; margin-top: 20px;">
              We'll send you a reminder 24 hours before your return date!
            </p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <p style="font-size: 18px; color: #333; margin: 20px 0;">
              <strong>Enjoy your authentic Finnish sauna experience! 🔥🧖</strong>
            </p>
            <p style="color: #999; font-size: 14px;">
              Stay warm, relax, and rejuvenate!
            </p>
          </div>
        </div>

        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 0 0 10px 10px; text-align: center;">
          <p style="font-size: 12px; color: #999; margin: 5px 0;">
            This confirmation was sent to ${user.email}
          </p>
          <p style="font-size: 12px; color: #999; margin: 5px 0;">
            HAVN SUNAS - Mobile Sauna Rentals
          </p>
        </div>
      </div>
    `;

    // Send email to customerEmail (the email provided in booking request)
    const recipientEmail = booking.customerEmail || user.email;
    const recipientName = booking.customerName || user.name;
    
    // Generate agreement PDF to attach to email
    let pdfAttachment = undefined;
    try {
      // Import agreement service dynamically
      const { default: agreementService } = await import('./agreementService.js');
      
      // Format capacity for agreement
      let capacityStr = '4 person';
      if (vessel.capacity) {
        if (typeof vessel.capacity === 'number') {
          capacityStr = `${vessel.capacity} person`;
        } else if (typeof vessel.capacity === 'string') {
          capacityStr = vessel.capacity.toLowerCase().includes('person') 
            ? vessel.capacity 
            : `${vessel.capacity} person`;
        }
      }
      
      const pdfBuffer = await agreementService.generatePDF({
        customerName: booking.customerName || user.name,
        deliveryAddress: booking.deliveryAddress || '',
        customerEmail: booking.customerEmail || user.email,
        customerPhone: booking.customerPhone || '',
        agreementDate: new Date().toISOString().split('T')[0],
        capacity: capacityStr,
        dropoffDate: booking.startTime ? new Date(booking.startTime).toISOString().split('T')[0] : '',
        pickupDate: booking.endTime ? new Date(booking.endTime).toISOString().split('T')[0] : '',
        rentalFee: booking.totalPriceCents ? `$${(booking.totalPriceCents / 100).toFixed(2)}` : '',
      });
      
      pdfAttachment = [{
        filename: `Rental-Agreement-${booking._id}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf'
      }];
      
      console.log(`✅ Agreement PDF generated for attachment`);
    } catch (pdfError) {
      console.error('Failed to generate PDF attachment:', pdfError);
      // Continue sending email without attachment
    }
    
    await sendEmail(recipientEmail, emailSubject, emailBody, pdfAttachment);
    console.log(`✅ Mobile sauna confirmation email sent to: ${recipientName} (${recipientEmail})`);

    return { success: true };
  } catch (error) {
    console.error("Error sending mobile sauna notification:", error);
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
