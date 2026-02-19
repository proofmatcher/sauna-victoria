import { Request, Response } from "express";
import Booking from "../models/Booking.js";
import { stripe } from "../config/stripe.js";
import { sendEmail } from "../utils/sendEmail.js";

/**
 * Forfeit damage deposit (keep the deposit, don't refund)
 * POST /api/admin/bookings/:id/forfeit-deposit
 */
export const forfeitDeposit = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason || reason.trim() === '') {
      return res.status(400).json({ error: 'Reason for forfeiting deposit is required' });
    }

    const booking = await Booking.findById(id).populate('vessel user');

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (booking.damageDepositStatus !== 'held') {
      return res.status(400).json({ 
        error: `Deposit already ${booking.damageDepositStatus}. Cannot forfeit.` 
      });
    }

    // Update booking status
    booking.damageDepositStatus = 'forfeited';
    booking.damageDepositNotes = reason;
    booking.damageDepositRefundDate = new Date();
    await booking.save();

    // Send notification to customer
    await sendDepositForfeitEmail(booking, reason);

    console.log(`⚠️ Deposit forfeited for booking ${booking._id}: ${reason}`);

    res.json({ 
      message: 'Deposit forfeited successfully', 
      booking: {
        _id: booking._id,
        damageDepositStatus: booking.damageDepositStatus,
        damageDepositNotes: booking.damageDepositNotes,
        damageDepositCents: booking.damageDepositCents,
      }
    });
  } catch (error: any) {
    console.error('Error forfeiting deposit:', error);
    res.status(500).json({ error: error.message || 'Failed to forfeit deposit' });
  }
};

/**
 * Manually refund damage deposit immediately (before 2-day auto-refund)
 * POST /api/admin/bookings/:id/refund-deposit
 */
export const manualRefundDeposit = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const booking = await Booking.findById(id).populate('vessel user');

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (booking.damageDepositStatus !== 'held') {
      return res.status(400).json({ 
        error: `Deposit already ${booking.damageDepositStatus}. Cannot refund.` 
      });
    }

    if (!booking.stripePaymentIntentId) {
      return res.status(400).json({ 
        error: 'No payment intent found for this booking. Cannot process refund.' 
      });
    }

    const depositAmount = booking.damageDepositCents || 25000;

    // Create refund in Stripe
    const refund = await stripe.refunds.create({
      payment_intent: booking.stripePaymentIntentId,
      amount: depositAmount,
      reason: 'requested_by_customer',
      metadata: {
        bookingId: (booking._id as any).toString(),
        type: 'manual_damage_deposit_refund',
        refundedBy: 'admin',
      },
    });

    // Update booking record
    booking.damageDepositStatus = 'refunded';
    booking.damageDepositRefundId = refund.id;
    booking.damageDepositRefundDate = new Date();
    await booking.save();

    // Send notification to customer
    await sendManualDepositRefundEmail(booking);

    console.log(`✅ Manual deposit refund processed for booking ${booking._id} - Refund ID: ${refund.id}`);

    res.json({ 
      message: 'Deposit refunded successfully', 
      refund: {
        id: refund.id,
        amount: refund.amount,
        status: refund.status,
      },
      booking: {
        _id: booking._id,
        damageDepositStatus: booking.damageDepositStatus,
        damageDepositRefundId: booking.damageDepositRefundId,
      }
    });
  } catch (error: any) {
    console.error('Error refunding deposit:', error);
    res.status(500).json({ error: error.message || 'Failed to refund deposit' });
  }
};

/**
 * Get deposit status and details for a booking
 * GET /api/admin/bookings/:id/deposit-status
 */
