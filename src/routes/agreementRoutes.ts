import { Router } from 'express';
import {
  generateAgreementPreview,
  generateAgreementPDF,
  getAgreementInfo,
} from '../controllers/agreementController.js';
import { protect, verifyGuestOrAdmin } from '../middleware/authMiddleware.js';

const router = Router();

/**
 * @route   GET /api/agreement/info
 * @desc    Get agreement template information and required fields
 * @access  Public (for information only)
 */
router.get('/info', getAgreementInfo);

/**
 * @route   POST /api/agreement/preview
 * @desc    Generate HTML preview of agreement (for modal display during booking)
 * @access  Protected - authenticated user or verified guest
 * @body    { customerName, deliveryAddress, customerEmail, customerPhone, agreementDate, capacity }
 */
router.post('/preview', verifyGuestOrAdmin, generateAgreementPreview);

/**
 * @route   POST /api/agreement/pdf
 * @desc    Generate and download PDF agreement (admin use or post-booking)
 * @access  Protected - authenticated user or verified guest
 * @body    { customerName, deliveryAddress, customerEmail, customerPhone, agreementDate, capacity }
 */
router.post('/pdf', verifyGuestOrAdmin, generateAgreementPDF);

export default router;
