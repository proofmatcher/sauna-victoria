import type { Request, Response } from "express";
import crypto from "crypto";
import { User } from "../models/User.js";
import { sendEmail } from "../utils/sendEmail.js";
import type { AuthRequest } from "../middleware/authMiddleware.js";

/**
 * STAFF MANAGEMENT CONTROLLER
 * 
 * Admin creates & manages staff members (verified email addresses for notifications).
 * Staff members NEVER log in - they only receive booking notification emails.
 * Staff verify their email address once when created (to prevent typos).
 */

// Email validation regex
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Generate staff welcome email HTML
const generateStaffWelcomeEmail = (name: string, verificationLink: string): string => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to Our Team</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #8b5a2b 0%, #a0522d 100%); padding: 40px 30px; text-align: center;">
                  <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">Welcome to Our Team!</h1>
                </td>
              </tr>
              
              <!-- Content -->
              <tr>
                <td style="padding: 40px 30px;">
                  <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                    Hello <strong>${name}</strong>,
                  </p>
                  
                  <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                    You've been added as a staff member for our Sauna Boat Rental service! 🎉
                  </p>
                  
                  <div style="background-color: #f8f9fa; border-left: 4px solid #8b5a2b; padding: 20px; margin: 25px 0;">
                    <h3 style="color: #8b5a2b; margin: 0 0 10px; font-size: 18px;">What this means:</h3>
                    <ul style="color: #666666; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
                      <li>You'll receive email notifications when you're assigned to a booking</li>
                      <li>No login required - you only receive notification emails</li>
                      <li>Each email contains booking details and customer information</li>
                    </ul>
                  </div>
                  
                  <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 20px 0;">
                    <strong>First, please verify your email address:</strong>
                  </p>
                  
                  <!-- CTA Button -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                    <tr>
                      <td align="center">
                        <a href="${verificationLink}" style="display: inline-block; background-color: #8b5a2b; color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 6px; font-size: 16px; font-weight: 600; text-align: center;">
                          Verify Email Address
                        </a>
                      </td>
                    </tr>
                  </table>
                  
                  <p style="color: #999999; font-size: 13px; line-height: 1.6; margin: 20px 0 0; padding-top: 20px; border-top: 1px solid #dee2e6;">
                    If the button doesn't work, copy and paste this link into your browser:<br>
                    <span style="color: #8b5a2b; word-break: break-all;">${verificationLink}</span>
                  </p>
                  
                  <p style="color: #999999; font-size: 13px; line-height: 1.6; margin: 20px 0 0;">
                    <em>This verification link expires in 24 hours.</em>
                  </p>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #dee2e6;">
                  <p style="color: #999999; font-size: 12px; margin: 0; line-height: 1.5;">
                    Questions? Contact your administrator.
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
 * POST /api/admin/staff
 * Create new staff member (Admin only)
 */
export const createStaff = async (req: AuthRequest, res: Response) => {
  try {
    const { name, email, phone } = req.body;

    // Validate required fields
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: "Name and email are required"
      });
    }

    // Validate email format
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address"
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if email already exists
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "A user with this email already exists"
      });
    }

    // Create staff member (NO password, NO login access)
    const staff = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      phone: phone?.trim() || undefined,
      role: 'staff',
      isStaff: true,
      isEmailVerified: false,
      isActive: true
      // NO password field - staff cannot log in
    });

    // Generate email verification token
    const verificationToken = staff.getEmailVerificationToken();
    await staff.save();

    // Create verification link
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const verificationLink = `${frontendUrl}/staff/verify-email/${verificationToken}`;

    // Send welcome email with verification link
    const emailHtml = generateStaffWelcomeEmail(staff.name, verificationLink);
    await sendEmail(
      staff.email,
      "Welcome to the Team - Verify Your Email",
      emailHtml
    );

    return res.status(201).json({
      success: true,
      message: "Staff member created successfully. Verification email sent.",
      staff: {
        id: staff._id,
        name: staff.name,
        email: staff.email,
        phone: staff.phone,
        isEmailVerified: staff.isEmailVerified,
        isActive: staff.isActive
      }
    });

  } catch (error: any) {
    console.error("Create staff error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create staff member"
    });
  }
};

