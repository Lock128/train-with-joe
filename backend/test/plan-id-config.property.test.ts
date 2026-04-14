import { describe, test, expect } from 'vitest';
import * as fc from 'fast-check';
import { validateConfig, buildReverseLookupMap, getPlanIds } from '../src/services/plan-id-config-loader';
import type { PlanIdConfig } from '../src/services/plan-id-config-loader';
import { Tier, PaymentProvider } from '../src/model/domain/User';

/**
 * Property-Based Tests for Plan ID Configuration
 */

// ─── Shared Arbitraries ─────────────────────────────────────────────────────

/** Generates a non-empty string suitable for use as a product ID.
 *  Filters out '__proto__', 'constructor', and 'toString' to avoid JS prototype pollution edge cases. */
const productIdArb = fc
  .string({ minLength: 1, maxLength: 50 })
  .filter((s) => s.trim().length > 0 && !['__proto__', 'constructor', 'toString'].includes(s));

/**
 * Generates a valid PlanIdConfig with 6 unique non-empty product ID strings.
 * Uses fc.uniqueArray to guarantee uniqueness across all platform/tier combos.
 */
const validConfigArb: fc.Arbitrary<PlanIdConfig> = fc
  .uniqueArray(productIdArb, { minLength: 6, maxLength: 6 })
  .map(([stripeBasic, stripePro, appStoreBasic, appStorePro, playStoreBasic, playStorePro]) => ({
    stripe: { basic: stripeBasic, pro: stripePro },
    appStore: { basic: appStoreBasic, pro: appStorePro },
    playStore: { basic: playStoreBasic, pro: playStorePro },
  }));

/** Collects all product IDs from a PlanIdConfig into a flat set */
function allProductIds(config: PlanIdConfig): Set<string> {
  return new Set([
    config.stripe.basic,
    config.stripe.pro,
    config.appStore.basic,
    config.appStore.pro,
    config.playStore.basic,
    config.playStore.pro,
  ]);
}

