import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Database Schema Checker
 * 
 * This script analyzes your current MongoDB Atlas database
 * and identifies missing fields that need to be migrated.
 */

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('❌ Error: MONGO_URI not found in environment variables');
  process.exit(1);
}

// Capture as a non-optional string for use inside functions.
const mongoUri: string = MONGO_URI;

async function connectToDatabase() {
  try {
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB Atlas');

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('MongoDB connection established, but db handle is null');
    }

    return db;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

async function checkCollection(db: any, collectionName: string, expectedFields: string[]) {
  console.log(`\n📋 Checking ${collectionName} collection...`);
  
  const collection = db.collection(collectionName);
  const count = await collection.countDocuments();
  
  if (count === 0) {
    console.log(`   ⚠️  No documents found in ${collectionName}`);
    return { missing: [], present: [] };
  }
  
  // Sample multiple documents to get a comprehensive field list
  const samples = await collection.find({}).limit(Math.min(count, 10)).toArray();
  
  // Get all unique fields from samples
  const presentFields = new Set<string>();
  samples.forEach((doc: Record<string, unknown>) => {
    Object.keys(doc).forEach(field => presentFields.add(field));
  });
  
  const present = expectedFields.filter(field => presentFields.has(field));
  const missing = expectedFields.filter(field => !presentFields.has(field));
  
  console.log(`   📊 Documents: ${count}`);
  console.log(`   ✅ Present fields (${present.length}/${expectedFields.length}):`, present.join(', '));
  
  if (missing.length > 0) {
    console.log(`   ❌ Missing fields (${missing.length}):`, missing.join(', '));
  } else {
    console.log(`   🎉 All expected fields are present!`);
  }
  
  return { missing, present };
}

async function main() {
  console.log('🔍 MongoDB Atlas Schema Analysis Tool');
  console.log('====================================\n');
  
  const db = await connectToDatabase();
  
  try {
    const results = {
      users: await checkCollection(db, 'users', [
        '_id', 'firstName', 'lastName', 'email', 'password', 'phone', 'address',
        'isActive', 'isStaff', 'isEmailVerified', 'role', 'resetPasswordToken',
        'resetPasswordExpires', 'emailVerificationToken', 'createdAt', 'updatedAt'
      ]),
      
      vessels: await checkCollection(db, 'vessels', [
        '_id', 'name', 'description', 'capacity', 'type', 'imageSources',
        'active', 'inventory', 'pickupDropoffDay', 'basePriceCents', 'pricingTiers',
        'createdAt', 'updatedAt'
      ]),
      
      bookings: await checkCollection(db, 'bookings', [
        '_id', 'user', 'vessel', 'startTime', 'endTime', 'totalCostCents',
        'stripeSessionId', 'paymentStatus', 'status', 'holdExpiresAt',
        'rulesAgreed', 'waiverSigned', 'deliveryAddress', 'customerPhone',
        'additionalWoodBins', 'damageDepositCents', 'damageDepositStatus',
        'damageDepositRefunded', 'agreementSigned', 'agreementSignedAt',
        'createdAt', 'updatedAt'
      ]),
      
      trips: await checkCollection(db, 'trips', [
        '_id', 'vessel', 'departureTime', 'availableCapacity', 'groupBooked',
        'assignedStaff', 'staffNotified', 'durationMinutes', 'createdAt', 'updatedAt'
      ]),
      
      serviceposts: await checkCollection(db, 'serviceposts', [
        '_id', 'title', 'content', 'author', 'featured', 'published',
        'slug', 'excerpt', 'views', 'readTime', 'category', 'tags',
        'createdAt', 'updatedAt'
      ]),
      
      contacts: await checkCollection(db, 'contacts', [
        '_id', 'firstName', 'lastName', 'email', 'phone', 'inquiryType',
        'message', 'status', 'adminNotes', 'createdAt', 'updatedAt'
      ]),
      
      blacklistedtokens: await checkCollection(db, 'blacklistedtokens', [
        '_id', 'token', 'userId', 'reason', 'expiresAt', 'createdAt', 'updatedAt'
      ])
    };
    
    // Summary
    console.log('\n📊 MIGRATION ANALYSIS SUMMARY');
    console.log('=============================');
    
    let needsMigration = false;
    Object.entries(results).forEach(([collectionName, result]) => {
      if (result.missing.length > 0) {
        needsMigration = true;
        console.log(`❌ ${collectionName}: ${result.missing.length} missing fields`);
      } else {
        console.log(`✅ ${collectionName}: Schema up to date`);
      }
    });
    
    console.log('\n🎯 RECOMMENDATION:');
    if (needsMigration) {
      console.log('❗ Your database needs migration!');
      console.log('   Run: npm run migrate');
      console.log('   This will safely add missing fields with default values.');
    } else {
      console.log('🎉 Your database schema is up to date!');
      console.log('   No migration needed.');
    }
    
  } catch (error) {
    console.error('\n❌ Analysis failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

// Run the analysis
main().catch(console.error);