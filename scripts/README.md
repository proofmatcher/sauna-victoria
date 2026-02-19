# Database Migration Guide

This document explains how to migrate your MongoDB Atlas database to match your current schema definitions.

## Problem

When deploying from local development (Docker + local MongoDB) to production (Vercel + MongoDB Atlas), your database schema may become out of sync. New fields added during development won't exist in the production database, causing:

- Missing field errors
- Default values not applied
- New features not working properly
- Schema inconsistencies

## Solution

Use the provided migration script to update your MongoDB Atlas database with all current schema definitions.

## Migration Script Features

✅ **Complete Schema Sync**: Updates all 7 collections (Users, Vessels, Bookings, Trips, ServicePosts, Contacts, BlacklistedTokens)

✅ **Safe Field Addition**: Adds missing fields with proper default values

✅ **Index Creation**: Creates performance-optimized database indexes

✅ **Data Validation**: Validates existing data integrity

✅ **Zero Downtime**: Updates existing documents without removing data

## Quick Start

### 1. Setup Migration Environment

```bash
# Navigate to the scripts directory
cd express-ts-app/scripts

# Install dependencies
npm install
```

### 2. Configure Environment

Make sure your `.env` file contains:
```bash
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database-name
```

### 3. Run Migration

```bash
# Development/Testing
npm run migrate

# Production
npm run migrate:prod
```

## What The Script Does

### Users Collection
- Adds: `isActive`, `isStaff`, `isEmailVerified`, `role` fields
- Sets defaults: `isActive: true`, `isStaff: false`, `isEmailVerified: false`, `role: 'user'`
- Creates indexes: email (unique), resetPasswordToken, emailVerificationToken

### Vessels Collection
- Adds: `active`, `inventory`, `pickupDropoffDay`, `basePriceCents` fields
- Sets defaults: `active: true`, `inventory: 1`, `pickupDropoffDay: 5` (Friday), `basePriceCents: 0`
- Creates indexes: type + active combination

### Bookings Collection
- Adds: `rulesAgreed`, `waiverSigned`, `additionalWoodBins`, `damageDepositCents`, `damageDepositStatus`, `status`
- Sets defaults: `rulesAgreed: false`, `waiverSigned: false`, `additionalWoodBins: 0`, `damageDepositCents: 25000`, `damageDepositStatus: 'held'`, `status: 'pending'`
- Creates indexes: user + createdAt, vessel + startTime + endTime, status + holdExpiresAt, stripeSessionId

### Trips Collection
- Adds: `groupBooked`, `assignedStaff`, `staffNotified`, `durationMinutes` fields
- Sets defaults: `groupBooked: false`, `assignedStaff: []`, `staffNotified: false`, `durationMinutes: 180`
- Creates indexes: vessel + departureTime, departureTime

### ServicePosts Collection
- Adds: `featured`, `published`, `views`, `readTime`, `category` fields
- Sets defaults: `featured: false`, `published: false`, `views: 0`, `readTime: '5 min read'`, `category: 'general'`
- Generates unique slugs for existing posts
- Creates indexes: slug (unique), published + createdAt, featured, category

### Contacts Collection
- Adds: `status` field with default `'new'`
- Creates indexes: email + createdAt, status + createdAt, inquiryType

### BlacklistedTokens Collection
- Adds: `reason` field with default `'logout'`
- Creates indexes: token (unique), userId, expiresAt (TTL), token + expiresAt

## Migration Output Example

```
🚀 MongoDB Atlas Schema Migration Tool
=====================================

✅ Connected to MongoDB Atlas

👤 Migrating Users collection...
   📊 Found 25 users
   ✅ Updated 25 user documents

🛥️ Migrating Vessels collection...
   📊 Found 8 vessels
   ✅ Updated 8 vessel documents

📅 Migrating Bookings collection...
   📊 Found 147 bookings
   ✅ Updated 147 booking documents

🚢 Migrating Trips collection...
   📊 Found 52 trips
   ✅ Updated 52 trip documents

📝 Migrating ServicePosts collection...
   📊 Found 12 service posts
   ✅ Updated 12 service post documents
   ✅ Generated slugs for 5 posts

📧 Checking Contacts collection...
   📊 Found 34 contacts
   ✅ Updated 34 contact documents

🚫 Checking BlacklistedTokens collection...
   📊 Found 0 blacklisted tokens
   ✅ BlacklistedTokens collection is ready

🔍 Creating database indexes...
   ✅ Created Users indexes
   ✅ Created Vessels indexes
   ✅ Created Bookings indexes
   ✅ Created Trips indexes
   ✅ Created ServicePosts indexes
   ✅ Created Contacts indexes
   ✅ Created BlacklistedTokens indexes

🔍 Validating database schema...
   📊 users: 25 documents
   ✅ Timestamps: Present
   📊 vessels: 8 documents
   ✅ Timestamps: Present
   📊 bookings: 147 documents
   ✅ Timestamps: Present

✅ Migration completed successfully!

📋 Summary:
   • All collections updated with latest schema fields
   • Default values applied to existing documents
   • Database indexes created for optimal performance
   • Schema validation completed

🎉 Your MongoDB Atlas database is now in sync with your latest code!
```

## Safety Features

- **Non-destructive**: Only adds fields, never removes data
- **Conditional Updates**: Uses `$ifNull` to only set defaults for missing fields
- **Index Safety**: Handles existing indexes gracefully
- **Connection Validation**: Verifies database connection before proceeding
- **Error Handling**: Stops on errors and provides clear messages

## Troubleshooting

### Common Issues

1. **Connection Failed**: Check your `MONGODB_URI` in `.env`
2. **Permission Denied**: Ensure your MongoDB user has read/write access
3. **Network Timeout**: Check if your IP is whitelisted in MongoDB Atlas
4. **Duplicate Key Error**: Some indexes may already exist (this is normal)

### Verification

After migration, check your production app to ensure:
- New features work properly (booked dates calendar, capacity updates)
- No console errors related to missing fields
- Database queries return expected data structure

## Rollback (If Needed)

If something goes wrong, you can rollback by:

1. **Restore from Backup**: Use MongoDB Atlas backup/restore feature
2. **Manual Field Removal**: Remove added fields manually (not recommended)
3. **Re-run Migration**: Fix issues and run migration again

## Best Practices Moving Forward

1. **Version Control Migrations**: Keep migration scripts in git
2. **Test Migrations**: Always test on staging environment first
3. **Document Changes**: Record all schema changes in migration files
4. **Automate Deployments**: Include migration step in CI/CD pipeline

## Next Steps

After successful migration:

1. ✅ Verify all features work in production
2. ✅ Test the booked dates calendar
3. ✅ Test capacity updates
4. ✅ Monitor application logs for any errors
5. ✅ Consider setting up automated schema migrations for future deployments

---

**Need Help?** If you encounter any issues, check the migration output for specific error messages and ensure your MongoDB Atlas connection settings are correct.