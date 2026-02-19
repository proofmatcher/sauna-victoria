import agreementService from './agreementService.js';
import Booking from '../models/Booking.js';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

interface BookingAgreementData {
  bookingId: string;
  customerName: string;
  deliveryAddress: string;
  customerEmail: string;
  customerPhone: string;
  agreementDate: string;
  capacity: string; // Changed to accept any capacity format
  dropoffDate: string;
  pickupDate: string;
  rentalFee: string;
  ipAddress?: string;
}

export class BookingAgreementService {
  /**
   * Generate and save agreement PDF for a booking
   * Called AFTER payment is confirmed
   */
  async generateAndSaveBookingAgreement(data: BookingAgreementData): Promise<string> {
    // Generate PDF
    const pdfBuffer = await agreementService.generatePDF({
      customerName: data.customerName,
      deliveryAddress: data.deliveryAddress,
      customerEmail: data.customerEmail,
      customerPhone: data.customerPhone,
      agreementDate: data.agreementDate,
      capacity: data.capacity,
      dropoffDate: data.dropoffDate,
      pickupDate: data.pickupDate,
      rentalFee: data.rentalFee,
    });

    // Upload to Cloudinary
    const pdfUrl = await this.uploadPDFToCloudinary(
      pdfBuffer,
      `agreement-${data.bookingId}-${Date.now()}.pdf`
    );

    // Update booking with agreement info
    await Booking.findByIdAndUpdate(data.bookingId, {
      agreementVersion: data.capacity,
      agreementAcceptedAt: new Date(),
      agreementIpAddress: data.ipAddress,
      agreementPdfUrl: pdfUrl,
    });

    return pdfUrl;
  }

  /**
   * Upload PDF to Cloudinary
   */
  private async uploadPDFToCloudinary(pdfBuffer: Buffer, filename: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'raw',
          folder: 'agreements',
          public_id: filename.replace('.pdf', ''),
          format: 'pdf',
        },
        (error: any, result: any) => {
          if (error) {
            reject(error);
          } else {
            resolve(result!.secure_url);
          }
        }
      );

      const readable = Readable.from(pdfBuffer);
      readable.pipe(uploadStream);
    });
  }

  /**
   * Get agreement preview HTML for modal display
   * Used DURING booking process, before payment
   */
  async getAgreementPreviewForBooking(data: {
    customerName: string;
    deliveryAddress: string;
    customerEmail: string;
    customerPhone: string;
    capacity: string;
    dropoffDate: string;
    pickupDate: string;
    rentalFee: string;
  }): Promise<string> {
    return agreementService.generateHTML({
      ...data,
      agreementDate: new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
    });
  }
}

export default new BookingAgreementService();