export const getDepositStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const booking = await Booking.findById(id).populate('vessel');

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Calculate days until auto-refund
    let daysUntilAutoRefund = null;
    if (booking.damageDepositStatus === 'held' && booking.endTime) {
      const endDate = new Date(booking.endTime);
      const autoRefundDate = new Date(endDate);
      autoRefundDate.setDate(autoRefundDate.getDate() + 2);
      
      const today = new Date();
      const daysRemaining = Math.ceil((autoRefundDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      daysUntilAutoRefund = daysRemaining > 0 ? daysRemaining : 0;
    }

    res.json({
      bookingId: booking._id,
      damageDepositCents: booking.damageDepositCents || 25000,
      damageDepositStatus: booking.damageDepositStatus || 'held',
      damageDepositRefundId: booking.damageDepositRefundId,
      damageDepositRefundDate: booking.damageDepositRefundDate,
      damageDepositNotes: booking.damageDepositNotes,
      daysUntilAutoRefund,
      endTime: booking.endTime,
    });
  } catch (error: any) {
    console.error('Error getting deposit status:', error);
    res.status(500).json({ error: error.message || 'Failed to get deposit status' });
  }
};

/**
 * Manually trigger deposit refund check (for testing/admin use)
 * POST /api/admin/deposits/trigger-refund-check
 */
export const triggerRefundCheck = async (req: Request, res: Response) => {
  try {
    console.log('🔵 Manual deposit refund check triggered by admin...');
    
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    
    // Find bookings eligible for refund
    const eligibleBookings = await Booking.find({
      endTime: { $lte: twoDaysAgo },
      damageDepositStatus: 'held',
      status: { $nin: ['cancelled'] },
      stripePaymentIntentId: { $exists: true, $ne: null },
    }).populate('vessel user');
    
    console.log(`📋 Found ${eligibleBookings.length} deposit(s) eligible for refund`);
    
    const results = {
      total: eligibleBookings.length,
      successful: 0,
      failed: 0,
      errors: [] as string[],
    };
    
    for (const booking of eligibleBookings) {
      try {
        const depositAmount = booking.damageDepositCents || 25000;
        
        console.log(`💳 Processing refund for booking ${booking._id}...`);
        
        // Create refund in Stripe
        const refund = await stripe.refunds.create({
          payment_intent: booking.stripePaymentIntentId!,
          amount: depositAmount,
          reason: 'requested_by_customer',
          metadata: {
            bookingId: (booking._id as any).toString(),
            type: 'manual_trigger_damage_deposit_refund',
            triggeredBy: 'admin',
          },
        });
        
        // Update booking record
        booking.damageDepositStatus = 'refunded';
        booking.damageDepositRefundId = refund.id;
        booking.damageDepositRefundDate = new Date();
        await booking.save();
        
        console.log(`✅ Refund created: ${refund.id}`);
        
        // Send email notification to customer
        try {
          await sendAutoDepositRefundEmail(booking);
          console.log(`📧 Refund email sent for booking ${booking._id}`);
        } catch (emailError: any) {
          console.error(`⚠️ Failed to send email for booking ${booking._id}:`, emailError.message);
          // Don't fail the refund if email fails
        }
        
        results.successful++;
      } catch (error: any) {
        console.error(`❌ Failed to refund deposit for booking ${booking._id}:`, error.message);
        results.failed++;
        results.errors.push(`Booking ${booking._id}: ${error.message}`);
      }
    }
    
    res.json({
      message: 'Deposit refund check completed',
      cutoffDate: twoDaysAgo,
      results,
    });
  } catch (error: any) {
    console.error('Error in manual deposit refund check:', error);
    res.status(500).json({ error: error.message || 'Failed to trigger refund check' });
  }
};

/**
 * Send email notification when deposit is automatically refunded
 * Used by both cron job and manual trigger
 */