/**
 * GET /api/admin/staff
 * List all staff members (Admin only)
 */
export const listStaff = async (req: AuthRequest, res: Response) => {
  try {
    const staff = await User.find({ role: 'staff' })
      .select('-password -resetPasswordToken -resetPasswordExpire -emailVerificationToken -emailVerificationExpire')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: staff.length,
      staff
    });

  } catch (error: any) {
    console.error("List staff error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve staff members"
    });
  }
};

/**
 * GET /api/admin/staff/:id
 * Get single staff member by ID (Admin only)
 */
export const getStaffById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const staff = await User.findOne({ _id: id, role: 'staff' })
      .select('-password -resetPasswordToken -resetPasswordExpire -emailVerificationToken -emailVerificationExpire');

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: "Staff member not found"
      });
    }

    return res.status(200).json({
      success: true,
      staff
    });

  } catch (error: any) {
    console.error("Get staff error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve staff member"
    });
  }
};

/**
 * PUT /api/admin/staff/:id
 * Update staff member (Admin only)
 */
export const updateStaff = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, email, phone, isActive } = req.body;

    const staff = await User.findOne({ _id: id, role: 'staff' });

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: "Staff member not found"
      });
    }

    // Update fields
    if (name) staff.name = name.trim();
    
    if (email && email !== staff.email) {
      // Validate new email
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: "Please provide a valid email address"
        });
      }

      const normalizedEmail = email.toLowerCase().trim();

      // Check if new email already exists
      const existingUser = await User.findOne({ email: normalizedEmail, _id: { $ne: id } });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "This email is already in use"
        });
      }

      staff.email = normalizedEmail;
      staff.isEmailVerified = false; // Require re-verification

      // Generate new verification token
      const verificationToken = staff.getEmailVerificationToken();
      
      // Send new verification email
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const verificationLink = `${frontendUrl}/staff/verify-email/${verificationToken}`;
      const emailHtml = generateStaffWelcomeEmail(staff.name, verificationLink);
      
      await sendEmail(
        staff.email,
        "Verify Your New Email Address",
        emailHtml
      );
    }
    
    if (phone !== undefined) staff.phone = phone?.trim() || undefined;
    if (typeof isActive === 'boolean') staff.isActive = isActive;

    await staff.save();

    return res.status(200).json({
      success: true,
      message: "Staff member updated successfully",
      staff: {
        id: staff._id,
        name: staff.name,
        email: staff.email,
        phone: staff.phone,
        isEmailVerified: staff.isEmailVerified,
        isActive: staff.isActive
      }
    });

  } catch (error: any) {
    console.error("Update staff error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update staff member"
    });
  }
};

/**
 * DELETE /api/admin/staff/:id
 * Delete staff member (Admin only)
 */
export const deleteStaff = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const staff = await User.findOne({ _id: id, role: 'staff' });

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: "Staff member not found"
      });
    }

    // Soft delete - set isActive to false
    staff.isActive = false;
    await staff.save();

    // For hard delete, use: await User.deleteOne({ _id: id, role: 'staff' });

    return res.status(200).json({
      success: true,
      message: "Staff member deleted successfully"
    });

  } catch (error: any) {
    console.error("Delete staff error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete staff member"
    });
  }
};

/**
 * GET /api/staff/verify-email/:token
 * Verify staff email address (Public route - staff clicks email link)
 */
export const verifyStaffEmail = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Verification token is required"
      });
    }

    // Hash the token to match stored hash
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    // Find staff with matching token and not expired
    const staff = await User.findOne({
      role: 'staff',
      emailVerificationToken: hashedToken,
      emailVerificationExpire: { $gt: Date.now() }
    });

    if (!staff) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired verification link"
      });
    }

    // Mark email as verified
    staff.isEmailVerified = true;
    staff.emailVerificationToken = undefined;
    staff.emailVerificationExpire = undefined;
    await staff.save();

    return res.status(200).json({
      success: true,
      message: "Email verified successfully! You will now receive booking notifications.",
      staff: {
        name: staff.name,
        email: staff.email
      }
    });

  } catch (error: any) {
    console.error("Verify staff email error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to verify email"
    });
  }
};
