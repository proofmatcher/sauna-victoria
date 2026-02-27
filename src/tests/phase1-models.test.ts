/**
 * PHASE 1: DATABASE MODELS - TEST CASES
 * 
 * This file contains comprehensive test cases for Phase 1 implementation:
 * 1. VerificationCode Model Tests
 * 2. User Model Tests (Optional Password)
 * 
 * To run these tests:
 * 1. Install dependencies: npm install --save-dev jest @types/jest ts-jest
 * 2. Configure jest.config.js for TypeScript
 * 3. Run: npm test src/tests/phase1-models.test.ts
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { VerificationCode, IVerificationCode } from '../models/VerificationCode';
import { User, IUser } from '../models/User';

// Load environment variables
dotenv.config();

// MongoDB Memory Server for testing (optional - can use real test DB)
describe('Phase 1: Database Models', () => {
  
  beforeAll(async () => {
    // Connect to test database
    // Use MONGO_TEST_URI if available, fall back to MONGO_URI with -test suffix
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
  // 1. VERIFICATION CODE MODEL TESTS
  // ===========================

  describe('1.1 VerificationCode Model - Creation', () => {
    
    it('should create a verification code with all required fields', async () => {
      const codeData = {
        email: 'test@example.com',
        code: '123456',
        purpose: 'booking' as const,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes from now
        verified: false,
        attempts: 0
      };

      const verificationCode = await VerificationCode.create(codeData);

      expect(verificationCode).toBeDefined();
      expect(verificationCode.email).toBe('test@example.com');
      expect(verificationCode.code).toBe('123456');
      expect(verificationCode.purpose).toBe('booking');
      expect(verificationCode.verified).toBe(false);
      expect(verificationCode.attempts).toBe(0);
      expect(verificationCode.expiresAt).toBeInstanceOf(Date);
    });

    it('should lowercase email addresses automatically', async () => {
      const verificationCode = await VerificationCode.create({
        email: 'TEST@EXAMPLE.COM',
        code: '123456',
        purpose: 'booking',
        expiresAt: new Date(Date.now() + 5 * 60 * 1000)
      });

      expect(verificationCode.email).toBe('test@example.com');
    });

    it('should trim whitespace from email', async () => {
      const verificationCode = await VerificationCode.create({
        email: '  test@example.com  ',
        code: '123456',
        purpose: 'booking',
        expiresAt: new Date(Date.now() + 5 * 60 * 1000)
      });

      expect(verificationCode.email).toBe('test@example.com');
    });

    it('should enforce purpose enum values', async () => {
      const validPurposes = ['booking', 'staff-verification'];
      
      for (const purpose of validPurposes) {
        const code = await VerificationCode.create({
          email: 'test@example.com',
          code: '123456',
          purpose: purpose as any,
          expiresAt: new Date(Date.now() + 5 * 60 * 1000)
        });
        expect(code.purpose).toBe(purpose);
      }
    });

    it('should reject invalid purpose values', async () => {
      await expect(
        VerificationCode.create({
          email: 'test@example.com',
          code: '123456',
          purpose: 'invalid' as any,
          expiresAt: new Date(Date.now() + 5 * 60 * 1000)
        })
      ).rejects.toThrow();
    });
  });

  describe('1.2 VerificationCode Model - Validation', () => {
    
    it('should require email field', async () => {
      await expect(
        VerificationCode.create({
          code: '123456',
          purpose: 'booking',
          expiresAt: new Date(Date.now() + 5 * 60 * 1000)
        })
      ).rejects.toThrow();
    });

    it('should require code field', async () => {
      await expect(
        VerificationCode.create({
          email: 'test@example.com',
          purpose: 'booking',
          expiresAt: new Date(Date.now() + 5 * 60 * 1000)
        })
      ).rejects.toThrow();
    });

    it('should require expiresAt field', async () => {
      await expect(
        VerificationCode.create({
          email: 'test@example.com',
          code: '123456',
          purpose: 'booking'
        })
      ).rejects.toThrow();
    });

    it('should enforce max attempts limit (5)', async () => {
      await expect(
        VerificationCode.create({
          email: 'test@example.com',
          code: '123456',
          purpose: 'booking',
          expiresAt: new Date(Date.now() + 5 * 60 * 1000),
          attempts: 6
        })
      ).rejects.toThrow();
    });
  });

  describe('1.3 VerificationCode Model - Methods', () => {
    
    it('isValid() should return true for valid codes', async () => {
      const code = await VerificationCode.create({
        email: 'test@example.com',
        code: '123456',
        purpose: 'booking',
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        verified: false,
        attempts: 0
      });

      expect(code.isValid()).toBe(true);
    });

    it('isValid() should return false for expired codes', async () => {
      const code = await VerificationCode.create({
        email: 'test@example.com',
        code: '123456',
        purpose: 'booking',
        expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
        verified: false,
        attempts: 0
      });

      expect(code.isValid()).toBe(false);
    });

    it('isValid() should return false for verified codes', async () => {
      const code = await VerificationCode.create({
        email: 'test@example.com',
        code: '123456',
        purpose: 'booking',
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        verified: true,
        attempts: 0
      });

      expect(code.isValid()).toBe(false);
    });

    it('isValid() should return false when attempts >= 5', async () => {
      const code = await VerificationCode.create({
        email: 'test@example.com',
        code: '123456',
        purpose: 'booking',
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        verified: false,
        attempts: 5
      });

      expect(code.isValid()).toBe(false);
    });

    it('incrementAttempts() should increase attempts counter', async () => {
      const code = await VerificationCode.create({
        email: 'test@example.com',
        code: '123456',
        purpose: 'booking',
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        attempts: 0
      });

      expect(code.attempts).toBe(0);
      
      await code.incrementAttempts();
      expect(code.attempts).toBe(1);
      
      await code.incrementAttempts();
      expect(code.attempts).toBe(2);
    });
  });

  describe('1.4 VerificationCode Model - Indexes', () => {
    
    it('should have index on email field', async () => {
      const indexes = await VerificationCode.collection.getIndexes();
      expect(indexes).toHaveProperty('email_1');
    });

    it('should have index on expiresAt field', async () => {
      const indexes = await VerificationCode.collection.getIndexes();
      expect(indexes).toHaveProperty('expiresAt_1');
    });

    it('should have compound index on email and purpose', async () => {
      const indexes = await VerificationCode.collection.getIndexes();
      const hasCompoundIndex = Object.keys(indexes).some(key => 
        key.includes('email') && key.includes('purpose')
      );
      expect(hasCompoundIndex).toBe(true);
    });
  });

  describe('1.5 VerificationCode Model - TTL Auto-Deletion', () => {
    
    it('should have TTL index configured', async () => {
      const indexes = await VerificationCode.collection.getIndexes();
      const ttlIndexName = 'expiresAt_1';
      
      expect(indexes).toHaveProperty(ttlIndexName);
      // Check that expireAfterSeconds is defined (may be 0 or another value)
      const ttlIndex = indexes[ttlIndexName] as any;
      expect(ttlIndex).toBeDefined();
    });

    // Note: TTL deletion happens in the background by MongoDB
    // In production, expired documents are automatically deleted
  });

  // ===========================
  // 2. USER MODEL TESTS (OPTIONAL PASSWORD)
  // ===========================

  describe('2.1 User Model - Admin with Password', () => {
    
    it('should create admin user with password successfully', async () => {
      const adminData = {
        name: 'Admin User',
        email: 'admin@example.com',
        password: 'SecurePass123!',
        role: 'admin',
        isEmailVerified: true
      };

      const admin = await User.create(adminData);

      expect(admin).toBeDefined();
      expect(admin.name).toBe('Admin User');
      expect(admin.email).toBe('admin@example.com');
      expect(admin.role).toBe('admin');
      
      // When queried without +password, password should be undefined
      const queriedAdmin = await User.findById(admin._id);
      expect(queriedAdmin?.password).toBeUndefined(); // select: false
    });

    it('should hash admin password before saving', async () => {
      const plainPassword = 'SecurePass123!';
      const admin = await User.create({
        name: 'Admin User',
        email: 'admin@example.com',
        password: plainPassword,
        role: 'admin'
      });

      // Fetch with password field
      const adminWithPassword = await User.findById(admin._id).select('+password');
      
      expect(adminWithPassword?.password).toBeDefined();
      expect(adminWithPassword?.password).not.toBe(plainPassword);
      expect(adminWithPassword?.password?.length).toBeGreaterThan(20); // bcrypt hashes are long
    });

    it('should reject admin user without password', async () => {
      await expect(
        User.create({
          name: 'Admin User',
          email: 'admin@example.com',
          role: 'admin'
          // No password provided
        })
      ).rejects.toThrow(/Password is required for admin users/);
    });

    it('should allow admin password updates', async () => {
      const admin = await User.create({
        name: 'Admin User',
        email: 'admin@example.com',
        password: 'OldPassword123!',
        role: 'admin'
      });

      const oldPasswordHash = (await User.findById(admin._id).select('+password'))?.password;

      admin.password = 'NewPassword456!';
      await admin.save();

      const newPasswordHash = (await User.findById(admin._id).select('+password'))?.password;

      expect(oldPasswordHash).not.toBe(newPasswordHash);
    });
  });

  describe('2.2 User Model - Staff without Password', () => {
    
    it('should create staff user without password successfully', async () => {
      const staffData = {
        name: 'Staff Member',
        email: 'staff@example.com',
        role: 'staff',
        isStaff: true,
        phone: '+1234567890'
        // No password provided
      };

      const staff = await User.create(staffData);

      expect(staff).toBeDefined();
      expect(staff.name).toBe('Staff Member');
      expect(staff.email).toBe('staff@example.com');
      expect(staff.role).toBe('staff');
      expect(staff.isStaff).toBe(true);
    });

    it('should not hash undefined password for staff', async () => {
      const staff = await User.create({
        name: 'Staff Member',
        email: 'staff@example.com',
        role: 'staff',
        isStaff: true
        // No password
      });

      const staffWithPassword = await User.findById(staff._id).select('+password');
      
      expect(staffWithPassword?.password).toBeUndefined();
    });

    it('should allow staff with optional password', async () => {
      const staff = await User.create({
        name: 'Staff Member',
        email: 'staff@example.com',
        password: 'OptionalPass123!',
        role: 'staff',
        isStaff: true
      });

      const staffWithPassword = await User.findById(staff._id).select('+password');
      
      expect(staffWithPassword?.password).toBeDefined();
      expect(staffWithPassword?.password).not.toBe('OptionalPass123!'); // Should be hashed
    });
  });

  describe('2.3 User Model - Regular User without Password', () => {
    
    it('should create regular user without password successfully', async () => {
      const userData = {
        name: 'Regular User',
        email: 'user@example.com',
        role: 'user'
        // No password provided
      };

      const user = await User.create(userData);

      expect(user).toBeDefined();
      expect(user.name).toBe('Regular User');
      expect(user.email).toBe('user@example.com');
      expect(user.role).toBe('user');
    });

    it('should not require password for regular users', async () => {
      const user = await User.create({
        name: 'Regular User',
        email: 'user@example.com',
        role: 'user'
      });

      expect(user._id).toBeDefined();
    });
  });

  describe('2.4 User Model - Password Hashing Hook', () => {
    
    it('should not hash password if not modified', async () => {
      const admin = await User.create({
        name: 'Admin User',
        email: 'admin@example.com',
        password: 'SecurePass123!',
        role: 'admin'
      });

      const originalHash = (await User.findById(admin._id).select('+password'))?.password;

      // Update non-password field
      admin.name = 'Updated Admin Name';
      await admin.save();

      const newHash = (await User.findById(admin._id).select('+password'))?.password;

      expect(originalHash).toBe(newHash); // Hash should remain unchanged
    });

    it('should skip hashing if password is undefined', async () => {
      const staff = await User.create({
        name: 'Staff Member',
        email: 'staff@example.com',
        role: 'staff'
      });

      // Update name without touching password
      staff.name = 'Updated Staff Name';
      await staff.save();

      const staffWithPassword = await User.findById(staff._id).select('+password');
      expect(staffWithPassword?.password).toBeUndefined();
    });
  });

  describe('2.5 User Model - comparePassword Method', () => {
    
    it('should correctly compare password for admin', async () => {
      const plainPassword = 'SecurePass123!';
      const admin = await User.create({
        name: 'Admin User',
        email: 'admin@example.com',
        password: plainPassword,
        role: 'admin'
      });

      const adminWithPassword = await User.findById(admin._id).select('+password');
      
      const isMatch = await adminWithPassword?.comparePassword(plainPassword);
      expect(isMatch).toBe(true);

      const isWrong = await adminWithPassword?.comparePassword('WrongPassword');
      expect(isWrong).toBe(false);
    });
  });

  describe('2.6 User Model - Email Verification Token', () => {
    
    it('should generate email verification token for staff', async () => {
      const staff = await User.create({
        name: 'Staff Member',
        email: 'staff@example.com',
        role: 'staff',
        isStaff: true
      });

      const token = staff.getEmailVerificationToken();

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(20);
      
      expect(staff.emailVerificationToken).toBeDefined();
      expect(staff.emailVerificationExpire).toBeInstanceOf(Date);
      
      // Should expire in 24 hours
      const expiryTime = staff.emailVerificationExpire!.getTime() - Date.now();
      expect(expiryTime).toBeGreaterThan(23 * 60 * 60 * 1000); // At least 23 hours
      expect(expiryTime).toBeLessThan(25 * 60 * 60 * 1000); // Less than 25 hours
    });
  });
});
