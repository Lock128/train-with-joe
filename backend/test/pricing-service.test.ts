import { describe, test, expect } from 'vitest';
import { Tier, TierSource } from '../src/model/domain/User';
import {
  canAccessAiTraining,
  getTierLimits,
  resolveTierFromSubscription,
  UpgradeRequiredError,
} from '../src/services/pricing-service';

describe('PricingService Unit Tests', () => {
  describe('canAccessAiTraining', () => {
    test('should return false for FREE tier', () => {
      expect(canAccessAiTraining(Tier.FREE)).toBe(false);
    });

    test('should return false for BASIC tier', () => {
      expect(canAccessAiTraining(Tier.BASIC)).toBe(false);
    });

    test('should return true for PRO tier', () => {
      expect(canAccessAiTraining(Tier.PRO)).toBe(true);
    });
  });

  describe('UpgradeRequiredError structure', () => {
    test('should have code UPGRADE_REQUIRED', () => {
      const error = new UpgradeRequiredError({
        currentTier: Tier.FREE,
        requiredTier: Tier.BASIC,
        limitType: 'IMAGE_SCAN',
        currentUsage: 5,
        limit: 5,
      });

      expect(error.code).toBe('UPGRADE_REQUIRED');
    });

    test('should include all required fields', () => {
      const error = new UpgradeRequiredError({
        currentTier: Tier.FREE,
        requiredTier: Tier.PRO,
        limitType: 'AI_TRAINING',
        message: 'AI training requires Pro tier',
      });

      expect(error.currentTier).toBe(Tier.FREE);
      expect(error.requiredTier).toBe(Tier.PRO);
      expect(error.limitType).toBe('AI_TRAINING');
      expect(error.message).toBe('AI training requires Pro tier');
      expect(error.name).toBe('UpgradeRequiredError');
    });

    test('should use default message when none provided', () => {
      const error = new UpgradeRequiredError({
        currentTier: Tier.BASIC,
        requiredTier: Tier.PRO,
        limitType: 'AI_TRAINING',
      });

      expect(error.message).toBe('Upgrade required: AI_TRAINING limit reached');
    });

    test('should include optional currentUsage and limit fields', () => {
      const error = new UpgradeRequiredError({
        currentTier: Tier.FREE,
        requiredTier: Tier.BASIC,
        limitType: 'VOCABULARY_LIST',
        currentUsage: 5,
        limit: 5,
      });

      expect(error.currentUsage).toBe(5);
      expect(error.limit).toBe(5);
    });

    test('should be an instance of Error', () => {
      const error = new UpgradeRequiredError({
        currentTier: Tier.FREE,
        requiredTier: Tier.BASIC,
        limitType: 'IMAGE_SCAN',
      });

      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('resolveTierFromSubscription - default FREE tier', () => {
    test('should return FREE tier when no subscription exists', () => {
      const result = resolveTierFromSubscription(undefined, undefined);
      expect(result.tier).toBe(Tier.FREE);
    });

    test('should return FREE tier with SUBSCRIPTION source when no subscription', () => {
      const result = resolveTierFromSubscription(undefined, undefined);
      expect(result.tierSource).toBe(TierSource.SUBSCRIPTION);
    });
  });

  describe('getTierLimits - missing counter defaults', () => {
    test('FREE tier should have valid limits with finite numbers', () => {
      const limits = getTierLimits(Tier.FREE);
      expect(limits.maxImageScans).toBe(5);
      expect(limits.maxVocabularyLists).toBe(5);
      expect(limits.aiTrainingEnabled).toBe(false);
    });

    test('BASIC tier should have valid limits', () => {
      const limits = getTierLimits(Tier.BASIC);
      expect(limits.maxImageScans).toBe(25);
      expect(limits.maxVocabularyLists).toBeNull();
      expect(limits.aiTrainingEnabled).toBe(false);
    });

    test('PRO tier should have unlimited limits', () => {
      const limits = getTierLimits(Tier.PRO);
      expect(limits.maxImageScans).toBeNull();
      expect(limits.maxVocabularyLists).toBeNull();
      expect(limits.aiTrainingEnabled).toBe(true);
    });

    test('all tiers should return a valid imageScanPeriod', () => {
      for (const tier of Object.values(Tier)) {
        const limits = getTierLimits(tier);
        expect(['lifetime', 'billing_period']).toContain(limits.imageScanPeriod);
      }
    });
  });
});
