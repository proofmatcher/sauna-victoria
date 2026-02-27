/**
 * Create First Admin Script
 * 
 * Run this script ONCE when setting up a fresh database to create the initial admin account.
 * 
 * Usage:
 *   npm run create-admin
 * 
 * Or with custom credentials:
 *   ADMIN_NAME="John Admin" ADMIN_EMAIL="admin@example.com" ADMIN_PASSWORD="SecurePass123!" npm run create-admin
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { User } from '../models/User.js';
import readline from 'readline';

// Load environment variables
dotenv.config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query: string): Promise<string> => {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
};

const createFirstAdmin = async () => {
  try {
    // Connect to database
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      console.error('❌ MONGO_URI not found in environment variables');
      process.exit(1);
    }

    console.log('🔗 Connecting to database...');
    await mongoose.connect(mongoUri);
    console.log('✓ Connected to MongoDB\n');

    // Check if any admin already exists
    const adminCount = await User.countDocuments({ role: 'admin' });
    
    if (adminCount > 0) {
      console.log('⚠️  Admin account(s) already exist in the database.');
      const proceed = await question('Do you want to create another admin? (y/n): ');
      
      if (proceed.toLowerCase() !== 'y') {
        console.log('❌ Aborted. No admin created.');
        process.exit(0);
      }
    }

    // Get admin details from environment variables or prompt
    let name = process.env.ADMIN_NAME;
    let email = process.env.ADMIN_EMAIL;
    let password = process.env.ADMIN_PASSWORD;

    console.log('📝 Enter admin details:\n');

    if (!name) {
      name = await question('Admin Name: ');
    }

    if (!email) {
      email = await question('Admin Email: ');
    }

    if (!password) {
      // Mask password input (basic - won't show asterisks but won't echo)
      password = await question('Admin Password (min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special): ');
    }

    // Validate inputs
    if (!name || !email || !password) {
      console.error('❌ All fields are required');
      process.exit(1);
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.error('❌ Invalid email format');
      process.exit(1);
    }

    // Password validation
    if (password.length < 8) {
      console.error('❌ Password must be at least 8 characters long');
      process.exit(1);
    }
    if (!/[A-Z]/.test(password)) {
      console.error('❌ Password must contain at least one uppercase letter');
      process.exit(1);
    }
    if (!/[a-z]/.test(password)) {
      console.error('❌ Password must contain at least one lowercase letter');
      process.exit(1);
    }
    if (!/\d/.test(password)) {
      console.error('❌ Password must contain at least one number');
      process.exit(1);
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      console.error('❌ Password must contain at least one special character');
      process.exit(1);
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.error('❌ User with this email already exists');
      process.exit(1);
    }

    // Create admin
    console.log('\n🔐 Creating admin account...');
    const admin = await User.create({
      name,
      email,
      password, // Will be hashed by pre-save hook
      role: 'admin',
      isEmailVerified: true, // Auto-verify first admin
      isActive: true
    });

    console.log('\n✅ Admin account created successfully!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📧 Email: ${admin.email}`);
    console.log(`👤 Name: ${admin.name}`);
    console.log(`🔑 Role: ${admin.role}`);
    console.log(`✓  Email Verified: ${admin.isEmailVerified}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('🚀 You can now login at: POST /api/auth/login');
    console.log(`   Email: ${admin.email}`);
    console.log(`   Password: [the password you just entered]\n`);

  } catch (error: any) {
    console.error('❌ Error creating admin:', error.message);
    process.exit(1);
  } finally {
    rl.close();
    await mongoose.connection.close();
    process.exit(0);
  }
};

// Run the script
createFirstAdmin();
