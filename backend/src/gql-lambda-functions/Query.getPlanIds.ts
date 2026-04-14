import { PricingService } from '../services/pricing-service';
import { PaymentProvider } from '../model/domain/User';

/**
 * Lambda resolver for Query.getPlanIds
 * Returns the plan IDs for a specified payment platform.
 */

interface Event {
  arguments: {
    platform: string;
  };
  identity: {
    sub: string;
  };
}

export const handler = async (event: Event) => {
  try {
    const platform = event.arguments.platform as PaymentProvider;

    if (!Object.values(PaymentProvider).includes(platform)) {
      return {
        success: false,
        planIds: null,
        error: `Invalid platform: ${platform}`,
      };
    }

    const pricingService = PricingService.getInstance();
    await pricingService.initialize();
    const { basicPlanId, proPlanId } = pricingService.getPlanIds(platform);

    return {
      success: true,
      planIds: {
        basicPlanId,
        proPlanId,
      },
      error: null,
    };
  } catch (error) {
    console.error('Error getting plan IDs:', error);
    return {
      success: false,
      planIds: null,
      error: error instanceof Error ? error.message : 'Failed to get plan IDs',
    };
  }
};
