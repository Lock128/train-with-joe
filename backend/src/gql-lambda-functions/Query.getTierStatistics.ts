import { PricingService } from '../services/pricing-service';
import { UserRepository } from '../repositories/user-repository';

const ADMIN_EMAILS = ['johannes.koch@gmail.com', 'lockhead+joe1@lockhead.info', 'lockhead@lockhead.info'];

/**
 * Lambda resolver for Query.getTierStatistics
 * Returns aggregate tier statistics across all users — admin only.
 */

interface Event {
  identity: {
    sub: string;
    username?: string;
    claims: Record<string, string>;
  };
}

export const handler = async (event: Event) => {
  const callerUserId = event.identity?.sub;

  if (!callerUserId) {
    return {
      success: false,
      statistics: null,
      error: 'Authentication required',
    };
  }

  // Admin authorization check
  const claims = event.identity?.claims ?? {};
  let callerEmail: string | undefined =
    claims.email ?? claims['cognito:email'] ?? claims['custom:email'] ?? claims.username ?? event.identity?.username;

  if (!callerEmail) {
    try {
      const userRepo = UserRepository.getInstance();
      const callerUser = await userRepo.getById(callerUserId);
      callerEmail = callerUser?.email;
    } catch (dbError) {
      console.error('[AdminAuth] DB lookup failed:', dbError);
    }
  }

  const isAdmin = callerEmail != null && ADMIN_EMAILS.includes(callerEmail);
  if (!callerEmail || !isAdmin) {
    return {
      success: false,
      statistics: null,
      error: 'Not authorized',
    };
  }

  try {
    const pricingService = PricingService.getInstance();
    const result = await pricingService.getTierStatistics();

    return {
      success: true,
      statistics: result.statistics,
      error: null,
    };
  } catch (error) {
    console.error('Error getting tier statistics:', error);
    return {
      success: false,
      statistics: null,
      error: error instanceof Error ? error.message : 'Failed to get tier statistics',
    };
  }
};
