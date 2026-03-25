import { SubscriptionRepository } from '../repositories/subscription-repository';
import { getPaymentService } from '../services/payment-service';

/**
 * Lambda resolver for Mutation.cancelSubscription
 * Cancels the current user's subscription
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
      subscription: null,
      error: 'Authentication required',
    };
  }

  try {
    const subscriptionRepository = SubscriptionRepository.getInstance();
    const subscription = await subscriptionRepository.getByUserId(userId);

    if (!subscription) {
      return {
        success: false,
        subscription: null,
        error: 'No active subscription found',
      };
    }

    const paymentService = getPaymentService();

    // Cancel based on provider
    if (subscription.provider === 'STRIPE' && subscription.id) {
      await paymentService.cancelStripeSubscription(subscription.id);
    } else {
      // For app store subscriptions, user must cancel through their app store account
      return {
        success: false,
        subscription: null,
        error: 'App store subscriptions must be cancelled through your app store account',
      };
    }

    // Fetch updated subscription
    const updatedSubscription = await subscriptionRepository.getById(subscription.id);

    return {
      success: true,
      subscription: updatedSubscription,
      error: null,
    };
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    return {
      success: false,
      subscription: null,
      error: error instanceof Error ? error.message : 'Failed to cancel subscription',
    };
  }
};
