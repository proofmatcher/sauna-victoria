import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import Booking from '../models/Booking.js';

dotenv.config();

interface CliOptions {
  execute: boolean;
  cutoffDate: Date;
  limit?: number;
}

interface TestMatchResult {
  isTest: boolean;
  reasons: string[];
}

const EMAIL_PATTERNS = [
  /test/i,
  /demo/i,
  /example\.com$/i,
  /mailinator/i,
  /fake/i,
  /qa/i,
];

const NAME_PATTERNS = [
  /test/i,
  /demo/i,
  /sample/i,
  /qa/i,
  /dummy/i,
];

const ADDRESS_PATTERNS = [
  /test/i,
  /fake/i,
  /demo/i,
  /sample/i,
  /123\s+main/i,
];

const PHONE_PATTERNS = [
  /^0+$/,
  /123[-\s]?456[-\s]?7890/,
  /000[-\s]?000[-\s]?0000/,
  /111[-\s]?111[-\s]?1111/,
];

function parseArgs(args: string[]): CliOptions {
  const execute = args.includes('--execute');
  const dryRunExplicit = args.includes('--dry-run');

  const cutoffArg = args.find((arg) => arg.startsWith('--cutoff='));
  const cutoffValue = cutoffArg ? cutoffArg.split('=')[1] : undefined;

  const cutoffDate = cutoffValue
    ? new Date(`${cutoffValue}T23:59:59.999Z`)
    : new Date();

  if (Number.isNaN(cutoffDate.getTime())) {
    throw new Error('Invalid --cutoff value. Use YYYY-MM-DD format.');
  }

  const limitArg = args.find((arg) => arg.startsWith('--limit='));
  const limitValue = limitArg ? Number(limitArg.split('=')[1]) : undefined;

  return {
    execute: execute && !dryRunExplicit,
    cutoffDate,
    limit: Number.isFinite(limitValue) && limitValue! > 0 ? limitValue : undefined,
  };
}

function matchesPattern(value: string | undefined, patterns: RegExp[]): boolean {
  if (!value) return false;
  return patterns.some((pattern) => pattern.test(value));
}

function evaluateBookingAsTest(booking: any): TestMatchResult {
  const reasons: string[] = [];

  if (matchesPattern(booking.customerEmail, EMAIL_PATTERNS)) {
    reasons.push('email-pattern');
  }

  if (matchesPattern(booking.customerName, NAME_PATTERNS)) {
    reasons.push('name-pattern');
  }

  if (matchesPattern(booking.deliveryAddress, ADDRESS_PATTERNS)) {
    reasons.push('address-pattern');
  }

  if (matchesPattern(booking.customerPhone, PHONE_PATTERNS)) {
    reasons.push('phone-pattern');
  }

  if (booking.customerEmail && booking.customerEmail.endsWith('@example.com')) {
    reasons.push('example-domain');
  }

  return {
    isTest: reasons.length > 0,
    reasons,
  };
}

function writeAuditReport(payload: any) {
  const outputDir = join(process.cwd(), 'logs', 'cleanup-reports');
  mkdirSync(outputDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = join(outputDir, `cleanup-test-bookings-${timestamp}.json`);

  writeFileSync(reportPath, JSON.stringify(payload, null, 2), 'utf-8');
  return reportPath;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error('MONGO_URI is required in environment variables.');
  }

  console.log('Cleanup mode:', options.execute ? 'EXECUTE' : 'DRY-RUN');
  console.log('Cutoff date:', options.cutoffDate.toISOString());
  if (options.limit) {
    console.log('Record limit:', options.limit);
  }

  await mongoose.connect(mongoUri);

  const query: any = {
    createdAt: { $lte: options.cutoffDate },
  };

  let bookingQuery = Booking.find(query)
    .select('_id customerName customerEmail customerPhone deliveryAddress startTime endTime status createdAt totalPriceCents')
    .sort({ createdAt: 1 });

  if (options.limit) {
    bookingQuery = bookingQuery.limit(options.limit);
  }

  const bookings = await bookingQuery;

  const candidates = bookings
    .map((booking) => {
      const evaluation = evaluateBookingAsTest(booking);
      return {
        booking,
        ...evaluation,
      };
    })
    .filter((item) => item.isTest)
    .map((item) => ({
      id: item.booking._id,
      customerName: item.booking.customerName || '',
      customerEmail: item.booking.customerEmail || '',
      customerPhone: item.booking.customerPhone || '',
      status: item.booking.status,
      createdAt: (item.booking as any).createdAt,
      startTime: item.booking.startTime,
      endTime: item.booking.endTime,
      totalPriceCents: item.booking.totalPriceCents,
      reasons: item.reasons,
    }));

  console.log(`Scanned bookings: ${bookings.length}`);
  console.log(`Matched test candidates: ${candidates.length}`);

  const reportBase = {
    mode: options.execute ? 'execute' : 'dry-run',
    cutoffDate: options.cutoffDate.toISOString(),
    scannedCount: bookings.length,
    matchedCount: candidates.length,
    candidates,
    generatedAt: new Date().toISOString(),
  };

  if (!options.execute) {
    const reportPath = writeAuditReport({ ...reportBase, deletedCount: 0, deletedIds: [] });
    console.log(`Dry-run report saved to: ${reportPath}`);
    await mongoose.connection.close();
    return;
  }

  if (candidates.length === 0) {
    const reportPath = writeAuditReport({ ...reportBase, deletedCount: 0, deletedIds: [] });
    console.log(`No matching records to delete. Report saved to: ${reportPath}`);
    await mongoose.connection.close();
    return;
  }

  const idsToDelete = candidates.map((candidate) => candidate.id);
  const result = await Booking.deleteMany({ _id: { $in: idsToDelete } });

  const reportPath = writeAuditReport({
    ...reportBase,
    deletedCount: result.deletedCount || 0,
    deletedIds: idsToDelete,
  });

  console.log(`Deleted bookings: ${result.deletedCount || 0}`);
  console.log(`Execution report saved to: ${reportPath}`);

  await mongoose.connection.close();
}

main().catch(async (error) => {
  console.error('Cleanup script failed:', error.message);
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
  process.exit(1);
});
