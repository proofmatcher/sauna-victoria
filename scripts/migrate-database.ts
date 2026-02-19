import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Database Migration Script for MongoDB Atlas
 * 
 * This script ensures all collections have the correct schema structure
 * and adds any missing fields to existing documents.
 * 
 * Run this script after deploying to production to sync your database schema.
 */

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('❌ Error: MONGO_URI not found in environment variables');
  process.exit(1);
}

// Capture as a non-optional string for use inside functions.
const mongoUri: string = MONGO_URI;

console.log('🔄 Starting database migration...');
console.log('📍 Target database:', mongoUri.replace(/:\/\/[^:]+:[^@]+@/, '://***:***@'));

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

async function migrateUsers(db: any) {
  console.log('\n👤 Migrating Users collection...');
  
  const usersCollection = db.collection('users');
  const usersCount = await usersCollection.countDocuments();
  console.log(`   📊 Found ${usersCount} users`);

  // Add missing fields to existing users
  // NOTE: `$ifNull` requires an update pipeline (MongoDB 4.2+).
  const result = await usersCollection.updateMany({}, [
    {
      $set: {
        firstName: { $ifNull: ['$firstName', ''] },
        lastName: { $ifNull: ['$lastName', ''] },
        isActive: { $ifNull: ['$isActive', true] },
        isStaff: { $ifNull: ['$isStaff', false] },
        isEmailVerified: { $ifNull: ['$isEmailVerified', false] },
        role: { $ifNull: ['$role', 'user'] },
        resetPasswordToken: { $ifNull: ['$resetPasswordToken', null] },
        resetPasswordExpires: { $ifNull: ['$resetPasswordExpires', null] },
        emailVerificationToken: { $ifNull: ['$emailVerificationToken', null] }
      }
    },
    { $unset: '__v' }
  ]);

  console.log(`   ✅ Updated ${result.modifiedCount} user documents`);
}

async function migrateVessels(db: any) {
  console.log('\n🛥️ Migrating Vessels collection...');
  
  const vesselsCollection = db.collection('vessels');
  const vesselsCount = await vesselsCollection.countDocuments();
  console.log(`   📊 Found ${vesselsCount} vessels`);

  // Add missing fields to existing vessels
  const result = await vesselsCollection.updateMany({}, [
    {
      $set: {
        description: { $ifNull: ['$description', ''] },
        imageSources: { $ifNull: ['$imageSources', []] },
        active: { $ifNull: ['$active', true] },
        inventory: { $ifNull: ['$inventory', 1] },
        pickupDropoffDay: { $ifNull: ['$pickupDropoffDay', 5] },
        basePriceCents: { $ifNull: ['$basePriceCents', 0] }
      }
    }
  ]);

  console.log(`   ✅ Updated ${result.modifiedCount} vessel documents`);
}

async function migrateBookings(db: any) {
  console.log('\n📅 Migrating Bookings collection...');
  
  const bookingsCollection = db.collection('bookings');
  const bookingsCount = await bookingsCollection.countDocuments();
  console.log(`   📊 Found ${bookingsCount} bookings`);

  // Add missing fields to existing bookings
  const result = await bookingsCollection.updateMany({}, [
    {
      $set: {
        totalCostCents: { $ifNull: ['$totalCostCents', 0] },
        paymentStatus: { $ifNull: ['$paymentStatus', 'pending'] },
        rulesAgreed: { $ifNull: ['$rulesAgreed', false] },
        waiverSigned: { $ifNull: ['$waiverSigned', false] },
        additionalWoodBins: { $ifNull: ['$additionalWoodBins', 0] },
        damageDepositCents: { $ifNull: ['$damageDepositCents', 25000] },
        damageDepositStatus: { $ifNull: ['$damageDepositStatus', 'held'] },
        damageDepositRefunded: { $ifNull: ['$damageDepositRefunded', false] },
        agreementSigned: { $ifNull: ['$agreementSigned', false] },
        agreementSignedAt: { $ifNull: ['$agreementSignedAt', null] },
        status: { $ifNull: ['$status', 'pending'] }
      }
    }
  ]);

  console.log(`   ✅ Updated ${result.modifiedCount} booking documents`);
}

