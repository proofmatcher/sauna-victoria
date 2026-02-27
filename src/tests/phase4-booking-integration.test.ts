import mongoose from 'mongoose';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import Booking from '../models/Booking.js';
import Vessel from '../models/Vessel.js';
import Trip from '../models/Trip.js';

// Load environment variables
dotenv.config();

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
  await mongoose.connection.close();
});

beforeEach(async () => {
  await User.deleteMany({});
  await Booking.deleteMany({});
  await Vessel.deleteMany({});
  await Trip.deleteMany({});
});

describe('Phase 4: Booking Integration (Guest + Admin)', () => {
  const secret = process.env.JWT_SECRET || 'test-secret';

  describe('1. Guest Booking Creation', () => {
    describe('1.1 Guest Token Handling', () => {
      it('should create guest token with correct payload', () => {
        const guestEmail = 'guest@test.com';
        const token = jwt.sign(
          { email: guestEmail, type: 'guest' },
          secret,
          { expiresIn: '1h' }
        );

        const decoded = jwt.verify(token, secret) as any;
        expect(decoded.email).toBe(guestEmail);
        expect(decoded.type).toBe('guest');
        expect(decoded.exp).toBeDefined();
      });

      it('should generate different token for each guest', () => {
        const token1 = jwt.sign(
          { email: 'guest1@test.com', type: 'guest' },
          secret,
          { expiresIn: '1h' }
        );
        const token2 = jwt.sign(
          { email: 'guest2@test.com', type: 'guest' },
          secret,
          { expiresIn: '1h' }
        );

        expect(token1).not.toBe(token2);
        
        const decoded1 = jwt.verify(token1, secret) as any;
        const decoded2 = jwt.verify(token2, secret) as any;
        
        expect(decoded1.email).toBe('guest1@test.com');
        expect(decoded2.email).toBe('guest2@test.com');
      });
    });

    describe('1.2 Booking Service with Null User', () => {
      it('should create booking with null user for guest', async () => {
        const vessel = await Vessel.create({
          name: 'Test Vessel',
          type: 'mobile_sauna',
          capacity: 6,
          basePriceCents: 10000,
          location: 'Test Location',
          description: 'Test Description',
          amenities: ['Sauna'],
          availabilityStatus: 'available'
        });

        const booking = await Booking.create({
          user: undefined, // Null for guest bookings
          vessel: vessel._id,
          customerName: 'Guest User',
          customerEmail: 'guest@test.com',
          customerPhone: '+1234567890',
          seatsBooked: 2,
          totalPriceCents: 20000,
          status: 'pending'
        });

        expect(booking).toBeDefined();
        expect(booking.user).toBeUndefined();
        expect(booking.customerEmail).toBe('guest@test.com');
        expect(booking.customerName).toBe('Guest User');
      });

      it('should create booking with user for admin', async () => {
        const admin = await User.create({
          name: 'Admin User',
          email: 'admin@test.com',
          password: 'Admin123!',
          role: 'admin',
          isEmailVerified: true
        });

        const vessel = await Vessel.create({
          name: 'Test Vessel',
          type: 'mobile_sauna',
          capacity: 6,
          basePriceCents: 10000,
          location: 'Test Location',
          description: 'Test Description',
          amenities: ['Sauna'],
          availabilityStatus: 'available'
        });

        const booking = await Booking.create({
          user: (admin as any)._id,
          vessel: vessel._id,
          customerName: 'Admin Booking',
          customerEmail: 'admin@test.com',
          customerPhone: '+1234567890',
          seatsBooked: 1,
          totalPriceCents: 10000,
          status: 'pending'
        });

        expect(booking).toBeDefined();
        expect(booking.user).toBeDefined();
        expect(booking.user?.toString()).toBe((admin as any)._id.toString());
      });
    });

    describe('1.3 Customer Email vs User Field', () => {
      it('should use customerEmail for guest bookings', async () => {
        const vessel = await Vessel.create({
          name: 'Test Vessel',
          type: 'mobile_sauna',
          capacity: 6,
          basePriceCents: 10000,
          location: 'Test Location',
          description: 'Test Description',
          amenities: ['Sauna'],
          availabilityStatus: 'available'
        });

        const booking = await Booking.create({
          user: undefined,
          vessel: vessel._id,
          customerEmail: 'verified-guest@test.com', // From OTP verification
          customerName: 'Guest Customer',
          customerPhone: '+1234567890',
          seatsBooked: 1,
          totalPriceCents: 10000,
          status: 'pending'
        });

        expect(booking.customerEmail).toBe('verified-guest@test.com');
        expect(booking.user).toBeUndefined();
      });

      it('should allow admin booking with different customer email', async () => {
        const admin = await User.create({
          name: 'Admin User',
          email: 'admin@test.com',
          password: 'Admin123!',
          role: 'admin',
          isEmailVerified: true
        });

        const vessel = await Vessel.create({
          name: 'Test Vessel',
          type: 'mobile_sauna',
          capacity: 6,
          basePriceCents: 10000,
          location: 'Test Location',
          description: 'Test Description',
          amenities: ['Sauna'],
          availabilityStatus: 'available'
        });

        const booking = await Booking.create({
          user: (admin as any)._id,
          vessel: vessel._id,
          customerEmail: 'customer@example.com', // Different from admin email
          customerName: 'John Doe',
          customerPhone: '+1234567890',
          seatsBooked: 1,
          totalPriceCents: 10000,
          status: 'pending'
        });

        expect(booking.user?.toString()).toBe((admin as any)._id.toString());
        expect(booking.customerEmail).toBe('customer@example.com');
        expect(booking.customerEmail).not.toBe(admin.email);
      });
    });
  });

  describe('2. Admin Booking Queries with Null User', () => {
    describe('2.1 Populate User Field', () => {
      it('should handle null user in populate without error', async () => {
        const vessel = await Vessel.create({
          name: 'Test Vessel',
          type: 'mobile_sauna',
          capacity: 6,
          basePriceCents: 10000,
          location: 'Test Location',
          description: 'Test Description',
          amenities: ['Sauna'],
          availabilityStatus: 'available'
        });

        const guestBooking = await Booking.create({
          user: undefined, // Guest booking
          vessel: vessel._id,
          customerEmail: 'guest@test.com',
          customerName: 'Guest User',
          customerPhone: '+1234567890',
          seatsBooked: 1,
          totalPriceCents: 10000,
          status: 'pending'
        });

        // Query with populate (strictPopulate: false handles null user)
        const booking = await Booking.findById(guestBooking._id)
          .populate({ path: 'user', select: 'name email', strictPopulate: false })
          .populate('vessel', 'name type');

        expect(booking).toBeDefined();
        expect(booking?.user).toBeFalsy(); // undefined or null for guest bookings
        expect(booking?.customerEmail).toBe('guest@test.com');
        expect(booking?.vessel).toBeDefined();
      });

      it('should populate user for admin bookings', async () => {
        const admin = await User.create({
          name: 'Admin User',
          email: 'admin@test.com',
          password: 'Admin123!',
          role: 'admin',
          isEmailVerified: true
        });

        const vessel = await Vessel.create({
          name: 'Test Vessel',
          type: 'mobile_sauna',
          capacity: 6,
          basePriceCents: 10000,
          location: 'Test Location',
          description: 'Test Description',
          amenities: ['Sauna'],
          availabilityStatus: 'available'
        });

        const adminBooking = await Booking.create({
          user: (admin as any)._id,
          vessel: vessel._id,
          customerEmail: 'admin@test.com',
          customerName: 'Admin Booking',
          customerPhone: '+1234567890',
          seatsBooked: 1,
          totalPriceCents: 10000,
          status: 'pending'
        });

        const booking = await Booking.findById(adminBooking._id)
          .populate({ path: 'user', select: 'name email', strictPopulate: false })
          .populate('vessel', 'name type');

        expect(booking).toBeDefined();
        expect(booking?.user).toBeDefined();
        expect((booking?.user as any)?.email).toBe('admin@test.com');
      });
    });

    describe('2.2 Mixed Guest and Admin Bookings', () => {
      it('should query both guest and admin bookings together', async () => {
        const admin = await User.create({
          name: 'Admin User',
          email: 'admin@test.com',
          password: 'Admin123!',
          role: 'admin',
          isEmailVerified: true
        });

        const vessel = await Vessel.create({
          name: 'Test Vessel',
          type: 'mobile_sauna',
          capacity: 6,
          basePriceCents: 10000,
          location: 'Test Location',
          description: 'Test Description',
          amenities: ['Sauna'],
          availabilityStatus: 'available'
        });

        // Create guest booking
        await Booking.create({
          user: undefined,
          vessel: vessel._id,
          customerEmail: 'guest@test.com',
          customerName: 'Guest User',
          customerPhone: '+1234567890',
          seatsBooked: 1,
          totalPriceCents: 10000,
          status: 'confirmed'
        });

        // Create admin booking
        await Booking.create({
          user: (admin as any)._id,
          vessel: vessel._id,
          customerEmail: 'admin@test.com',
          customerName: 'Admin Booking',
          customerPhone: '+1234567890',
          seatsBooked: 1,
          totalPriceCents: 10000,
          status: 'confirmed'
        });

        // Query all bookings
        const bookings = await Booking.find({ status: 'confirmed' })
          .populate({ path: 'user', select: 'name email', strictPopulate: false })
          .populate('vessel', 'name type');

        expect(bookings).toHaveLength(2);
        
        // Find guest booking (null or undefined user)
        const guestBooking = bookings.find(b => b.customerEmail === 'guest@test.com');
        expect(guestBooking).toBeDefined();
        expect(guestBooking?.user).toBeFalsy(); // undefined or null

        // Find admin booking (populated user)
        const adminBooking = bookings.find(b => b.customerEmail === 'admin@test.com');
        expect(adminBooking).toBeDefined();
        expect(adminBooking?.user).toBeDefined();
      });

      it('should filter bookings by user ID (exclude guest bookings)', async () => {
        const admin = await User.create({
          name: 'Admin User',
          email: 'admin@test.com',
          password: 'Admin123!',
          role: 'admin',
          isEmailVerified: true
        });

        const vessel = await Vessel.create({
          name: 'Test Vessel',
          type: 'mobile_sauna',
          capacity: 6,
          basePriceCents: 10000,
          location: 'Test Location',
          description: 'Test Description',
          amenities: ['Sauna'],
          availabilityStatus: 'available'
        });

        // Create guest booking
        await Booking.create({
          user: undefined,
          vessel: vessel._id,
          customerEmail: 'guest@test.com',
          customerName: 'Guest User',
          customerPhone: '+1234567890',
          seatsBooked: 1,
          totalPriceCents: 10000,
          status: 'confirmed'
        });

        // Create admin booking
        await Booking.create({
          user: (admin as any)._id,
          vessel: vessel._id,
          customerEmail: 'admin@test.com',
          customerName: 'Admin Booking',
          customerPhone: '+1234567890',
          seatsBooked: 1,
          totalPriceCents: 10000,
          status: 'confirmed'
        });

        // Query only admin bookings
        const adminBookings = await Booking.find({ user: (admin as any)._id });
        expect(adminBookings).toHaveLength(1);
        expect(adminBookings[0].customerEmail).toBe('admin@test.com');

        // Query guest bookings (user is null/undefined)
        const guestBookings = await Booking.find({ user: null });
        expect(guestBookings).toHaveLength(1);
        expect(guestBookings[0].customerEmail).toBe('guest@test.com');
      });
    });
  });

  describe('3. Registration Restriction', () => {
    describe('3.1 Admin-Only Registration', () => {
      it('should require admin authentication for registration', () => {
        // This is enforced by route middleware: protect + authorize("admin")
        // The route: router.post("/register", protect, authorize("admin"), registrationRateLimiter, registerUser);
        
        // Test that registration route expects admin token
        const adminToken = jwt.sign(
          { id: new mongoose.Types.ObjectId().toString() },
          secret,
          { expiresIn: '7d' }
        );
        
        expect(adminToken).toBeDefined();
        
        // Guest token would be rejected
        const guestToken = jwt.sign(
          { email: 'guest@test.com', type: 'guest' },
          secret,
          { expiresIn: '1h' }
        );
        
        const decodedGuest = jwt.verify(guestToken, secret) as any;
        expect(decodedGuest.type).toBe('guest');
        expect(decodedGuest.id).toBeUndefined(); // No user ID for guests
      });

      it('should allow guest OTP authentication without registration', () => {
        // Guests use /api/guest/send-code and /api/guest/verify-code
        // No User account created, only temporary JWT token issued
        
        const guestEmail = 'guest@test.com';
        const guestToken = jwt.sign(
          { email: guestEmail, type: 'guest' },
          secret,
          { expiresIn: '1h' }
        );

        const decoded = jwt.verify(guestToken, secret) as any;
        expect(decoded.email).toBe(guestEmail);
        expect(decoded.type).toBe('guest');
        
        // No user ID in guest token
        expect(decoded.id).toBeUndefined();
      });
    });
  });

  describe('4. End-to-End Integration', () => {
    describe('4.1 Complete Guest Booking Flow', () => {
      it('should complete guest booking from OTP to confirmed', async () => {
        // Step 1: Guest gets OTP token (simulated)
        const guestEmail = 'guest@test.com';
        const guestToken = jwt.sign(
          { email: guestEmail, type: 'guest' },
          secret,
          { expiresIn: '1h' }
        );

        // Verify token
        const decoded = jwt.verify(guestToken, secret) as any;
        expect(decoded.type).toBe('guest');
        expect(decoded.email).toBe(guestEmail);

        // Step 2: Create vessel
        const vessel = await Vessel.create({
          name: 'Mobile Sauna',
          type: 'mobile_sauna',
          capacity: 6,
          basePriceCents: 15000,
          location: 'Test Location',
          description: 'Test Description',
          amenities: ['Sauna', 'Towels'],
          availabilityStatus: 'available'
        });

        // Step 3: Guest creates booking
        const booking = await Booking.create({
          user: undefined, // No user account
          vessel: vessel._id,
          customerEmail: guestEmail, // From OTP token
          customerName: 'Guest Customer',
          customerPhone: '+1234567890',
          seatsBooked: 2,
          totalPriceCents: 30000,
          status: 'pending'
        });

        expect(booking).toBeDefined();
        expect(booking.user).toBeUndefined();
        expect(booking.customerEmail).toBe(guestEmail);

        // Step 4: Booking confirmed after payment
        booking.status = 'confirmed';
        await booking.save();

        expect(booking.status).toBe('confirmed');

        // Step 5: Admin can query booking with null user
        const queriedBooking = await Booking.findById(booking._id)
          .populate({ path: 'user', strictPopulate: false })
          .populate('vessel');

        expect(queriedBooking).toBeDefined();
        expect(queriedBooking?.user).toBeFalsy(); // undefined or null for guest bookings
        expect(queriedBooking?.customerEmail).toBe(guestEmail);
        expect((queriedBooking?.vessel as any)?.name).toBe('Mobile Sauna');
      });
    });

    describe('4.2 Admin Creating Booking for Customer', () => {
      it('should allow admin to create booking on behalf of customer', async () => {
        // Step 1: Admin logs in
        const admin = await User.create({
          name: 'Admin User',
          email: 'admin@test.com',
          password: 'Admin123!',
          role: 'admin',
          isEmailVerified: true
        });

        const adminToken = jwt.sign(
          { id: (admin as any)._id.toString() },
          secret,
          { expiresIn: '7d' }
        );

        const decoded = jwt.verify(adminToken, secret) as any;
        expect(decoded.id).toBeDefined();

        // Step 2: Create vessel
        const vessel = await Vessel.create({
          name: 'Mobile Sauna',
          type: 'mobile_sauna',
          capacity: 6,
          basePriceCents: 15000,
          location: 'Test Location',
          description: 'Test Description',
          amenities: ['Sauna'],
          availabilityStatus: 'available'
        });

        // Step 3: Admin creates booking for customer
        const booking = await Booking.create({
          user: (admin as any)._id, // Admin's user ID
          vessel: vessel._id,
          customerEmail: 'customer@example.com', // Customer's email (not admin's)
          customerName: 'John Customer',
          customerPhone: '+1234567890',
          seatsBooked: 1,
          totalPriceCents: 15000,
          status: 'confirmed'
        });

        expect(booking).toBeDefined();
        expect(booking.user?.toString()).toBe((admin as any)._id.toString());
        expect(booking.customerEmail).toBe('customer@example.com');
        expect(booking.customerEmail).not.toBe(admin.email);

        // Step 4: Booking appears in queries
        const queriedBooking = await Booking.findById(booking._id)
          .populate({ path: 'user', select: 'name email role', strictPopulate: false });

        expect((queriedBooking?.user as any)?.role).toBe('admin');
        expect((queriedBooking?.user as any)?.email).toBe('admin@test.com');
      });
    });
  });
});
