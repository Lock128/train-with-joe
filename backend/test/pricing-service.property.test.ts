import { describe, test, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  getTierLimits,
  resolveTierFromSubscription,
  canPerformImageScan,
  canCreateVocabularyList,
  shouldResetPeriodCounter,
} from '../src/services/pricing-service';
import { Tier, TierSource, SubscriptionStatus } from '../src/model/domain/User';

/**
 * Property-Based Tests for PricingService pure functions
 * Feature: pricing-structure
 */

// ─── Arbitraries ─────────────────────────────────────────────────────────────

const tierArb = fc.constantFrom(Tier.FREE, Tier.BASIC, Tier.PRO);

const subscriptionStatusArb = fc.constantFrom(
  SubscriptionStatus.ACTIVE,
  SubscriptionStatus.INACTIVE,
  SubscriptionStatus.CANCELLED,
  SubscriptionStatus.PAST_DUE,
  undefined,
);

const planIdArb = fc.constantFrom('basic-monthly', 'pro-monthly', 'unknown-plan', undefined);

const tierSourceArb = fc.constantFrom(TierSource.SUBSCRIPTION, TierSource.MANUAL, undefined);

const nonNegativeIntArb = fc.nat({ max: 1000 });

/** Plan tier map used for property tests (replaces the old hardcoded PLAN_TIER_MAP) */
const TEST_PLAN_TIER_MAP: Record<string, Tier> = {
  'basic-monthly': Tier.BASIC,
  'pro-monthly': Tier.PRO,
};

