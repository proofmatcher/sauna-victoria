import { Request, Response } from 'express';
import agreementService from '../services/agreementService.js';
import Booking from '../models/Booking.js';

/**
 * Generate agreement HTML preview
 * Accepts bookingId to fetch booking data automatically
 */
export const generateAgreementPreview = async (req: Request, res: Response) => {
  try {
    const { bookingId } = req.body;

    if (!bookingId) {
      return res.status(400).json({
        success: false,
        message: 'bookingId is required',
      });
    }

    // Fetch booking with populated vessel
    const booking = await Booking.findById(bookingId).populate('vessel');
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    const vessel = booking.vessel as any;

    // Format capacity: if integer, convert to "X person" format
    let capacityStr = '4 person'; // Default fallback
    if (vessel.capacity) {
      if (typeof vessel.capacity === 'number') {
        capacityStr = `${vessel.capacity} person`;
      } else if (typeof vessel.capacity === 'string') {
        // If already a string, check if it needs " person" suffix
        capacityStr = vessel.capacity.toLowerCase().includes('person') 
          ? vessel.capacity 
          : `${vessel.capacity} person`;
      }
    } else if (vessel.name) {
      // Try to extract capacity from vessel name
      capacityStr = vessel.name;
    }

    // Prepare agreement data from booking
    const agreementData = {
      customerName: booking.customerName || 'Customer',
      deliveryAddress: booking.deliveryAddress || '',
      customerEmail: booking.customerEmail || '',
      customerPhone: booking.customerPhone || '',
      agreementDate: new Date().toISOString().split('T')[0],
      capacity: capacityStr,
      dropoffDate: booking.startTime ? new Date(booking.startTime).toISOString().split('T')[0] : '',
      pickupDate: booking.endTime ? new Date(booking.endTime).toISOString().split('T')[0] : '',
      rentalFee: booking.totalPriceCents ? `$${(booking.totalPriceCents / 100).toFixed(2)}` : '',
    };

    const { valid, errors } = agreementService.validateAgreementData(agreementData);

    if (!valid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid agreement data from booking',
        errors,
      });
    }

    const html = await agreementService.generateHTML(agreementData);

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    console.error('Error generating agreement preview:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate agreement preview',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Generate agreement PDF
 */
export const generateAgreementPDF = async (req: Request, res: Response) => {
  try {
    const { valid, errors } = agreementService.validateAgreementData(req.body);

    if (!valid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid agreement data',
        errors,
      });
    }

    const pdfBuffer = await agreementService.generatePDF(req.body);

    const filename = `Equipment-Rental-Agreement-${req.body.customerName.replace(/\s+/g, '-')}-${Date.now()}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generating agreement PDF:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate agreement PDF',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Get agreement template info
 */
export const getAgreementInfo = async (req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      message: 'Equipment Rental Agreement Generator',
      requiredFields: [
        {
          name: 'customerName',
          type: 'string',
          description: 'Full name of the customer',
          example: 'John Doe',
        },
        {
          name: 'deliveryAddress',
          type: 'string',
          description: 'Complete delivery address',
          example: '123 Main Street, Victoria, BC V8V 1A1',
        },
        {
          name: 'customerEmail',
          type: 'string',
          description: 'Customer email address',
          example: 'john.doe@example.com',
        },
        {
          name: 'customerPhone',
          type: 'string',
          description: 'Customer phone number',
          example: '250-123-4567',
        },
        {
          name: 'agreementDate',
          type: 'string',
          description: 'Agreement effective date',
          example: 'January 22, 2026',
        },
        {
          name: 'capacity',
          type: 'string',
          description: 'Sauna capacity',
          enum: ['4 person', '8 person'],
          example: '4 person',
        },
      ],
    });
  } catch (error) {
    console.error('Error getting agreement info:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get agreement info',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
