import { getPaymentService } from '../services/payment-service';

/**
 * Lambda resolver for Mutation.createSubscription
 * Creates a new subscription using the specified payment provider
 */

interface CreateSubscriptionInput {
  provider: 'STRIPE' | 'APPLE_APP_STORE' | 'GOOGLE_PLAY_STORE';
  planId: string;
}

interface Event {
  arguments: {
    input: CreateSubscriptionInput;
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

  if (!input || !input.provider || !input.planId) {
    return {
      success: false,
      subscription: null,
      error: 'Provider and planId are required',
    };
  }

  try {
    const paymentService = getPaymentService();

    // Only Stripe is supported for web-based subscription creation
    if (input.provider !== 'STRIPE') {
      return {
        success: false,
        subscription: null,
        error: 'Only Stripe subscriptions can be created via API. Use app store receipts for mobile.',
      };
    }

    const subscription = await paymentService.createStripeSubscription(userId, input.planId);

    return {
      success: true,
      subscription,
      error: null,
    };
  } catch (error) {
    console.error('Error creating subscription:', error);
    return {
      success: false,
      subscription: null,
      error: error instanceof Error ? error.message : 'Failed to create subscription',
    };
  }
};