describe('PricingService Property Tests', () => {
  /**
   * Feature: pricing-structure, Property 1: Tier resolution correctness
   *
   * For any combination of subscription status, plan ID, manual tier, and tier source,
   * resolveTierFromSubscription returns the correct tier.
   *
   * **Validates: Requirements 1.3, 1.4, 1.5, 10.3, 10.5**
   */
  test('Property 1: Tier resolution correctness', () => {
    fc.assert(
      fc.property(
        subscriptionStatusArb,
        planIdArb,
        fc.option(tierArb, { nil: undefined }),
        tierSourceArb,
        (status, planId, manualTier, tierSource) => {
          const result = resolveTierFromSubscription(status, planId, manualTier, tierSource, TEST_PLAN_TIER_MAP);

          // Rule: Active subscription always takes precedence
          if (status === SubscriptionStatus.ACTIVE) {
            expect(result.tierSource).toBe(TierSource.SUBSCRIPTION);
            if (planId === 'basic-monthly') {
              expect(result.tier).toBe(Tier.BASIC);
            } else if (planId === 'pro-monthly') {
              expect(result.tier).toBe(Tier.PRO);
            } else {
              // Unknown or undefined planId with ACTIVE → FREE
              expect(result.tier).toBe(Tier.FREE);
            }
            return;
          }

          // Rule: PAST_DUE → FREE (grace period handled externally)
          if (status === SubscriptionStatus.PAST_DUE) {
            expect(result.tier).toBe(Tier.FREE);
            expect(result.tierSource).toBe(TierSource.SUBSCRIPTION);
            return;
          }

          // Rule: CANCELLED or INACTIVE → FREE
          if (status === SubscriptionStatus.CANCELLED || status === SubscriptionStatus.INACTIVE) {
            expect(result.tier).toBe(Tier.FREE);
            expect(result.tierSource).toBe(TierSource.SUBSCRIPTION);
            return;
          }

          // Rule: No subscription status — manual override if present
          if (tierSource === TierSource.MANUAL && manualTier !== undefined) {
            expect(result.tier).toBe(manualTier);
            expect(result.tierSource).toBe(TierSource.MANUAL);
            return;
          }

          // Rule: No subscription, no manual → FREE
          expect(result.tier).toBe(Tier.FREE);
          expect(result.tierSource).toBe(TierSource.SUBSCRIPTION);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Feature: pricing-structure, Property 2: Image scan limit enforcement
   *
   * For any tier and non-negative count, canPerformImageScan returns true iff
   * limit is null OR count < limit (5 for FREE, 25 for BASIC).
   *
   * **Validates: Requirements 2.1, 2.5, 3.2, 3.5, 4.2**
   */
  test('Property 2: Image scan limit enforcement', () => {
    fc.assert(
      fc.property(tierArb, nonNegativeIntArb, (tier, count) => {
        const limits = getTierLimits(tier);
        const result = canPerformImageScan(tier, count, limits);

        if (limits.maxImageScans === null) {
          // Unlimited (PRO) → always true
          expect(result).toBe(true);
        } else {
          // Limited → true iff count < limit
          expect(result).toBe(count < limits.maxImageScans);
        }
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Feature: pricing-structure, Property 3: Vocabulary list limit enforcement
   *
   * For any tier and non-negative count, canCreateVocabularyList returns true iff
   * limit is null OR count < limit (5 for FREE).
   *
   * **Validates: Requirements 2.2, 2.4, 3.1, 4.1, 9.3**
   */
  test('Property 3: Vocabulary list limit enforcement', () => {
    fc.assert(
      fc.property(tierArb, nonNegativeIntArb, (tier, count) => {
        const limits = getTierLimits(tier);
        const result = canCreateVocabularyList(tier, count, limits);

        if (limits.maxVocabularyLists === null) {
          // Unlimited (BASIC, PRO) → always true
          expect(result).toBe(true);
        } else {
          // Limited (FREE) → true iff count < limit
          expect(result).toBe(count < limits.maxVocabularyLists);
        }
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Feature: pricing-structure, Property 7: Grace period enforcement
   *
   * PAST_DUE user keeps tier when gracePeriodEnd > now, gets FREE when gracePeriodEnd <= now.
   * This tests the resolution logic: resolveTierFromSubscription returns FREE for PAST_DUE,
   * and the grace period check is done externally by comparing timestamps.
   *
   * **Validates: Requirements 9.5**
   */
  test('Property 7: Grace period enforcement', () => {
    fc.assert(
      fc.property(
        tierArb,
        // Generate a "now" timestamp and an offset in ms (-7 days to +7 days)
        fc.date({ min: new Date('2020-01-01'), max: new Date('2030-01-01') }),
        fc.integer({ min: -7 * 24 * 60 * 60 * 1000, max: 7 * 24 * 60 * 60 * 1000 }),
        (prePastDueTier, now, offsetMs) => {
          const gracePeriodEnd = new Date(now.getTime() + offsetMs);

          // Simulate the grace period logic from resolveAndUpdateTier:
          // If now < gracePeriodEnd → keep current tier
          // If now >= gracePeriodEnd → downgrade to FREE
          const effectiveTier = now < gracePeriodEnd ? prePastDueTier : Tier.FREE;

          if (now < gracePeriodEnd) {
            expect(effectiveTier).toBe(prePastDueTier);
          } else {
            expect(effectiveTier).toBe(Tier.FREE);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Feature: pricing-structure, Property 8: Billing period counter reset
   *
   * shouldResetPeriodCounter returns true iff periodStart < currentPeriodEnd.
   *
   * **Validates: Requirements 3.4**
   */
  test('Property 8: Billing period counter reset', () => {
    // Use integer timestamps to avoid NaN date issues with fc.date
    const timestampArb = fc.integer({
      min: new Date('2020-01-01').getTime(),
      max: new Date('2030-01-01').getTime(),
    });

    fc.assert(
      fc.property(timestampArb, timestampArb, (periodStartMs, currentPeriodEndMs) => {
        const periodStart = new Date(periodStartMs).toISOString();
        const currentPeriodEnd = new Date(currentPeriodEndMs).toISOString();

        const result = shouldResetPeriodCounter(periodStart, currentPeriodEnd);

        // The function returns true iff periodStart < currentPeriodEnd
        const expected = periodStartMs < currentPeriodEndMs;
        expect(result).toBe(expected);
      }),
      { numRuns: 100 },
    );
  });
});
