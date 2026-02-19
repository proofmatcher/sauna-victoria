import { Router } from 'express';
import {
  generateAgreementPreview,
  generateAgreementPDF,
  getAgreementInfo,
} from '../controllers/agreementController.js';
import { protect } from '../middleware/authMiddleware.js';

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
 * @access  Protected - must be authenticated
 * @body    { customerName, deliveryAddress, customerEmail, customerPhone, agreementDate, capacity }
 */
router.post('/preview', protect, generateAgreementPreview);

/**
 * @route   POST /api/agreement/pdf
 * @desc    Generate and download PDF agreement (admin use or post-booking)
 * @access  Protected - must be authenticated
 * @body    { customerName, deliveryAddress, customerEmail, customerPhone, agreementDate, capacity }
 */
router.post('/pdf', protect, generateAgreementPDF);

export default router;