export const sendAutoDepositRefundEmail = async (booking: any) => {
  try {
    const user = booking.user as any;
    const vessel = booking.vessel as any;
    const depositAmount = ((booking.damageDepositCents || 25000) / 100).toFixed(2);
    
    const customerEmail = booking.customerEmail || user?.email;
    const customerName = booking.customerName || user?.name || 'Customer';
    
    if (!customerEmail) {
      console.warn(`⚠️ No email found for booking ${booking._id}, skipping email notification`);
      return;
    }
    
    const emailSubject = `Damage Deposit Refunded - $${depositAmount}`;
    const emailBody = `
      <div style="font-family: Arial, sans-serif; padding: 30px; max-width: 600px; margin: 0 auto; color: #333;">
        <h2 style="color: #27ae60; margin-bottom: 20px;">💰 Great News, ${customerName}!</h2>
        
        <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
          Your damage deposit for the <strong>${vessel?.name || 'mobile sauna'}</strong> rental has been refunded.
        </p>

        <div style="background-color: #e8f5e9; padding: 20px; border-radius: 8px; border-left: 4px solid #27ae60; margin: 25px 0;">
          <h3 style="margin-top: 0; color: #2c3e50;">Refund Details</h3>
          <p style="margin: 10px 0;"><strong>Amount Refunded:</strong> $${depositAmount}</p>
          <p style="margin: 10px 0;"><strong>Refund Date:</strong> ${new Date().toLocaleDateString('en-US', { 
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
          })}</p>
          <p style="margin: 10px 0;"><strong>Refund ID:</strong> ${booking.damageDepositRefundId}</p>
        </div>

        <p style="font-size: 14px; line-height: 1.6; color: #666; margin-top: 20px;">
          <strong>When will I see the refund?</strong><br>
          The refund has been processed and should appear in your account within <strong>5-10 business days</strong>, 
          depending on your bank or card issuer.
        </p>

        <p style="font-size: 16px; line-height: 1.6; margin-top: 30px;">
          Thank you for taking care of the equipment! We hope you had a wonderful experience.
        </p>

        <p style="font-size: 16px; line-height: 1.6; margin-top: 20px; font-style: italic;">
          Have a beautiful life!
        </p>
        
        <p style="font-size: 16px; line-height: 1.6; margin-top: 10px;">
          Matt
        </p>

        <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
        <p style="font-size: 12px; color: #999; margin-top: 20px;">
          If you have any questions about this refund, please reply to this email.
        </p>
      </div>
    `;
    
    await sendEmail(customerEmail, emailSubject, emailBody);
    console.log(`📧 Deposit refund email sent to: ${customerEmail}`);
  } catch (error: any) {
    console.error(`❌ Failed to send deposit refund email for booking ${booking._id}:`, error.message);
  }
};

/**
 * Send email notification when deposit is forfeited
 */
const sendDepositForfeitEmail = async (booking: any, reason: string) => {
  try {
    const user = booking.user as any;
    const vessel = booking.vessel as any;
    const depositAmount = ((booking.damageDepositCents || 25000) / 100).toFixed(2);
    
    const customerEmail = booking.customerEmail || user?.email;
    const customerName = booking.customerName || user?.name || 'Customer';
    
    if (!customerEmail) {
      console.warn(`⚠️ No email found for booking ${booking._id}, skipping email notification`);
      return;
    }
    
    const emailSubject = `Damage Deposit Held - $${depositAmount}`;
    const emailBody = `
      <div style="font-family: Arial, sans-serif; padding: 30px; max-width: 600px; margin: 0 auto; color: #333;">
        <h2 style="color: #e74c3c; margin-bottom: 20px;">Damage Deposit Notification</h2>
        
        <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
          Hello ${customerName},
        </p>

        <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
          We're writing to inform you that your damage deposit for the <strong>${vessel?.name || 'mobile sauna'}</strong> 
          rental will not be refunded.
        </p>

        <div style="background-color: #ffebee; padding: 20px; border-radius: 8px; border-left: 4px solid #e74c3c; margin: 25px 0;">
          <h3 style="margin-top: 0; color: #c62828;">Deposit Status</h3>
          <p style="margin: 10px 0;"><strong>Amount:</strong> $${depositAmount}</p>
          <p style="margin: 10px 0;"><strong>Status:</strong> Held (Not Refunded)</p>
          <p style="margin: 15px 0 5px 0;"><strong>Reason:</strong></p>
          <p style="margin: 5px 0; padding: 10px; background-color: white; border-radius: 4px;">${reason}</p>
        </div>

        <p style="font-size: 16px; line-height: 1.6; margin-top: 20px;">
          If you have any questions or would like to discuss this matter, please contact us directly.
        </p>

        <p style="font-size: 16px; line-height: 1.6; margin-top: 30px;">
          Best regards,
        </p>
        
        <p style="font-size: 16px; line-height: 1.6; margin-top: 10px;">
          Matt
        </p>

        <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
        <p style="font-size: 12px; color: #999; margin-top: 20px;">
          If you have questions about this decision, please reply to this email.
        </p>
      </div>
    `;
    
    await sendEmail(customerEmail, emailSubject, emailBody);
    console.log(`📧 Deposit forfeit email sent to: ${customerEmail}`);
  } catch (error: any) {
    console.error(`❌ Failed to send deposit forfeit email for booking ${booking._id}:`, error.message);
  }
};

