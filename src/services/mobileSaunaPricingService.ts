const GST_RATE = 0.05;
const MINIMUM_DISCOUNT_DAYS = 15; // "over 14 days"

export interface PricingTierConfig {
  days1to3?: number;
  day4?: number;
  day5?: number;
  day6?: number;
  day7?: number;
}

export interface VesselPricingConfig {
  basePriceCents: number;
  pricingTiers?: PricingTierConfig;
  discountThreshold?: number;
  discountPercent?: number;
}

export interface MobileSaunaPriceInput {
  days: number;
  vessel: VesselPricingConfig;
  deliveryFeeCents: number;
  woodBinsCostCents: number;
  damageDepositCents: number;
}

export interface MobileSaunaPriceResult {
  baseRentalPriceCents: number;
  discountAmountCents: number;
  rentalPriceCents: number;
  deliveryFeeCents: number;
  woodBinsCostCents: number;
  taxableSubtotalCents: number;
  gstCents: number;
  gstRate: number;
  totalBeforeDepositCents: number;
  damageDepositCents: number;
  totalDueNowCents: number;
  discountApplied: boolean;
  discountPercent: number;
  discountThresholdDays: number;
  dailyIncrementCents: number;
}

const clampCurrency = (value: number): number => Math.max(0, Math.round(value));

const getWeeklyTierPriceCents = (vessel: VesselPricingConfig): number => {
  const tiers = vessel.pricingTiers;
  if (!tiers) {
    return clampCurrency(vessel.basePriceCents * 7);
  }

  return clampCurrency(
    tiers.day7 ?? tiers.day6 ?? tiers.day5 ?? tiers.day4 ?? tiers.days1to3 ?? vessel.basePriceCents * 7
  );
};

export const calculateBaseRentalPriceCents = (days: number, vessel: VesselPricingConfig): { baseRentalPriceCents: number; dailyIncrementCents: number } => {
  if (days <= 0) {
    throw new Error("Rental days must be greater than 0");
  }

  const tiers = vessel.pricingTiers;
  const weeklyTierPriceCents = getWeeklyTierPriceCents(vessel);
  const dailyIncrementCents = clampCurrency(weeklyTierPriceCents / 7);

  if (!tiers) {
    return {
      baseRentalPriceCents: clampCurrency(vessel.basePriceCents * days),
      dailyIncrementCents,
    };
  }

  if (days <= 3) {
    return {
      baseRentalPriceCents: clampCurrency(tiers.days1to3 ?? vessel.basePriceCents * days),
      dailyIncrementCents,
    };
  }

  if (days <= 7) {
    return {
      baseRentalPriceCents: weeklyTierPriceCents,
      dailyIncrementCents,
    };
  }

  const additionalDays = days - 7;
  return {
    baseRentalPriceCents: clampCurrency(weeklyTierPriceCents + additionalDays * dailyIncrementCents),
    dailyIncrementCents,
  };
};

export const calculateMobileSaunaPricing = (input: MobileSaunaPriceInput): MobileSaunaPriceResult => {
  const { days, vessel, deliveryFeeCents, woodBinsCostCents, damageDepositCents } = input;
  const { baseRentalPriceCents, dailyIncrementCents } = calculateBaseRentalPriceCents(days, vessel);

  const configuredThreshold = Math.max(MINIMUM_DISCOUNT_DAYS, vessel.discountThreshold ?? MINIMUM_DISCOUNT_DAYS);
  const discountPercent = vessel.discountPercent && vessel.discountPercent > 0 ? vessel.discountPercent : 0;
  const discountApplied = discountPercent > 0 && days >= configuredThreshold;

  const discountAmountCents = discountApplied
    ? clampCurrency(baseRentalPriceCents * (discountPercent / 100))
    : 0;

  const rentalPriceCents = clampCurrency(baseRentalPriceCents - discountAmountCents);

  const taxableSubtotalCents = clampCurrency(
    rentalPriceCents + clampCurrency(deliveryFeeCents) + clampCurrency(woodBinsCostCents)
  );

  const gstCents = clampCurrency(taxableSubtotalCents * GST_RATE);
  const totalBeforeDepositCents = clampCurrency(taxableSubtotalCents + gstCents);
  const totalDueNowCents = clampCurrency(totalBeforeDepositCents + clampCurrency(damageDepositCents));

  return {
    baseRentalPriceCents,
    discountAmountCents,
    rentalPriceCents,
    deliveryFeeCents: clampCurrency(deliveryFeeCents),
    woodBinsCostCents: clampCurrency(woodBinsCostCents),
    taxableSubtotalCents,
    gstCents,
    gstRate: GST_RATE,
    totalBeforeDepositCents,
    damageDepositCents: clampCurrency(damageDepositCents),
    totalDueNowCents,
    discountApplied,
    discountPercent,
    discountThresholdDays: configuredThreshold,
    dailyIncrementCents,
  };
};

export const calculateAgeYears = (birthdate: Date, today: Date = new Date()): number => {
  const normalizedBirthDate = new Date(birthdate);
  const normalizedToday = new Date(today);

  let age = normalizedToday.getFullYear() - normalizedBirthDate.getFullYear();
  const monthDifference = normalizedToday.getMonth() - normalizedBirthDate.getMonth();

  if (monthDifference < 0 || (monthDifference === 0 && normalizedToday.getDate() < normalizedBirthDate.getDate())) {
    age -= 1;
  }

  return age;
};
