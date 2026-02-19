import { Request, Response } from 'express';
import Contact from '../models/Contact.js';
import { sendEmail } from '../utils/sendEmail.js';

/**
 * @desc    Submit a contact form
 * @route   POST /api/contact
 * @access  Public
 */
export const submitContactForm = async (req: Request, res: Response): Promise<void> => {
  try {
    const { firstName, lastName, email, phone, subject, inquiryType, message } = req.body;

    // Validation
    if (!firstName || !lastName || !email || !subject || !inquiryType || !message) {
      res.status(400).json({ 
        message: 'Please provide all required fields: firstName, lastName, email, subject, inquiryType, and message' 
      });
      return;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({ message: 'Please provide a valid email address' });
      return;
    }

    // Message length validation
    if (message.trim().length < 10) {
      res.status(400).json({ message: 'Message must be at least 10 characters long' });
      return;
    }

    // Create contact inquiry
    const contact = await Contact.create({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone?.trim() || undefined,
      subject: subject.trim(),
      inquiryType,
      message: message.trim(),
      status: 'new'
    });

    // Send confirmation email to user
    const userEmailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #8b5a2b 0%, #a0522d 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .info-box { background: white; padding: 20px; margin: 20px 0; border-left: 4px solid #8b4513; border-radius: 4px; }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 14px; }
          h1 { margin: 0; font-size: 28px; }
          h2 { color: #8b4513; margin-top: 0; }
          .label { font-weight: 600; color: #8b4513; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🙏 Thank You for Contacting Us</h1>
          </div>
          <div class="content">
            <p>Hi <strong>${firstName}</strong>,</p>
            <p>We've received your inquiry and our team will get back to you as soon as possible, typically within 24 hours.</p>
            
            <div class="info-box">
              <h2>📋 Your Inquiry Details</h2>
              <p><span class="label">Subject:</span> ${subject}</p>
              <p><span class="label">Inquiry Type:</span> ${inquiryType.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}</p>
              <p><span class="label">Message:</span><br>${message.replace(/\n/g, '<br>')}</p>
            </div>

            <p>If you have any urgent concerns or need immediate assistance, please feel free to call us at <strong>(555) 123-4567</strong>.</p>

            <div class="footer">
              <p><strong>Sauna Boat Co.</strong><br>
              Vancouver Island, BC<br>
              📧 hello@saunaboatco.com | 📞 (555) 123-4567</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    await sendEmail(
      email,
      `We've received your inquiry - ${subject}`,
      userEmailHtml
    );

    // Send notification email to admin
    const adminEmailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .info-box { background: white; padding: 20px; margin: 20px 0; border-left: 4px solid #3498db; border-radius: 4px; }
          .label { font-weight: 600; color: #2c3e50; display: inline-block; min-width: 120px; }
          .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase; }
          .badge-new { background: #e74c3c; color: white; }
          h1 { margin: 0; font-size: 26px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📧 New Contact Form Submission</h1>
            <span class="badge badge-new">New</span>
          </div>
          <div class="content">
            <div class="info-box">
              <p><span class="label">From:</span> ${firstName} ${lastName}</p>
              <p><span class="label">Email:</span> <a href="mailto:${email}">${email}</a></p>
              ${phone ? `<p><span class="label">Phone:</span> ${phone}</p>` : ''}
              <p><span class="label">Subject:</span> ${subject}</p>
              <p><span class="label">Inquiry Type:</span> ${inquiryType.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}</p>
              <p><span class="label">Submitted:</span> ${new Date().toLocaleString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}</p>
            </div>

            <div class="info-box">
              <h3 style="margin-top: 0; color: #2c3e50;">📝 Message:</h3>
              <p style="white-space: pre-wrap;">${message}</p>
            </div>

            <p style="text-align: center; margin-top: 30px;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/admin/contacts" 
                 style="display: inline-block; padding: 12px 30px; background: #3498db; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">
                View in Dashboard
              </a>
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send to admin email (configured in env)
    const adminEmail = process.env.ADMIN_EMAIL || 'hello@saunaboatco.com';
    await sendEmail(
      adminEmail,
      `🆕 New Contact Form: ${subject}`,
      adminEmailHtml
    );

    res.status(201).json({
      success: true,
      message: 'Your message has been sent successfully! We will get back to you soon.',
      contactId: contact._id
    });

  } catch (error: any) {
    console.error('Error submitting contact form:', error);
    res.status(500).json({ 
      message: 'Failed to submit contact form. Please try again or contact us directly.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Get all contact inquiries (Admin only)
 * @route   GET /api/contact/admin
 * @access  Private/Admin
 */
export const getAllContacts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, inquiryType, page = 1, limit = 20 } = req.query;

    const query: any = {};
    if (status) query.status = status;
    if (inquiryType) query.inquiryType = inquiryType;

    const skip = (Number(page) - 1) * Number(limit);

    const contacts = await Contact.find(query)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip(skip);

    const total = await Contact.countDocuments(query);

    res.status(200).json({
      success: true,
      contacts,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit)),
        limit: Number(limit)
      }
    });

  } catch (error: any) {
    console.error('Error fetching contacts:', error);
    res.status(500).json({ 
      message: 'Failed to fetch contact inquiries',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Get single contact inquiry (Admin only)
 * @route   GET /api/contact/admin/:id
 * @access  Private/Admin
 */
export const getContactById = async (req: Request, res: Response): Promise<void> => {
  try {
    const contact = await Contact.findById(req.params.id);

    if (!contact) {
      res.status(404).json({ message: 'Contact inquiry not found' });
      return;
    }

    // Mark as read if status is 'new'
    if (contact.status === 'new') {
      contact.status = 'read';
      await contact.save();
    }

    res.status(200).json({
      success: true,
      contact
    });

  } catch (error: any) {
    console.error('Error fetching contact:', error);
    res.status(500).json({ 
      message: 'Failed to fetch contact inquiry',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Update contact status (Admin only)
 * @route   PUT /api/contact/admin/:id
 * @access  Private/Admin
 */
export const updateContactStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, adminNotes } = req.body;

    const contact = await Contact.findById(req.params.id);

    if (!contact) {
      res.status(404).json({ message: 'Contact inquiry not found' });
      return;
    }

    if (status) contact.status = status;
    if (adminNotes !== undefined) contact.adminNotes = adminNotes;

    await contact.save();

    res.status(200).json({
      success: true,
      message: 'Contact inquiry updated successfully',
      contact
    });

  } catch (error: any) {
    console.error('Error updating contact:', error);
    res.status(500).json({ 
      message: 'Failed to update contact inquiry',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Delete contact inquiry (Admin only)
 * @route   DELETE /api/contact/admin/:id
 * @access  Private/Admin
 */
export const deleteContact = async (req: Request, res: Response): Promise<void> => {
  try {
    const contact = await Contact.findById(req.params.id);

    if (!contact) {
      res.status(404).json({ message: 'Contact inquiry not found' });
      return;
    }

    await contact.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Contact inquiry deleted successfully'
    });

  } catch (error: any) {
    console.error('Error deleting contact:', error);
    res.status(500).json({ 
      message: 'Failed to delete contact inquiry',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
