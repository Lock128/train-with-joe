import { PricingService } from '../services/pricing-service';
import { UserRepository } from '../repositories/user-repository';
import { TierSource } from '../model/domain/User';

/**
 * Lambda resolver for Query.getUsageLimits
 * Returns the authenticated user's current usage counts, tier limits, and tier source.
 */

interface Event {
  identity: {
    sub: string;
  };
}

export const handler = async (event: Event) => {
  const userId = event.identity?.sub;

  if (!userId) {
    return {
      success: false,
      usageLimits: null,
      error: 'Authentication required',
    };
  }

  try {
    const pricingService = PricingService.getInstance();
    const usageStatus = await pricingService.getUsageStatus(userId);

    // Also fetch tierSource from the user record
    const userRepository = UserRepository.getInstance();
    const user = await userRepository.getById(userId);
    const tierSource = user?.tierSource ?? TierSource.SUBSCRIPTION;

    return {
      success: true,
      usageLimits: {
        tier: usageStatus.tier,
        tierSource,
        imageScansUsed: usageStatus.imageScansUsed,
        imageScansLimit: usageStatus.imageScansLimit,
        vocabularyListsUsed: usageStatus.vocabularyListsUsed,
        vocabularyListsLimit: usageStatus.vocabularyListsLimit,
        aiTrainingEnabled: usageStatus.aiTrainingEnabled,
      },
      error: null,
    };
  } catch (error) {
    console.error('Error getting usage limits:', error);
    return {
      success: false,
      usageLimits: null,
      error: error instanceof Error ? error.message : 'Failed to get usage limits',
    };
  }
};
