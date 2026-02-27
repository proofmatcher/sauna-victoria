import type { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { VerificationCode } from "../models/VerificationCode.js";
import { sendEmail } from "../utils/sendEmail.js";

/**
 * GUEST AUTHENTICATION CONTROLLER
 * 
 * Handles OTP-based email verification for guest checkout.
 * No user accounts are created - guests verify their email before payment.
 */

// Email validation regex
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Generate 6-digit OTP code
const generateOTPCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Generate OTP email HTML
const generateOTPEmail = (code: string): string => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verification Code</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #8b5a2b 0%, #a0522d 100%); padding: 40px 30px; text-align: center;">
                  <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">Verify Your Email</h1>
                </td>
              </tr>
              
              <!-- Content -->
              <tr>
                <td style="padding: 40px 30px;">
                  <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                    Thank you for booking with us! Please use the verification code below to continue:
                  </p>
                  
                  <!-- OTP Code Box -->
                  <div style="background-color: #f8f9fa; border: 2px dashed #dee2e6; border-radius: 8px; padding: 30px; text-align: center; margin: 30px 0;">
                    <p style="color: #6c757d; font-size: 14px; margin: 0 0 10px; text-transform: uppercase; letter-spacing: 1px;">Your Verification Code</p>
                    <div style="font-size: 42px; font-weight: bold; color: #8b5a2b; letter-spacing: 8px; font-family: 'Courier New', monospace;">
                      ${code}
                    </div>
                  </div>
                  
                  <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 20px 0;">
                    <strong>⏰ This code expires in 5 minutes.</strong>
                  </p>
                  
                  <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 0;">
                    🔒 For your security, do not share this code with anyone.
                  </p>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #dee2e6;">
                  <p style="color: #999999; font-size: 12px; margin: 0; line-height: 1.5;">
                    If you didn't request this code, please ignore this email.
                  </p>
                  <p style="color: #999999; font-size: 12px; margin: 10px 0 0; line-height: 1.5;">
                    © ${new Date().getFullYear()} Sauna Boat Rental. All rights reserved.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
};

/**
 * POST / api/guest/send-code
 * Send OTP verification code to guest email
 */
export const sendVerificationCode = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    // Validate email format
    if (!email || !emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address"
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Rate limiting: Check if code was sent recently (within last 1 minute)
    const recentCode = await VerificationCode.findOne({
      email: normalizedEmail,
      purpose: 'booking',
      createdAt: { $gte: new Date(Date.now() - 60 * 1000) } // Last 1 minute
    });

    if (recentCode) {
      return res.status(429).json({
        success: false,
        message: "Please wait 1 minute before requesting a new code"
      });
    }

    // Invalidate any existing codes for this email and purpose
    await VerificationCode.updateMany(
      { 
        email: normalizedEmail, 
        purpose: 'booking',
        verified: false 
      },
      { 
        verified: true // Mark as used to prevent reuse
      }
    );

    // Generate new OTP code
    const code = generateOTPCode();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Save to database
    await VerificationCode.create({
      email: normalizedEmail,
      code,
      purpose: 'booking',
      expiresAt,
      verified: false,
      attempts: 0
    });

    // Send email
    const emailHtml = generateOTPEmail(code);
    await sendEmail(
      normalizedEmail,
      "Your Booking Verification Code",
      emailHtml
    );

    return res.status(200).json({
      success: true,
      message: "Verification code sent to your email",
      email: normalizedEmail
    });

  } catch (error: any) {
    console.error("Send verification code error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to send verification code. Please try again."
    });
  }
};

/**
 * POST /api/guest/verify-code
 * Verify OTP code and return temporary JWT token
 */
export const verifyCode = async (req: Request, res: Response) => {
  try {
    const { email, code } = req.body;

    // Validate inputs
    if (!email || !emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address"
      });
    }

    if (!code || !/^\d{6}$/.test(code)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid 6-digit code"
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Find verification code
    const verificationCode = await VerificationCode.findOne({
      email: normalizedEmail,
      code,
      purpose: 'booking',
      verified: false
    });

    if (!verificationCode) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired verification code"
      });
    }

    // Check if code is valid (not expired, not exceeded attempts)
    if (!verificationCode.isValid()) {
      await verificationCode.incrementAttempts();
      
      if (verificationCode.attempts >= 5) {
        return res.status(400).json({
          success: false,
          message: "Maximum verification attempts exceeded. Please request a new code."
        });
      }

      if (verificationCode.expiresAt < new Date()) {
        return res.status(400).json({
          success: false,
          message: "Verification code has expired. Please request a new code."
        });
      }

      return res.status(400).json({
        success: false,
        message: "Invalid verification code"
      });
    }

    // Mark code as verified
    verificationCode.verified = true;
    await verificationCode.save();

    // Generate temporary JWT token (1 hour expiry)
    const secret = process.env.JWT_SECRET || "fallback-secret-key";
    const token = jwt.sign(
      { 
        email: normalizedEmail, 
        type: 'guest',
        purpose: 'booking'
      }, 
      secret, 
      { expiresIn: '1h' }
    );

    return res.status(200).json({
      success: true,
      message: "Email verified successfully",
      token,
      email: normalizedEmail
    });

  } catch (error: any) {
    console.error("Verify code error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to verify code. Please try again."
    });
  }
};
