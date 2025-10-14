import { Request, Response } from "express";
import Stripe from "stripe";
import { stripe } from "../config/stripe.js";
import {
  handlePaymentSuccess,
  handlePaymentFailure,
} from "../services/stripePaymentService.js";

/**
 * Stripe Webhook Handler
 * Handles events from Stripe (payment success, failure, etc.)
 */
export const handleStripeWebhook = async (req: Request, res: Response) => {
  const sig = req.headers["stripe-signature"];

  if (!sig) {
    return res.status(400).json({ message: "No stripe signature found" });
  }

  let event: Stripe.Event;

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET as string
    );
  } catch (err: any) {
    console.error("⚠️  Webhook signature verification failed:", err.message);
    return res.status(400).json({ message: `Webhook Error: ${err.message}` });
  }

  // Handle the event
  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log("✅ Payment successful for session:", session.id);
        
        if (session.payment_status === "paid") {
          await handlePaymentSuccess(session);
        }
        break;
      }

      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log("⏰ Checkout session expired:", session.id);
        await handlePaymentFailure(session);
        break;
      }

      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log("✅ Async payment succeeded for session:", session.id);
        await handlePaymentSuccess(session);
        break;
      }

      case "checkout.session.async_payment_failed": {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log("❌ Async payment failed for session:", session.id);
        await handlePaymentFailure(session);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (err: any) {
    console.error("Error handling webhook event:", err);
    res.status(500).json({ message: "Webhook handler failed", error: err.message });
  }
};
