import express from 'express';
import {
  submitContactForm,
  getAllContacts,
  getContactById,
  updateContactStatus,
  deleteContact
} from '../controllers/contactController.js';
import { protect } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/roleMiddleware.js';

const router = express.Router();

// Public route - Submit contact form
router.post('/', submitContactForm);

// Admin routes - Manage contact inquiries
router.get('/admin', protect, authorize('admin'), getAllContacts);
router.get('/admin/:id', protect, authorize('admin'), getContactById);
router.put('/admin/:id', protect, authorize('admin'), updateContactStatus);
router.delete('/admin/:id', protect, authorize('admin'), deleteContact);

export default router;
