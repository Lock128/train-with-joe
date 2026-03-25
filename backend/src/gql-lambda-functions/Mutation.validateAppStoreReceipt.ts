import { SubscriptionRepository } from '../repositories/subscription-repository';
import { getPaymentService } from '../services/payment-service';
import type { Subscription } from '../model/domain/Subscription';

/**
 * Lambda resolver for Mutation.validateAppStoreReceipt
 * Validates App Store receipt and creates/updates subscription
 */

interface ValidateAppStoreReceiptInput {
  receiptData: string;
}

interface Event {
  arguments: {
    input: ValidateAppStoreReceiptInput;
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

  if (!input || !input.receiptData) {
    return {
      success: false,
      subscription: null,
      error: 'Receipt data is required',
    };
  }

  try {
    const paymentService = getPaymentService();
    const validation = await paymentService.validateAppStoreReceipt(input.receiptData);

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
      id: existingSubscription?.id || `appstore_${validation.subscriptionId}`,
      userId,
      provider: 'APPLE_APP_STORE',
      status: 'ACTIVE',
      planId: 'appstore-subscription',
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

    return {
      success: true,
      subscription,
      error: null,
    };
  } catch (error) {
    console.error('Error validating App Store receipt:', error);
    return {
      success: false,
      subscription: null,
      error: error instanceof Error ? error.message : 'Failed to validate receipt',
    };
  }
};
