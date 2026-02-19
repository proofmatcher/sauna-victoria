/**
 * Test cases for Friday-to-Friday rental validation
 * Run this to verify the logic before integrating
 */

import { validateRentalDates, getRecommendedDates } from './rentalDateUtils.js';

// Test scenarios
console.log('========================================');
console.log('FRIDAY-TO-FRIDAY RENTAL VALIDATION TESTS');
console.log('========================================\n');

// Test 1: ✅ Valid Friday to Friday (full week)
console.log('Test 1: Friday to Friday (7 days - full week)');
const test1 = validateRentalDates(
  new Date('2026-01-16'), // Friday
  new Date('2026-01-23')  // Next Friday
);
console.log(test1);
console.log('Expected: ✅ Valid, 7 days, requiresWeeklyPrice: true\n');

// Test 2: ✅ Valid Friday to Sunday (3 days)
console.log('Test 2: Friday to Sunday (3 days within week)');
const test2 = validateRentalDates(
  new Date('2026-01-16'), // Friday
  new Date('2026-01-18')  // Sunday
);
console.log(test2);
console.log('Expected: ✅ Valid, 3 days, requiresWeeklyPrice: false\n');

// Test 3: ✅ Valid Wednesday to Friday (3 days within week)
console.log('Test 3: Wednesday to Friday (stays within week)');
const test3 = validateRentalDates(
  new Date('2026-01-14'), // Wednesday
  new Date('2026-01-16')  // Friday
);
console.log(test3);
console.log('Expected: ✅ Valid, 3 days, stays within weekly cycle\n');

// Test 4: ❌ Invalid Thursday to Saturday (crosses Friday boundary)
console.log('Test 4: Thursday to Saturday (crosses Friday boundary)');
const test4 = validateRentalDates(
  new Date('2026-01-15'), // Thursday
  new Date('2026-01-17')  // Saturday
);
console.log(test4);
console.log('Expected: ❌ Invalid, crosses Thursday-Friday boundary\n');

// Test 5: ❌ Invalid Wednesday to Saturday (crosses Friday boundary)
console.log('Test 5: Wednesday to Saturday (crosses Friday boundary)');
const test5 = validateRentalDates(
  new Date('2026-01-14'), // Wednesday
  new Date('2026-01-17')  // Saturday
);
console.log(test5);
console.log('Expected: ❌ Invalid, extends past Friday\n');

// Test 6: ✅ Valid Friday to Friday (same day)
console.log('Test 6: Friday to Friday (same day - 1 day rental)');
const test6 = validateRentalDates(
  new Date('2026-01-16'), // Friday
  new Date('2026-01-16')  // Same Friday
);
console.log(test6);
console.log('Expected: ✅ Valid, 1 day\n');

// Test 7: ❌ Invalid end date before start
console.log('Test 7: End date before start date');
const test7 = validateRentalDates(
  new Date('2026-01-16'),
  new Date('2026-01-15')
);
console.log(test7);
console.log('Expected: ❌ Invalid, drop-off before pick-up\n');

// Test 8: ✅ Valid Monday to Wednesday (within week)
console.log('Test 8: Monday to Wednesday (within same week)');
const test8 = validateRentalDates(
  new Date('2026-01-12'), // Monday
  new Date('2026-01-14')  // Wednesday
);
console.log(test8);
console.log('Expected: ✅ Valid, stays within weekly cycle\n');

// Test 9: Get recommended dates
console.log('Test 9: Get recommended dates for Wednesday Jan 14');
const test9 = getRecommendedDates(new Date('2026-01-14'));
console.log(test9);
console.log('Expected: Options for Friday-to-Friday and same-week rentals\n');

console.log('========================================');
console.log('TESTS COMPLETE');
console.log('========================================');