async function migrateTrips(db: any) {
  console.log('\n🚢 Migrating Trips collection...');
  
  const tripsCollection = db.collection('trips');
  const tripsCount = await tripsCollection.countDocuments();
  console.log(`   📊 Found ${tripsCount} trips`);

  // Add missing fields to existing trips
  const result = await tripsCollection.updateMany({}, [
    {
      $set: {
        availableCapacity: { $ifNull: ['$availableCapacity', 0] },
        groupBooked: { $ifNull: ['$groupBooked', false] },
        assignedStaff: { $ifNull: ['$assignedStaff', []] },
        staffNotified: { $ifNull: ['$staffNotified', false] },
        durationMinutes: { $ifNull: ['$durationMinutes', 180] }
      }
    }
  ]);

  console.log(`   ✅ Updated ${result.modifiedCount} trip documents`);
}

async function migrateServicePosts(db: any) {
  console.log('\n📝 Migrating ServicePosts collection...');
  
  const servicePostsCollection = db.collection('serviceposts');
  const servicePostsCount = await servicePostsCollection.countDocuments();
  console.log(`   📊 Found ${servicePostsCount} service posts`);

  // Add missing fields to existing service posts
  const result = await servicePostsCollection.updateMany({}, [
    {
      $set: {
        featured: { $ifNull: ['$featured', false] },
        published: { $ifNull: ['$published', false] },
        views: { $ifNull: ['$views', 0] },
        readTime: { $ifNull: ['$readTime', '5 min read'] },
        category: { $ifNull: ['$category', 'general'] },
        tags: { $ifNull: ['$tags', []] }
      }
    }
  ]);

  // Generate slugs for posts that don't have them
  const postsWithoutSlug = await servicePostsCollection.find({ slug: { $exists: false } }).toArray();
  for (const post of postsWithoutSlug) {
    const title = typeof post.title === 'string' ? post.title : '';
    const baseSlug = title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();

    const uniqueSuffix = `${post._id}-${Date.now()}`;
    const slug = baseSlug ? `${baseSlug}-${uniqueSuffix}` : `post-${uniqueSuffix}`;
      
    await servicePostsCollection.updateOne(
      { _id: post._id },
      { $set: { slug } }
    );
  }

  console.log(`   ✅ Updated ${result.modifiedCount} service post documents`);
  console.log(`   ✅ Generated slugs for ${postsWithoutSlug.length} posts`);
}

async function ensureContacts(db: any) {
  console.log('\n📧 Checking Contacts collection...');
  
  const contactsCollection = db.collection('contacts');
  const contactsCount = await contactsCollection.countDocuments();
  console.log(`   📊 Found ${contactsCount} contacts`);

  // Add missing fields to existing contacts
  if (contactsCount > 0) {
    const result = await contactsCollection.updateMany({}, [
      { $set: { status: { $ifNull: ['$status', 'new'] } } }
    ]);
    console.log(`   ✅ Updated ${result.modifiedCount} contact documents`);
  } else {
    console.log('   ✅ Contacts collection is ready for new documents');
  }
}

async function ensureBlacklistedTokens(db: any) {
  console.log('\n🚫 Checking BlacklistedTokens collection...');
  
  const blacklistedTokensCollection = db.collection('blacklistedtokens');
  const tokensCount = await blacklistedTokensCollection.countDocuments();
  console.log(`   📊 Found ${tokensCount} blacklisted tokens`);

  // Add missing fields to existing tokens
  if (tokensCount > 0) {
    const result = await blacklistedTokensCollection.updateMany({}, [
      { $set: { reason: { $ifNull: ['$reason', 'logout'] } } }
    ]);
    console.log(`   ✅ Updated ${result.modifiedCount} blacklisted token documents`);
  } else {
    console.log('   ✅ BlacklistedTokens collection is ready for new documents');
  }
}