describe('Plan ID Config Property Tests', () => {
  /**
   * Feature: plan-id-configuration, Property 1: Config structure validation round-trip
   *
   * For any JSON object, if validateConfig accepts it (returns non-null), then the result
   * must have all three platform keys (stripe, appStore, playStore) each containing both
   * basic and pro string entries. Conversely, for any JSON object missing any of these
   * required keys, validateConfig must return null.
   *
   * Validates: Requirements 1.1, 1.2, 1.4
   */
  test('Property 1: Valid configs are accepted and have correct structure', { timeout: 60000 }, () => {
    fc.assert(
      fc.property(validConfigArb, (config) => {
        const result = validateConfig(config);

        // A valid config must be accepted
        expect(result).not.toBeNull();

        // The result must have all three platform keys with basic and pro strings
        expect(typeof result!.stripe.basic).toBe('string');
        expect(result!.stripe.basic.length).toBeGreaterThan(0);
        expect(typeof result!.stripe.pro).toBe('string');
        expect(result!.stripe.pro.length).toBeGreaterThan(0);

        expect(typeof result!.appStore.basic).toBe('string');
        expect(result!.appStore.basic.length).toBeGreaterThan(0);
        expect(typeof result!.appStore.pro).toBe('string');
        expect(result!.appStore.pro.length).toBeGreaterThan(0);

        expect(typeof result!.playStore.basic).toBe('string');
        expect(result!.playStore.basic.length).toBeGreaterThan(0);
        expect(typeof result!.playStore.pro).toBe('string');
        expect(result!.playStore.pro.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 },
    );
  });

  test('Property 1: Configs missing required platform keys are rejected', { timeout: 60000 }, () => {
    const platformKey = fc.constantFrom('stripe', 'appStore', 'playStore');

    fc.assert(
      fc.property(validConfigArb, platformKey, (config, keyToRemove) => {
        // Create a copy with one platform key removed
        const broken = { ...config } as Record<string, unknown>;
        delete broken[keyToRemove];

        expect(validateConfig(broken)).toBeNull();
      }),
      { numRuns: 100 },
    );
  });

  test('Property 1: Configs missing required tier keys are rejected', { timeout: 60000 }, () => {
    const platformKey = fc.constantFrom<keyof PlanIdConfig>('stripe', 'appStore', 'playStore');
    const tierKey = fc.constantFrom<'basic' | 'pro'>('basic', 'pro');

    fc.assert(
      fc.property(validConfigArb, platformKey, tierKey, (config, platform, tier) => {
        // Deep clone and remove one tier key from one platform
        const broken = JSON.parse(JSON.stringify(config));
        delete broken[platform][tier];

        expect(validateConfig(broken)).toBeNull();
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Feature: plan-id-configuration, Property 2: Config load and tier resolution round-trip
   *
   * For any valid PlanIdConfig with unique product IDs across all platforms, building the
   * reverse-lookup map and then resolving the tier for each configured product ID shall
   * return the expected tier (BASIC for basic entries, PRO for pro entries).
   *
   * Validates: Requirements 2.2, 3.1, 3.2, 3.3, 3.4, 3.6
   */
  test('Property 2: Reverse lookup map resolves every configured ID to the correct tier', { timeout: 60000 }, () => {
    fc.assert(
      fc.property(validConfigArb, (config) => {
        const map = buildReverseLookupMap(config);

        // Every basic entry resolves to BASIC
        expect(map[config.stripe.basic]).toBe(Tier.BASIC);
        expect(map[config.appStore.basic]).toBe(Tier.BASIC);
        expect(map[config.playStore.basic]).toBe(Tier.BASIC);

        // Every pro entry resolves to PRO
        expect(map[config.stripe.pro]).toBe(Tier.PRO);
        expect(map[config.appStore.pro]).toBe(Tier.PRO);
        expect(map[config.playStore.pro]).toBe(Tier.PRO);
      }),
      { numRuns: 100 },
    );
  });

  test('Property 2: Reverse lookup map contains exactly the configured product IDs', { timeout: 60000 }, () => {
    fc.assert(
      fc.property(validConfigArb, (config) => {
        const map = buildReverseLookupMap(config);
        const ids = allProductIds(config);

        // Map keys should be exactly the set of configured product IDs
        const mapKeys = new Set(Object.keys(map));
        expect(mapKeys).toEqual(ids);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Feature: plan-id-configuration, Property 3: Malformed config rejection
   *
   * For any string that is not valid JSON, or any JSON object that is missing required
   * platform/tier keys, or any config where a plan ID value is not a non-empty string,
   * validateConfig shall return null.
   *
   * Validates: Requirements 2.4
   */
  test('Property 3: Non-object inputs are rejected', { timeout: 60000 }, () => {
    const nonObjectArb = fc.oneof(
      fc.constant(null),
      fc.constant(undefined),
      fc.integer(),
      fc.string(),
      fc.boolean(),
      fc.array(fc.anything()),
    );

    fc.assert(
      fc.property(nonObjectArb, (input) => {
        expect(validateConfig(input)).toBeNull();
      }),
      { numRuns: 100 },
    );
  });

  test('Property 3: Configs with non-string tier values are rejected', { timeout: 60000 }, () => {
    const platformKey = fc.constantFrom<keyof PlanIdConfig>('stripe', 'appStore', 'playStore');
    const tierKey = fc.constantFrom<'basic' | 'pro'>('basic', 'pro');
    const nonStringArb = fc.oneof(
      fc.integer(),
      fc.boolean(),
      fc.constant(null),
      fc.constant(undefined),
      fc.array(fc.anything()),
    );

    fc.assert(
      fc.property(validConfigArb, platformKey, tierKey, nonStringArb, (config, platform, tier, badValue) => {
        const broken = JSON.parse(JSON.stringify(config));
        broken[platform][tier] = badValue;

        expect(validateConfig(broken)).toBeNull();
      }),
      { numRuns: 100 },
    );
  });

  test('Property 3: Configs with empty string tier values are rejected', { timeout: 60000 }, () => {
    const platformKey = fc.constantFrom<keyof PlanIdConfig>('stripe', 'appStore', 'playStore');
    const tierKey = fc.constantFrom<'basic' | 'pro'>('basic', 'pro');

    fc.assert(
      fc.property(validConfigArb, platformKey, tierKey, (config, platform, tier) => {
        const broken = JSON.parse(JSON.stringify(config));
        broken[platform][tier] = '';

        expect(validateConfig(broken)).toBeNull();
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Feature: plan-id-configuration, Property 4: Unknown plan ID fallback to FREE
   *
   * For any valid PlanIdConfig and for any product ID string that does not appear in any
   * platform entry of that config, resolving the tier using the reverse-lookup map shall
   * return undefined (which means it would fall back to FREE).
   *
   * Validates: Requirements 3.5
   */
  test('Property 4: Unknown plan IDs are not in the reverse lookup map (fallback to FREE)', { timeout: 60000 }, () => {
    fc.assert(
      fc.property(validConfigArb, fc.string({ minLength: 1, maxLength: 50 }), (config, unknownId) => {
        const ids = allProductIds(config);

        // Pre-condition: the random string must not be one of the configured IDs
        fc.pre(!ids.has(unknownId));

        const map = buildReverseLookupMap(config);

        // Unknown ID should not be an own property of the map — caller falls back to FREE
        expect(Object.prototype.hasOwnProperty.call(map, unknownId)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Feature: plan-id-configuration, Property 5: getPlanIds returns correct platform-specific IDs
   *
   * For any valid PlanIdConfig and for any payment platform (Stripe, App Store, Play Store),
   * calling getPlanIds(platform) shall return the basicPlanId and proPlanId that match the
   * corresponding entries in the config for that platform.
   *
   * Validates: Requirements 2.5, 6.1
   */
  test('Property 5: getPlanIds returns correct IDs for each platform', { timeout: 60000 }, () => {
    const platformArb = fc.constantFrom(
      PaymentProvider.STRIPE,
      PaymentProvider.APPLE_APP_STORE,
      PaymentProvider.GOOGLE_PLAY_STORE,
    );

    const platformToConfigKey: Record<PaymentProvider, keyof PlanIdConfig> = {
      [PaymentProvider.STRIPE]: 'stripe',
      [PaymentProvider.APPLE_APP_STORE]: 'appStore',
      [PaymentProvider.GOOGLE_PLAY_STORE]: 'playStore',
    };

    fc.assert(
      fc.property(validConfigArb, platformArb, (config, platform) => {
        const result = getPlanIds(config, platform);
        const configKey = platformToConfigKey[platform];

        expect(result.basicPlanId).toBe(config[configKey].basic);
        expect(result.proPlanId).toBe(config[configKey].pro);
      }),
      { numRuns: 100 },
    );
  });
});
