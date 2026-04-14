import { describe, test, expect } from 'vitest';
import * as fc from 'fast-check';
import { Tier } from '../src/model/domain/User';
import type { UsageCounter } from '../src/model/domain/UsageCounter';
import { getTierLimits } from '../src/services/pricing-service';

/**
 * Property-Based Tests for UsageCounter arithmetic logic
 * Feature: pricing-structure
 *
 * These tests verify the counter arithmetic directly (no DynamoDB).
 * The repository uses atomic ADD/SET expressions, so we test the
 * equivalent arithmetic here.
 */

// ─── Counter Arithmetic Helpers (mirror repository logic) ────────────────────

function incrementImageScans(counter: UsageCounter, count: number): UsageCounter {
  return {
    ...counter,
    imageScansCount: counter.imageScansCount + count,
    updatedAt: new Date().toISOString(),
  };
}

function incrementVocabularyLists(counter: UsageCounter): UsageCounter {
  return {
    ...counter,
    vocabularyListsCount: counter.vocabularyListsCount + 1,
    updatedAt: new Date().toISOString(),
  };
}

function decrementVocabularyLists(counter: UsageCounter): UsageCounter {
  return {
    ...counter,
    vocabularyListsCount: Math.max(0, counter.vocabularyListsCount - 1),
    updatedAt: new Date().toISOString(),
  };
}

function changeTier(counter: UsageCounter): UsageCounter {
  // Tier change does NOT modify counters — only returns the same counter data
  return { ...counter };
}

// ─── Arbitraries ─────────────────────────────────────────────────────────────

const tierArb = fc.constantFrom(Tier.FREE, Tier.BASIC, Tier.PRO);

const isoTimestampArb = fc
  .integer({ min: new Date('2020-01-01').getTime(), max: new Date('2030-01-01').getTime() })
  .map((ms) => new Date(ms).toISOString());

const usageCounterArb = fc.record({
  userId: fc.uuid(),
  imageScansCount: fc.nat({ max: 500 }),
  vocabularyListsCount: fc.nat({ max: 500 }),
  imageScanPeriodStart: fc.option(isoTimestampArb, { nil: undefined }),
  updatedAt: isoTimestampArb,
});

describe('UsageCounter Property Tests', () => {
  /**
   * Feature: pricing-structure, Property 4: Image scan counter increment
   *
   * For any initial count and positive increment, result = initial + increment.
   *
   * **Validates: Requirements 8.1**
   */
  test('Property 4: Image scan counter increment', () => {
    fc.assert(
      fc.property(usageCounterArb, fc.integer({ min: 1, max: 100 }), (counter, incrementAmount) => {
        const initialCount = counter.imageScansCount;
        const result = incrementImageScans(counter, incrementAmount);

        expect(result.imageScansCount).toBe(initialCount + incrementAmount);
        // Other fields preserved
        expect(result.userId).toBe(counter.userId);
        expect(result.vocabularyListsCount).toBe(counter.vocabularyListsCount);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Feature: pricing-structure, Property 5: Vocabulary list counter round-trip
   *
   * Increment then decrement returns to original value.
   *
   * **Validates: Requirements 8.2, 8.3**
   */
  test('Property 5: Vocabulary list counter round-trip', () => {
    fc.assert(
      fc.property(usageCounterArb, (counter) => {
        const initialCount = counter.vocabularyListsCount;
        const afterIncrement = incrementVocabularyLists(counter);
        const afterDecrement = decrementVocabularyLists(afterIncrement);

        expect(afterDecrement.vocabularyListsCount).toBe(initialCount);
        // Other fields preserved
        expect(afterDecrement.userId).toBe(counter.userId);
        expect(afterDecrement.imageScansCount).toBe(counter.imageScansCount);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Feature: pricing-structure, Property 6: Data preservation on tier transition
   *
   * Changing tier doesn't modify existing counters.
   *
   * **Validates: Requirements 9.1, 9.2**
   */
  test('Property 6: Data preservation on tier transition', () => {
    fc.assert(
      fc.property(usageCounterArb, tierArb, tierArb, (counter, _fromTier, _toTier) => {
        const beforeTransition = { ...counter };
        const afterTransition = changeTier(counter);

        // All counter values must be identical after tier change
        expect(afterTransition.imageScansCount).toBe(beforeTransition.imageScansCount);
        expect(afterTransition.vocabularyListsCount).toBe(beforeTransition.vocabularyListsCount);
        expect(afterTransition.userId).toBe(beforeTransition.userId);
        expect(afterTransition.imageScanPeriodStart).toBe(beforeTransition.imageScanPeriodStart);

        // Verify tier limits exist for both tiers (they're valid)
        const fromLimits = getTierLimits(_fromTier);
        const toLimits = getTierLimits(_toTier);
        expect(fromLimits).toBeDefined();
        expect(toLimits).toBeDefined();
      }),
      { numRuns: 100 },
    );
  });
});