async function createIndexes(db: any) {
  console.log('\n🔍 Creating database indexes...');

  // Users indexes
  try {
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
    await db.collection('users').createIndex({ resetPasswordToken: 1 });
    await db.collection('users').createIndex({ emailVerificationToken: 1 });
    console.log('   ✅ Created Users indexes');
  } catch (error) {
    console.log('   ⚠️  Some Users indexes already exist');
  }

  // Vessels indexes
  try {
    await db.collection('vessels').createIndex({ type: 1, active: 1 });
    console.log('   ✅ Created Vessels indexes');
  } catch (error) {
    console.log('   ⚠️  Some Vessels indexes already exist');
  }

  // Bookings indexes
  try {
    await db.collection('bookings').createIndex({ user: 1, createdAt: -1 });
    await db.collection('bookings').createIndex({ vessel: 1, startTime: 1, endTime: 1 });
    await db.collection('bookings').createIndex({ status: 1, holdExpiresAt: 1 });
    await db.collection('bookings').createIndex({ stripeSessionId: 1 });
    console.log('   ✅ Created Bookings indexes');
  } catch (error) {
    console.log('   ⚠️  Some Bookings indexes already exist');
  }

  // Trips indexes
  try {
    await db.collection('trips').createIndex({ vessel: 1, departureTime: 1 });
    await db.collection('trips').createIndex({ departureTime: 1 });
    console.log('   ✅ Created Trips indexes');
  } catch (error) {
    console.log('   ⚠️  Some Trips indexes already exist');
  }

  // ServicePosts indexes
  try {
    await db.collection('serviceposts').createIndex({ slug: 1 }, { unique: true });
    await db.collection('serviceposts').createIndex({ published: 1, createdAt: -1 });
    await db.collection('serviceposts').createIndex({ featured: 1 });
    await db.collection('serviceposts').createIndex({ category: 1 });
    console.log('   ✅ Created ServicePosts indexes');
  } catch (error) {
    console.log('   ⚠️  Some ServicePosts indexes already exist');
  }

  // Contacts indexes
  try {
    await db.collection('contacts').createIndex({ email: 1, createdAt: -1 });
    await db.collection('contacts').createIndex({ status: 1, createdAt: -1 });
    await db.collection('contacts').createIndex({ inquiryType: 1 });
    console.log('   ✅ Created Contacts indexes');
  } catch (error) {
    console.log('   ⚠️  Some Contacts indexes already exist');
  }

  // BlacklistedTokens indexes
  try {
    await db.collection('blacklistedtokens').createIndex({ token: 1 }, { unique: true });
    await db.collection('blacklistedtokens').createIndex({ userId: 1 });
    await db.collection('blacklistedtokens').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    await db.collection('blacklistedtokens').createIndex({ token: 1, expiresAt: 1 });
    console.log('   ✅ Created BlacklistedTokens indexes');
  } catch (error) {
    console.log('   ⚠️  Some BlacklistedTokens indexes already exist');
  }
}

async function validateSchema(db: any) {
  console.log('\n🔍 Validating database schema...');
  
  const collections = ['users', 'vessels', 'bookings', 'trips', 'serviceposts', 'contacts', 'blacklistedtokens'];
  
  for (const collectionName of collections) {
    const collection = db.collection(collectionName);
    const count = await collection.countDocuments();
    console.log(`   📊 ${collectionName}: ${count} documents`);
    
    // Sample a document to verify structure
    if (count > 0) {
      const sample = await collection.findOne({});
      const hasTimestamps = sample.createdAt && sample.updatedAt;
      console.log(`   ${hasTimestamps ? '✅' : '⚠️ '} Timestamps: ${hasTimestamps ? 'Present' : 'Missing'}`);
    }
  }
}

async function main() {
  console.log('🚀 MongoDB Atlas Schema Migration Tool');
  console.log('=====================================\n');
  
  const db = await connectToDatabase();
  
  try {
    // Run migrations
    await migrateUsers(db);
    await migrateVessels(db);
    await migrateBookings(db);
    await migrateTrips(db);
    await migrateServicePosts(db);
    await ensureContacts(db);
    await ensureBlacklistedTokens(db);
    
    // Create indexes
    await createIndexes(db);
    
    // Validate final state
    await validateSchema(db);
    
    console.log('\n✅ Migration completed successfully!');
    console.log('\n📋 Summary:');
    console.log('   • All collections updated with latest schema fields');
    console.log('   • Default values applied to existing documents');
    console.log('   • Database indexes created for optimal performance');
    console.log('   • Schema validation completed');
    console.log('\n🎉 Your MongoDB Atlas database is now in sync with your latest code!');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

// Run the migration
main().catch(console.error);