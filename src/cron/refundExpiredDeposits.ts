import cron from 'node-cron';
import Booking from '../models/Booking.js';
import { stripe } from '../config/stripe.js';
import { sendAutoDepositRefundEmail } from '../controllers/adminDepositController.js';

/**
 * Automatically refund damage deposits 2 days after rental ends
 * Runs daily at 10:00 AM
 */
export const scheduleDepositRefunds = () => {
  // Run daily at 10:00 AM
  cron.schedule('0 10 * * *', async () => {
    console.log('🔄 Running automatic deposit refund check...');
    
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    
    try {
      // Find bookings eligible for refund
      const eligibleBookings = await Booking.find({
        endTime: { $lte: twoDaysAgo },
        damageDepositStatus: 'held',
        status: { $nin: ['cancelled'] },
        stripePaymentIntentId: { $exists: true, $ne: null },
      }).populate('vessel user');
      
      console.log(`📋 Found ${eligibleBookings.length} deposit(s) eligible for refund`);
      
      for (const booking of eligibleBookings) {
        try {
          const depositAmount = booking.damageDepositCents || 25000;
          
          console.log(`💳 Processing refund for booking ${booking._id}...`);
          console.log(`   Deposit amount: $${(depositAmount / 100).toFixed(2)}`);
          console.log(`   PaymentIntent: ${booking.stripePaymentIntentId}`);
          
          // Create refund in Stripe (refund deposit amount only)
          const refund = await stripe.refunds.create({
            payment_intent: booking.stripePaymentIntentId,
            amount: depositAmount,
            reason: 'requested_by_customer',
            metadata: {
              bookingId: (booking._id as any).toString(),
              type: 'damage_deposit_refund',
              customerName: booking.customerName || '',
              customerEmail: booking.customerEmail || '',
            },
          });
          
          // Update booking record
          booking.damageDepositStatus = 'refunded';
          booking.damageDepositRefundId = refund.id;
          booking.damageDepositRefundDate = new Date();
          await booking.save();
          
          console.log(`✅ Refund created: ${refund.id} - Status: ${refund.status}`);
          
          // Send email notification to customer
          await sendAutoDepositRefundEmail(booking);
          
          console.log(`✅ Deposit refunded for booking ${booking._id}`);
        } catch (error: any) {
          console.error(`❌ Failed to refund deposit for booking ${booking._id}:`, error.message);
          
          // Log specific error details
          if (error.type === 'StripeInvalidRequestError') {
            console.error(`   Stripe Error: ${error.message}`);
          }
        }
      }
      
      if (eligibleBookings.length === 0) {
        console.log('✅ No deposits to refund at this time');
      }
    } catch (error: any) {
      console.error('❌ Error in deposit refund cron job:', error.message);
    }
  });
  
  console.log('✅ Deposit refund cron job scheduled (daily at 10:00 AM)');
};
