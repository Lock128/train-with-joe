import { SubscriptionRepository } from '../repositories/subscription-repository';

/**
 * Lambda resolver for Query.getSubscriptionStatus
 * Retrieves the current user's subscription status
 */

interface Event {
  identity: {
    sub: string;
  };
}

export const handler = async (event: Event) => {
  const userId = event.identity?.sub;

  if (!userId) {
    throw new Error('Authentication required');
  }

  try {
    const subscriptionRepository = SubscriptionRepository.getInstance();
    const subscription = await subscriptionRepository.getByUserId(userId);

    return subscription;
  } catch (error) {
    console.error('Error fetching subscription status:', error);
    throw new Error(`Failed to fetch subscription status: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};
