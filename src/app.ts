import dotenv from 'dotenv';

// Load environment variables FIRST before any other imports
dotenv.config();

import express from "express";
import cors from 'cors';

import { connectDB } from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import guestAuthRoutes from './routes/guestAuthRoutes.js';
import staffRoutes from './routes/staffRoutes.js';
import vesselRoutes from './routes/vesselRoutes.js';
import tripRoutes from './routes/tripRoutes.js';
import publicRoutes from './routes/publicRoutes.js';
import bookingRoutes from "./routes/bookingRoutes.js";
import stripeRoutes from "./routes/stripeRoutes.js";
import adminBookingRoutes from "./routes/adminBookingRoutes.js";
import adminDashboardRoutes from "./routes/adminDashboardRoutes.js";
import adminUserRoutes from "./routes/adminUserRoutes.js";
import adminServicePostRoutes from "./routes/adminServicePostRoutes.js";
import adminMobileSaunaRoutes from "./routes/adminMobileSaunaRoutes.js";
import publicServicePostRoutes from "./routes/publicServicePostRoutes.js";
import agreementRoutes from "./routes/agreementRoutes.js";
import adminDepositRoutes from "./routes/adminDepositRoutes.js";
import contactRoutes from "./routes/contactRoutes.js";

import { cleanupExpiredBookings } from "./cron/cleanupExpiredBookings.js"; // Import the cron job
import { scheduleDepositRefunds } from "./cron/refundExpiredDeposits.js"; // Import deposit refund cron job

// Connect to database
connectDB(process.env.MONGO_URI || "mongodb://localhost:27017/sauna");

const app = express();

// Configure CORS for production
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? [process.env.FRONTEND_URL || 'https://your-frontend-domain.vercel.app']
    : ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

// Stripe webhook needs raw body, so register it BEFORE express.json()
app.use('/api/stripe', stripeRoutes);

// JSON body parser for ALL other routes
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Also parse URL-encoded bodies

cleanupExpiredBookings(); // Start the cron job
scheduleDepositRefunds(); // Start deposit refund cron job

// Authentication routes
app.use('/api/auth', authRoutes);
app.use('/api/guest', guestAuthRoutes); // Guest OTP authentication
app.use('/api/staff', staffRoutes); // Staff management (admin + public verification)

// Resource routes
app.use('/api/vessels', vesselRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/admin/bookings', adminBookingRoutes);
app.use('/api/admin/dashboard', adminDashboardRoutes);
app.use('/api/admin/users', adminUserRoutes);
app.use('/api/admin/posts', adminServicePostRoutes);
app.use('/api/admin/mobile-saunas', adminMobileSaunaRoutes);
app.use('/api/services', publicServicePostRoutes);
app.use('/api/agreement', agreementRoutes);
app.use('/api/admin/bookings', adminDepositRoutes); // Deposit management routes
app.use('/api/contact', contactRoutes); // Contact form routes

app.get('/', (req, res) => {
  res.send('Welcome to the Sauna Boat API V4.2');
});

export default app;