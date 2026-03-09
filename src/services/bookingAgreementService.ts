import agreementService from './agreementService.js';
import Booking from '../models/Booking.js';
import path from 'path';
import fs from 'fs';

// Ensure agreements directory exists
const AGREEMENTS_DIR = path.resolve(process.cwd(), 'uploads', 'agreements');
if (!fs.existsSync(AGREEMENTS_DIR)) {
  fs.mkdirSync(AGREEMENTS_DIR, { recursive: true });
}

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

    // Save PDF to local disk
    const filename = `agreement-${data.bookingId}-${Date.now()}.pdf`;
    const pdfUrl = await this.savePDFToDisk(pdfBuffer, filename);

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
   * Save PDF to local disk
   */
  private async savePDFToDisk(pdfBuffer: Buffer, filename: string): Promise<string> {
    const filePath = path.join(AGREEMENTS_DIR, filename);
    await fs.promises.writeFile(filePath, pdfBuffer);
    return `/uploads/agreements/${filename}`;
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