/**
 * Send email notification when deposit is manually refunded
 */
const sendManualDepositRefundEmail = async (booking: any) => {
  try {
    const user = booking.user as any;
    const vessel = booking.vessel as any;
    const depositAmount = ((booking.damageDepositCents || 25000) / 100).toFixed(2);
    
    const customerEmail = booking.customerEmail || user?.email;
    const customerName = booking.customerName || user?.name || 'Customer';
    
    if (!customerEmail) {
      console.warn(`⚠️ No email found for booking ${booking._id}, skipping email notification`);
      return;
    }
    
    const emailSubject = `Damage Deposit Refunded - $${depositAmount}`;
    const emailBody = `
      <div style="font-family: Arial, sans-serif; padding: 30px; max-width: 600px; margin: 0 auto; color: #333;">
        <h2 style="color: #27ae60; margin-bottom: 20px;">💰 Great News, ${customerName}!</h2>
        
        <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
          Your damage deposit for the <strong>${vessel?.name || 'mobile sauna'}</strong> rental has been refunded early.
        </p>

        <div style="background-color: #e8f5e9; padding: 20px; border-radius: 8px; border-left: 4px solid #27ae60; margin: 25px 0;">
          <h3 style="margin-top: 0; color: #2c3e50;">Refund Details</h3>
          <p style="margin: 10px 0;"><strong>Amount Refunded:</strong> $${depositAmount}</p>
          <p style="margin: 10px 0;"><strong>Refund Date:</strong> ${new Date().toLocaleDateString('en-US', { 
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
          })}</p>
          <p style="margin: 10px 0;"><strong>Refund ID:</strong> ${booking.damageDepositRefundId}</p>
        </div>

        <p style="font-size: 14px; line-height: 1.6; color: #666; margin-top: 20px;">
          <strong>When will I see the refund?</strong><br>
          The refund has been processed and should appear in your account within <strong>5-10 business days</strong>, 
          depending on your bank or card issuer.
        </p>

        <p style="font-size: 16px; line-height: 1.6; margin-top: 30px;">
          Thank you for taking care of the equipment!
        </p>

        <p style="font-size: 16px; line-height: 1.6; margin-top: 20px; font-style: italic;">
          Have a beautiful life!
        </p>
        
        <p style="font-size: 16px; line-height: 1.6; margin-top: 10px;">
          Matt
        </p>

        <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
        <p style="font-size: 12px; color: #999; margin-top: 20px;">
          If you have any questions about this refund, please reply to this email.
        </p>
      </div>
    `;
    
    await sendEmail(customerEmail, emailSubject, emailBody);
    console.log(`📧 Manual deposit refund email sent to: ${customerEmail}`);
  } catch (error: any) {
    console.error(`❌ Failed to send manual deposit refund email for booking ${booking._id}:`, error.message);
  }
};
