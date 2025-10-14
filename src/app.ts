import express from "express";
import cors from 'cors';
import dotenv from 'dotenv';

import { connectDB } from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import vesselRoutes from './routes/vesselRoutes.js';
import tripRoutes from './routes/tripRoutes.js';
import publicRoutes from './routes/publicRoutes.js';
import bookingRoutes from "./routes/bookingRoutes.js";
import stripeRoutes from "./routes/stripeRoutes.js";


import { cleanupExpiredBookings } from "./cron/cleanupExpiredBookings.js"; // Import the cron job 

dotenv.config();

// Connect to database
connectDB(process.env.MONGO_URI || "mongodb://localhost:27017/sauna");

const app = express();
app.use(cors());

// Stripe webhook needs raw body, so register it BEFORE express.json()
app.use('/api/stripe', stripeRoutes);

// JSON body parser for other routes
app.use(express.json());

cleanupExpiredBookings(); // Start the cron job

app.use('/api/auth', authRoutes);
app.use('/api/vessels', vesselRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/bookings', bookingRoutes);

app.get('/', (req, res) => {
  res.send('Welcome to the Sauna Boat API');
});

export default app;