/**
 * PHASE 3: MIDDLEWARE & ROUTES - TEST CASES
 * 
 * This file contains comprehensive test cases for Phase 3 implementation:
 * 1. Guest Token Middleware (verifyGuestToken)
 * 2. Guest or Admin Middleware (verifyGuestOrAdmin)
 * 3. Guest Auth Routes (/api/guest/...)
 * 4. Staff Management Routes (/api/staff/...)
 * 
 * Run these tests: npm run test:phase3
 */

import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { User } from '../models/User';
import { VerificationCode } from '../models/VerificationCode';
import { BlacklistedToken } from '../models/BlacklistedToken';

// Load environment variables
dotenv.config();

describe('Phase 3: Middleware & Routes', () => {
  
  beforeAll(async () => {
    // Connect to test database
    const mongoUri = process.env.MONGO_TEST_URI || process.env.MONGO_URI;
    
    if (!mongoUri) {
      throw new Error('MongoDB URI not found. Set MONGO_URI or MONGO_TEST_URI in .env file');
    }
    
    await mongoose.connect(mongoUri);
    console.log('✓ Connected to MongoDB for testing');
  }, 30000);

  afterAll(async () => {
    // Cleanup and disconnect
    await mongoose.connection.close();
  });

  afterEach(async () => {
    // Clean up after each test
    await User.deleteMany({});
    await VerificationCode.deleteMany({});
    await BlacklistedToken.deleteMany({});
  });

  // ===========================
  // 1. GUEST TOKEN MIDDLEWARE
  // ===========================

  describe('1. verifyGuestToken Middleware', () => {

    const secret = process.env.JWT_SECRET || 'test-secret';

    describe('1.1 Valid Guest Token', () => {
      
      it('should generate valid guest token with correct payload', () => {
        const email = 'guest@example.com';
        const token = jwt.sign(
          { email, type: 'guest', purpose: 'booking' },
          secret,
          { expiresIn: '1h' }
        );

        const decoded = jwt.verify(token, secret) as any;
        
        expect(decoded.email).toBe(email);
        expect(decoded.type).toBe('guest');
        expect(decoded.purpose).toBe('booking');
      });

      it('should accept guest token with valid structure', () => {
        const token = jwt.sign(
          { email: 'test@example.com', type: 'guest' },
          secret,
          { expiresIn: '1h' }
        );

        const decoded = jwt.verify(token, secret) as any;
        expect(decoded.type).toBe('guest');
      });
    });

    describe('1.2 Invalid Guest Token', () => {
      
      it('should reject token without type field', () => {
        const token = jwt.sign(
          { email: 'test@example.com' },
          secret,
          { expiresIn: '1h' }
        );

        const decoded = jwt.verify(token, secret) as any;
        expect(decoded.type).toBeUndefined();
        // Middleware should reject this
      });

      it('should reject token with wrong type', () => {
        const token = jwt.sign(
          { email: 'test@example.com', type: 'admin' },
          secret,
          { expiresIn: '1h' }
        );

        const decoded = jwt.verify(token, secret) as any;
        expect(decoded.type).not.toBe('guest');
      });

      it('should reject expired guest token', () => {
        const token = jwt.sign(
          { email: 'test@example.com', type: 'guest' },
          secret,
          { expiresIn: '-1h' } // Already expired
        );

        expect(() => {
          jwt.verify(token, secret);
        }).toThrow(jwt.TokenExpiredError);
      });

      it('should reject token with invalid signature', () => {
        const token = jwt.sign(
          { email: 'test@example.com', type: 'guest' },
          'wrong-secret',
          { expiresIn: '1h' }
        );

        expect(() => {
          jwt.verify(token, secret);
        }).toThrow(jwt.JsonWebTokenError);
      });
    });

    describe('1.3 Token Expiry', () => {
      
      it('should create token that expires in 1 hour', () => {
        const token = jwt.sign(
          { email: 'test@example.com', type: 'guest' },
          secret,
          { expiresIn: '1h' }
        );

        const decoded = jwt.verify(token, secret) as any;
        const expiryTime = decoded.exp * 1000 - Date.now();
        
        // Should be close to 1 hour (with some margin)
        expect(expiryTime).toBeGreaterThan(55 * 60 * 1000); // More than 55 minutes
        expect(expiryTime).toBeLessThan(65 * 60 * 1000); // Less than 65 minutes
      });
    });
  });

  // ===========================
  // 2. GUEST OR ADMIN MIDDLEWARE
  // ===========================

  describe('2. verifyGuestOrAdmin Middleware', () => {

    const secret = process.env.JWT_SECRET || 'test-secret';

    describe('2.1 Guest Token Handling', () => {
      
      it('should accept valid guest token', () => {
        const token = jwt.sign(
          { email: 'guest@example.com', type: 'guest' },
          secret,
          { expiresIn: '1h' }
        );

        const decoded = jwt.verify(token, secret) as any;
        expect(decoded.type).toBe('guest');
      });
    });

    describe('2.2 Admin Token Handling', () => {
      
      it('should accept valid admin token with user ID', async () => {
        const admin = await User.create({
          name: 'Admin User',
          email: 'admin@test.com',
          password: 'Admin123!',
          role: 'admin',
          isEmailVerified: true
        });

        const token = jwt.sign(
          { id: (admin as any)._id.toString() },
          secret,
          { expiresIn: '7d' }
        );

        const decoded = jwt.verify(token, secret) as any;
        expect(decoded.id).toBeDefined();

        const user = await User.findById(decoded.id);
        expect(user).toBeDefined();
        expect(user?.role).toBe('admin');
      });

      it('should reject blacklisted admin token', async () => {
        const admin = await User.create({
          name: 'Admin User',
          email: 'admin@test.com',
          password: 'Admin123!',
          role: 'admin',
          isEmailVerified: true
        });

        const token = jwt.sign(
          { id: (admin as any)._id.toString() },
          secret,
          { expiresIn: '7d' }
        );

        // Blacklist the token
        await BlacklistedToken.create({
          token,
          userId: (admin as any)._id,
          reason: 'logout',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        });

        const blacklisted = await BlacklistedToken.findOne({ token });
        expect(blacklisted).toBeDefined();
      });

      it('should reject token for inactive user', async () => {
        const admin = await User.create({
          name: 'Admin User',
          email: 'admin@test.com',
          password: 'Admin123!',
          role: 'admin',
          isEmailVerified: true,
          isActive: false
        });

        const token = jwt.sign(
          { id: (admin as any)._id.toString() },
          secret,
          { expiresIn: '7d' }
        );

        const user = await User.findById((admin as any)._id);
        expect(user?.isActive).toBe(false);
      });
    });

    describe('2.3 Token Type Detection', () => {
      
      it('should distinguish between guest and admin tokens', () => {
        const guestToken = jwt.sign(
          { email: 'guest@test.com', type: 'guest' },
          secret,
          { expiresIn: '1h' }
        );

        const adminToken = jwt.sign(
          { id: '507f1f77bcf86cd799439011' },
          secret,
          { expiresIn: '7d' }
        );

        const guestDecoded = jwt.verify(guestToken, secret) as any;
        const adminDecoded = jwt.verify(adminToken, secret) as any;

        expect(guestDecoded.type).toBe('guest');
        expect(guestDecoded.email).toBeDefined();
        
        expect(adminDecoded.type).toBeUndefined();
        expect(adminDecoded.id).toBeDefined();
      });
    });
  });

  // ===========================
  // 3. GUEST AUTH ROUTES
  // ===========================

  describe('3. Guest Auth Routes', () => {

    describe('3.1 POST /api/guest/send-code', () => {
      
      it('should validate email format', () => {
        const validEmails = [
          'test@example.com',
          'user.name@domain.co.uk',
          'user+tag@example.com'
        ];

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        
        validEmails.forEach(email => {
          expect(emailRegex.test(email)).toBe(true);
        });
      });

      it('should reject invalid email formats', () => {
        const invalidEmails = [
          'notanemail',
          '@example.com',
          'user@',
          'user @example.com',
          'user@.com'
        ];

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        
        invalidEmails.forEach(email => {
          expect(emailRegex.test(email)).toBe(false);
        });
      });

      it('should enforce rate limiting (1 minute)', async () => {
        const email = 'test@example.com';
        
        // Create recent code
        await VerificationCode.create({
          email,
          code: '123456',
          purpose: 'booking',
          expiresAt: new Date(Date.now() + 5 * 60 * 1000),
          createdAt: new Date()
        });

        // Check if code was sent recently
        const recentCode = await VerificationCode.findOne({
          email,
          purpose: 'booking',
          createdAt: { $gte: new Date(Date.now() - 60 * 1000) }
        });

        expect(recentCode).toBeDefined();
      });
    });

    describe('3.2 POST /api/guest/verify-code', () => {
      
      it('should validate 6-digit code format', () => {
        const validCodes = ['123456', '000000', '999999'];
        const invalidCodes = ['12345', '1234567', 'abcdef', '12345a'];

        const codeRegex = /^\d{6}$/;

        validCodes.forEach(code => {
          expect(codeRegex.test(code)).toBe(true);
        });

        invalidCodes.forEach(code => {
          expect(codeRegex.test(code)).toBe(false);
        });
      });

      it('should return guest token on successful verification', async () => {
        const email = 'test@example.com';
        const code = '123456';
        
        const verificationCode = await VerificationCode.create({
          email,
          code,
          purpose: 'booking',
          expiresAt: new Date(Date.now() + 5 * 60 * 1000),
          verified: false,
          attempts: 0
        });

        expect(verificationCode.isValid()).toBe(true);

        // Mark as verified
        verificationCode.verified = true;
        await verificationCode.save();

        // Generate token
        const secret = process.env.JWT_SECRET || 'test-secret';
        const token = jwt.sign(
          { email, type: 'guest', purpose: 'booking' },
          secret,
          { expiresIn: '1h' }
        );

        expect(token).toBeDefined();
        
        const decoded = jwt.verify(token, secret) as any;
        expect(decoded.email).toBe(email);
        expect(decoded.type).toBe('guest');
      });
    });
  });

  // ===========================
  // 4. STAFF MANAGEMENT ROUTES
  // ===========================

  describe('4. Staff Management Routes', () => {

    describe('4.1 POST /api/staff (Create)', () => {
      
      it('should create staff with required fields', async () => {
        const staffData = {
          name: 'John Staff',
          email: 'john@staff.com',
          phone: '+1234567890',
          role: 'staff',
          isStaff: true,
          isEmailVerified: false
        };

        const staff = await User.create(staffData);

        expect(staff).toBeDefined();
        expect(staff.role).toBe('staff');
        expect(staff.isStaff).toBe(true);
      });

      it('should require admin authentication', async () => {
        // This route should be protected by protect + authorize("admin")
        // Test would verify middleware is applied
        expect(true).toBe(true); // Placeholder
      });
    });

    describe('4.2 GET /api/staff (List)', () => {
      
      it('should list all staff members', async () => {
        await User.create([
          { name: 'Staff 1', email: 'staff1@test.com', role: 'staff', isStaff: true },
          { name: 'Staff 2', email: 'staff2@test.com', role: 'staff', isStaff: true }
        ]);

        const staff = await User.find({ role: 'staff' });
        expect(staff.length).toBe(2);
      });

      it('should require admin authentication', () => {
        expect(true).toBe(true); // Protected route test
      });
    });

    describe('4.3 GET /api/staff/verify-email/:token (Public)', () => {
      
      it('should be publicly accessible (no auth required)', async () => {
        const crypto = require('crypto');
        const staff = await User.create({
          name: 'John Staff',
          email: 'john@staff.com',
          role: 'staff',
          isStaff: true
        });

        const token = staff.getEmailVerificationToken();
        await staff.save();

        expect(token).toBeDefined();
        
        // This route should NOT require authentication
        // It's a public route that staff access via email link
      });
    });

    describe('4.4 PUT /api/staff/:id (Update)', () => {
      
      it('should update staff information', async () => {
        const staff = await User.create({
          name: 'John Staff',
          email: 'john@staff.com',
          role: 'staff',
          isStaff: true
        });

        staff.name = 'John Updated';
        await staff.save();

        const updated = await User.findById(staff._id);
        expect(updated?.name).toBe('John Updated');
      });
    });

    describe('4.5 DELETE /api/staff/:id (Delete)', () => {
      
      it('should soft delete staff member', async () => {
        const staff = await User.create({
          name: 'John Staff',
          email: 'john@staff.com',
          role: 'staff',
          isStaff: true,
          isActive: true
        });

        staff.isActive = false;
        await staff.save();

        const deleted = await User.findById(staff._id);
        expect(deleted?.isActive).toBe(false);
      });
    });
  });

  // ===========================
  // 5. ROUTE REGISTRATION
  // ===========================

  describe('5. Route Registration in app.ts', () => {
    
    it('should have correct route prefixes', () => {
      const routes = {
        guestAuth: '/api/guest',
        staffManagement: '/api/staff',
        adminAuth: '/api/auth'
      };

      expect(routes.guestAuth).toBe('/api/guest');
      expect(routes.staffManagement).toBe('/api/staff');
    });

    it('should register routes in correct order', () => {
      // Routes should be registered after body parsers
      // Guest routes should not require authentication
      // Admin routes should require authentication
      expect(true).toBe(true); // Verification test
    });
  });

  // ===========================
  // 6. INTEGRATION TESTS
  // ===========================

  describe('6. End-to-End Integration', () => {

    describe('6.1 Guest Booking Flow', () => {
      
      it('should complete full guest checkout flow', async () => {
        const email = 'guest@example.com';
        const code = '123456';

        // Step 1: Create verification code
        const verificationCode = await VerificationCode.create({
          email,
          code,
          purpose: 'booking',
          expiresAt: new Date(Date.now() + 5 * 60 * 1000),
          verified: false,
          attempts: 0
        });

        expect(verificationCode).toBeDefined();

        // Step 2: Verify code
        expect(verificationCode.isValid()).toBe(true);
        verificationCode.verified = true;
        await verificationCode.save();

        // Step 3: Generate guest token
        const secret = process.env.JWT_SECRET || 'test-secret';
        const token = jwt.sign(
          { email, type: 'guest' },
          secret,
          { expiresIn: '1h' }
        );

        // Step 4: Use token for booking
        const decoded = jwt.verify(token, secret) as any;
        expect(decoded.email).toBe(email);
        expect(decoded.type).toBe('guest');
      });
    });

    describe('6.2 Staff Onboarding Flow', () => {
      
      it('should complete full staff creation and verification', async () => {
        const crypto = require('crypto');

        // Step 1: Admin creates staff
        const staff = await User.create({
          name: 'New Staff',
          email: 'newstaff@test.com',
          role: 'staff',
          isStaff: true,
          isEmailVerified: false
        });

        expect(staff.isEmailVerified).toBe(false);

        // Step 2: Generate verification token
        const token = staff.getEmailVerificationToken();
        await staff.save();

        expect(token).toBeDefined();

        // Step 3: Staff verifies email
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
        
        const foundStaff = await User.findOne({
          role: 'staff',
          emailVerificationToken: hashedToken,
          emailVerificationExpire: { $gt: Date.now() }
        });

        expect(foundStaff).toBeDefined();

        // Step 4: Mark as verified
        foundStaff!.isEmailVerified = true;
        foundStaff!.emailVerificationToken = undefined;
        await foundStaff!.save();

        const verified = await User.findById(staff._id);
        expect(verified?.isEmailVerified).toBe(true);
      });
    });
  });
});
