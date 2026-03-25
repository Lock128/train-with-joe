import { getPaymentService } from '../services/payment-service';

/**
 * Lambda resolver for Mutation.createStripeCheckout
 * Creates a Stripe Checkout session for web-based subscription purchases
 */

interface CreateStripeCheckoutInput {
  planId: string;
  successUrl: string;
  cancelUrl: string;
}

interface Event {
  arguments: {
    input: CreateStripeCheckoutInput;
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
      checkoutUrl: null,
      sessionId: null,
      error: 'Authentication required',
    };
  }

  if (!input || !input.planId || !input.successUrl || !input.cancelUrl) {
    return {
      success: false,
      checkoutUrl: null,
      sessionId: null,
      error: 'planId, successUrl, and cancelUrl are required',
    };
  }

  try {
    const paymentService = getPaymentService();

    const result = await paymentService.createStripeCheckoutSession(
      userId,
      input.planId,
      input.successUrl,
      input.cancelUrl,
    );

    return {
      success: true,
      checkoutUrl: result.checkoutUrl,
      sessionId: result.sessionId,
      error: null,
    };
  } catch (error) {
    console.error('Error creating Stripe checkout session:', error);
    return {
      success: false,
      checkoutUrl: null,
      sessionId: null,
      error: error instanceof Error ? error.message : 'Failed to create checkout session',
    };
  }
};
