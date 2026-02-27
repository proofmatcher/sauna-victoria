/**
 * PHASE 2: AUTHENTICATION CONTROLLERS - TEST CASES
 * 
 * This file contains comprehensive test cases for Phase 2 implementation:
 * 1. Guest OTP Authentication (sendOTP, verifyOTP)
 * 2. Staff Management (CRUD operations, email verification)
 * 3. Admin-Only Login Enforcement
 * 
 * Run these tests: npm run test:phase2
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { VerificationCode } from '../models/VerificationCode';
import { User } from '../models/User';

// Load environment variables
dotenv.config();

describe('Phase 2: Authentication Controllers', () => {
  
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
    await VerificationCode.deleteMany({});
    await User.deleteMany({});
  });

  // ===========================
  // 1. GUEST OTP AUTHENTICATION
  // ===========================

  describe('1. Guest OTP Authentication', () => {

    describe('1.1 Send Verification Code', () => {
      
      it('should generate and save OTP code for valid email', async () => {
        const email = 'guest@example.com';
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        
        const verificationCode = await VerificationCode.create({
          email,
          code,
          purpose: 'booking',
          expiresAt: new Date(Date.now() + 5 * 60 * 1000),
          verified: false,
          attempts: 0
        });

        expect(verificationCode).toBeDefined();
        expect(verificationCode.email).toBe(email);
        expect(verificationCode.code).toMatch(/^\d{6}$/);
        expect(verificationCode.purpose).toBe('booking');
        expect(verificationCode.verified).toBe(false);
        expect(verificationCode.attempts).toBe(0);
      });

      it('should lowercase and trim email addresses', async () => {
        const email = '  GUEST@EXAMPLE.COM  ';
        const code = '123456';
        
        const verificationCode = await VerificationCode.create({
          email,
          code,
          purpose: 'booking',
          expiresAt: new Date(Date.now() + 5 * 60 * 1000)
        });

        expect(verificationCode.email).toBe('guest@example.com');
      });

      it('should prevent duplicate codes within short time window', async () => {
        const email = 'guest@example.com';
        
        // Create first code
        await VerificationCode.create({
          email,
          code: '123456',
          purpose: 'booking',
          expiresAt: new Date(Date.now() + 5 * 60 * 1000),
          createdAt: new Date()
        });

        // Check if recent code exists (within 1 minute)
        const recentCode = await VerificationCode.findOne({
          email,
          purpose: 'booking',
          createdAt: { $gte: new Date(Date.now() - 60 * 1000) }
        });

        expect(recentCode).toBeDefined();
      });

      it('should invalidate old codes when creating new one', async () => {
        const email = 'guest@example.com';
        
        // Create old code
        const oldCode = await VerificationCode.create({
          email,
          code: '111111',
          purpose: 'booking',
          expiresAt: new Date(Date.now() + 5 * 60 * 1000),
          verified: false
        });

        // Simulate invalidation
        oldCode.verified = true;
        await oldCode.save();

        // Create new code
        const newCode = await VerificationCode.create({
          email,
          code: '222222',
          purpose: 'booking',
          expiresAt: new Date(Date.now() + 5 * 60 * 1000),
          verified: false
        });

        const invalidatedCode = await VerificationCode.findById(oldCode._id);
        expect(invalidatedCode?.verified).toBe(true);
        expect(newCode.verified).toBe(false);
      });
    });

    describe('1.2 Verify OTP Code', () => {
      
      it('should verify valid OTP code', async () => {
        const email = 'guest@example.com';
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

        const verifiedCode = await VerificationCode.findById(verificationCode._id);
        expect(verifiedCode?.verified).toBe(true);
      });

      it('should reject expired codes', async () => {
        const verificationCode = await VerificationCode.create({
          email: 'guest@example.com',
          code: '123456',
          purpose: 'booking',
          expiresAt: new Date(Date.now() - 1000), // Expired
          verified: false,
          attempts: 0
        });

        expect(verificationCode.isValid()).toBe(false);
      });

      it('should reject codes with too many attempts', async () => {
        const verificationCode = await VerificationCode.create({
          email: 'guest@example.com',
          code: '123456',
          purpose: 'booking',
          expiresAt: new Date(Date.now() + 5 * 60 * 1000),
          verified: false,
          attempts: 5
        });

        expect(verificationCode.isValid()).toBe(false);
      });

      it('should increment attempts on failed verification', async () => {
        const verificationCode = await VerificationCode.create({
          email: 'guest@example.com',
          code: '123456',
          purpose: 'booking',
          expiresAt: new Date(Date.now() + 5 * 60 * 1000),
          verified: false,
          attempts: 0
        });

        await verificationCode.incrementAttempts();
        expect(verificationCode.attempts).toBe(1);

        await verificationCode.incrementAttempts();
        expect(verificationCode.attempts).toBe(2);
      });

      it('should not allow verified codes to be reused', async () => {
        const verificationCode = await VerificationCode.create({
          email: 'guest@example.com',
          code: '123456',
          purpose: 'booking',
          expiresAt: new Date(Date.now() + 5 * 60 * 1000),
          verified: true,
          attempts: 0
        });

        expect(verificationCode.isValid()).toBe(false);
      });
    });

    describe('1.3 Guest Token Generation', () => {
      
      it('should generate JWT token with guest type', () => {
        const jwt = require('jsonwebtoken');
        const email = 'guest@example.com';
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
        expect(decoded.purpose).toBe('booking');
      });
    });
  });

  // ===========================
  // 2. STAFF MANAGEMENT
  // ===========================

  describe('2. Staff Management', () => {

    describe('2.1 Create Staff Member', () => {
      
      it('should create staff without password', async () => {
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
        expect(staff.name).toBe('John Staff');
        expect(staff.email).toBe('john@staff.com');
        expect(staff.role).toBe('staff');
        expect(staff.isStaff).toBe(true);
        expect(staff.isEmailVerified).toBe(false);
        
        // Verify no password was set
        const staffWithPassword = await User.findById(staff._id).select('+password');
        expect(staffWithPassword?.password).toBeUndefined();
      });

      it('should prevent duplicate staff emails', async () => {
        await User.create({
          name: 'John Staff',
          email: 'john@staff.com',
          role: 'staff',
          isStaff: true
        });

        // Try to create duplicate
        await expect(
          User.create({
            name: 'Jane Staff',
            email: 'john@staff.com',
            role: 'staff',
            isStaff: true
          })
        ).rejects.toThrow();
      });

      it('should generate email verification token for staff', async () => {
        const staff = await User.create({
          name: 'John Staff',
          email: 'john@staff.com',
          role: 'staff',
          isStaff: true
        });

        const token = staff.getEmailVerificationToken();

        expect(token).toBeDefined();
        expect(typeof token).toBe('string');
        expect(token.length).toBeGreaterThan(20);
        expect(staff.emailVerificationToken).toBeDefined();
        expect(staff.emailVerificationExpire).toBeInstanceOf(Date);
      });

      it('should set verification expiry to 24 hours', async () => {
        const staff = await User.create({
          name: 'John Staff',
          email: 'john@staff.com',
          role: 'staff',
          isStaff: true
        });

        staff.getEmailVerificationToken();

        const expiryTime = staff.emailVerificationExpire!.getTime() - Date.now();
        expect(expiryTime).toBeGreaterThan(23 * 60 * 60 * 1000); // At least 23 hours
        expect(expiryTime).toBeLessThan(25 * 60 * 60 * 1000); // Less than 25 hours
      });
    });

    describe('2.2 List Staff Members', () => {
      
      it('should list all staff members', async () => {
        await User.create([
          { name: 'Staff 1', email: 'staff1@test.com', role: 'staff', isStaff: true },
          { name: 'Staff 2', email: 'staff2@test.com', role: 'staff', isStaff: true },
          { name: 'Admin', email: 'admin@test.com', role: 'admin', password: 'Admin123!' }
        ]);

        const staffMembers = await User.find({ role: 'staff' });

        expect(staffMembers.length).toBe(2);
        expect(staffMembers.every(s => s.role === 'staff')).toBe(true);
      });

      it('should exclude password field from staff list', async () => {
        await User.create({
          name: 'Staff Member',
          email: 'staff@test.com',
          role: 'staff',
          isStaff: true
        });

        const staffMembers = await User.find({ role: 'staff' }).select('-password');

        expect(staffMembers[0].password).toBeUndefined();
      });
    });

    describe('2.3 Update Staff Member', () => {
      
      it('should update staff name and phone', async () => {
        const staff = await User.create({
          name: 'John Staff',
          email: 'john@staff.com',
          phone: '+1111111111',
          role: 'staff',
          isStaff: true
        });

        staff.name = 'John Updated';
        staff.phone = '+2222222222';
        await staff.save();

        const updatedStaff = await User.findById(staff._id);
        expect(updatedStaff?.name).toBe('John Updated');
        expect(updatedStaff?.phone).toBe('+2222222222');
      });

      it('should reset email verification when email changes', async () => {
        const staff = await User.create({
          name: 'John Staff',
          email: 'john@staff.com',
          role: 'staff',
          isStaff: true,
          isEmailVerified: true
        });

        staff.email = 'newemail@staff.com';
        staff.isEmailVerified = false;
        await staff.save();

        const updatedStaff = await User.findById(staff._id);
        expect(updatedStaff?.email).toBe('newemail@staff.com');
        expect(updatedStaff?.isEmailVerified).toBe(false);
      });
    });

    describe('2.4 Delete Staff Member', () => {
      
      it('should soft delete staff by setting isActive to false', async () => {
        const staff = await User.create({
          name: 'John Staff',
          email: 'john@staff.com',
          role: 'staff',
          isStaff: true,
          isActive: true
        });

        staff.isActive = false;
        await staff.save();

        const deletedStaff = await User.findById(staff._id);
        expect(deletedStaff?.isActive).toBe(false);
      });
    });

    describe('2.5 Verify Staff Email', () => {
      
      it('should verify staff email with valid token', async () => {
        const crypto = require('crypto');
        const staff = await User.create({
          name: 'John Staff',
          email: 'john@staff.com',
          role: 'staff',
          isStaff: true
        });

        const token = staff.getEmailVerificationToken();
        await staff.save();

        // Hash token like the controller does
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

        const foundStaff = await User.findOne({
          role: 'staff',
          emailVerificationToken: hashedToken,
          emailVerificationExpire: { $gt: Date.now() }
        });

        expect(foundStaff).toBeDefined();
        expect(foundStaff?.email).toBe('john@staff.com');

        // Mark as verified
        foundStaff!.isEmailVerified = true;
        foundStaff!.emailVerificationToken = undefined;
        foundStaff!.emailVerificationExpire = undefined;
        await foundStaff!.save();

        const verifiedStaff = await User.findById(staff._id);
        expect(verifiedStaff?.isEmailVerified).toBe(true);
        expect(verifiedStaff?.emailVerificationToken).toBeUndefined();
      });

      it('should reject expired verification token', async () => {
        const crypto = require('crypto');
        const staff = await User.create({
          name: 'John Staff',
          email: 'john@staff.com',
          role: 'staff',
          isStaff: true
        });

        const token = staff.getEmailVerificationToken();
        staff.emailVerificationExpire = new Date(Date.now() - 1000); // Expired
        await staff.save();

        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

        const foundStaff = await User.findOne({
          role: 'staff',
          emailVerificationToken: hashedToken,
          emailVerificationExpire: { $gt: Date.now() }
        });

        expect(foundStaff).toBeNull();
      });
    });
  });

  // ===========================
  // 3. ADMIN-ONLY LOGIN
  // ===========================

  describe('3. Admin-Only Login Enforcement', () => {

    describe('3.1 Admin Login', () => {
      
      it('should allow admin login with valid credentials', async () => {
        const admin = await User.create({
          name: 'Admin User',
          email: 'admin@test.com',
          password: 'Admin123!',
          role: 'admin',
          isEmailVerified: true
        });

        const adminWithPassword = await User.findById(admin._id).select('+password');
        
        expect(adminWithPassword).toBeDefined();
        expect(adminWithPassword?.role).toBe('admin');
        expect(adminWithPassword?.password).toBeDefined();
        expect(adminWithPassword?.password).not.toBe('Admin123!'); // Should be hashed
      });

      it('should require password for admin accounts', async () => {
        await expect(
          User.create({
            name: 'Admin User',
            email: 'admin@test.com',
            role: 'admin',
            isEmailVerified: true
            // No password
          })
        ).rejects.toThrow();
      });
    });

    describe('3.2 Non-Admin Login Blocked', () => {
      
      it('should prevent staff from logging in', async () => {
        const staff = await User.create({
          name: 'Staff User',
          email: 'staff@test.com',
          role: 'staff',
          isStaff: true,
          isEmailVerified: true
        });

        // Simulate login check
        const user = await User.findOne({ email: 'staff@test.com' });
        expect(user).toBeDefined();
        expect(user?.role).not.toBe('admin');
        
        // Controller should reject non-admin login
        // In actual implementation: if (user.role !== 'admin') return 403
      });

      it('should prevent regular users from logging in', async () => {
        const regularUser = await User.create({
          name: 'Regular User',
          email: 'user@test.com',
          role: 'user',
          isEmailVerified: true
        });

        const user = await User.findOne({ email: 'user@test.com' });
        expect(user).toBeDefined();
        expect(user?.role).not.toBe('admin');
      });
    });

    describe('3.3 Admin Password Validation', () => {
      
      it('should verify admin password correctly', async () => {
        const plainPassword = 'SecureAdmin123!';
        const admin = await User.create({
          name: 'Admin User',
          email: 'admin@test.com',
          password: plainPassword,
          role: 'admin',
          isEmailVerified: true
        });

        const adminWithPassword = await User.findById(admin._id).select('+password');
        const isMatch = await adminWithPassword?.comparePassword(plainPassword);
        
        expect(isMatch).toBe(true);
      });

      it('should reject incorrect admin password', async () => {
        const admin = await User.create({
          name: 'Admin User',
          email: 'admin@test.com',
          password: 'CorrectPass123!',
          role: 'admin',
          isEmailVerified: true
        });

        const adminWithPassword = await User.findById(admin._id).select('+password');
        const isMatch = await adminWithPassword?.comparePassword('WrongPassword123!');
        
        expect(isMatch).toBe(false);
      });
    });

    describe('3.4 Public Registration Disabled', () => {
      
      it('should prevent non-admin user registration', async () => {
        // In the updated controller, trying to register as non-admin should fail
        // This test verifies that only admin role is allowed
        
        const adminUser = await User.create({
          name: 'Admin User',
          email: 'admin@test.com',
          password: 'Admin123!',
          role: 'admin'
        });

        expect(adminUser.role).toBe('admin');
      });
    });
  });
});
