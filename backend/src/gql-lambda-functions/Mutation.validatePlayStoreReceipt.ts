import { SubscriptionRepository } from '../repositories/subscription-repository';
import { getPaymentService } from '../services/payment-service';
import { PricingService } from '../services/pricing-service';
import type { Subscription } from '../model/domain/Subscription';

/**
 * Lambda resolver for Mutation.validatePlayStoreReceipt
 * Validates Play Store receipt and creates/updates subscription
 */

interface ValidatePlayStoreReceiptInput {
  purchaseToken: string;
  productId: string;
}

interface Event {
  arguments: {
    input: ValidatePlayStoreReceiptInput;
  };
  identity: {
    sub: string;
  };
}

export const handler = async (event: Event) => {
  const userId = event.identity?.sub;
  const { input } = event.arguments;

  if (!userId) {
    return {
      success: false,
      subscription: null,
      error: 'Authentication required',
    };
  }

  if (!input || !input.purchaseToken || !input.productId) {
    return {
      success: false,
      subscription: null,
      error: 'Purchase token and product ID are required',
    };
  }

  try {
    const paymentService = getPaymentService();
    const validation = await paymentService.validatePlayStoreReceipt(input.purchaseToken, input.productId);

    if (!validation.valid) {
      return {
        success: false,
        subscription: null,
        error: validation.error || 'Invalid receipt',
      };
    }

    // Create or update subscription
    const subscriptionRepository = SubscriptionRepository.getInstance();
    const existingSubscription = await subscriptionRepository.getByUserId(userId);

    const subscriptionData: Subscription = {
      id: existingSubscription?.id || `playstore_${validation.subscriptionId}`,
      userId,
      provider: 'GOOGLE_PLAY_STORE',
      status: 'ACTIVE',
      planId: input.productId,
      externalId: validation.subscriptionId,
      currentPeriodEnd: validation.expiresAt,
      createdAt: existingSubscription?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    let subscription: Subscription;
    if (existingSubscription) {
      subscription = await subscriptionRepository.update(existingSubscription.id, subscriptionData);
    } else {
      subscription = await subscriptionRepository.create(subscriptionData);
    }

    // Sync user tier after receipt validation
    await PricingService.getInstance().resolveAndUpdateTier(userId);

    return {
      success: true,
      subscription,
      error: null,
    };
  } catch (error) {
    console.error('Error validating Play Store receipt:', error);
    return {
      success: false,
      subscription: null,
      error: error instanceof Error ? error.message : 'Failed to validate receipt',
    };
  }
};
