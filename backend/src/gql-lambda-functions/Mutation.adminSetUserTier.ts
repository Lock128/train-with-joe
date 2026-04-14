import { PricingService } from '../services/pricing-service';
import { UserRepository } from '../repositories/user-repository';
import { Tier, TierSource } from '../model/domain/User';

const ADMIN_EMAILS = ['johannes.koch@gmail.com', 'lockhead+joe1@lockhead.info', 'lockhead@lockhead.info'];

/**
 * Lambda resolver for Mutation.adminSetUserTier
 * Allows admins to manually override a user's tier.
 * Sets tierSource to MANUAL to distinguish from subscription-based assignments.
 */

interface Event {
  arguments: {
    input: {
      userId: string;
      tier: Tier;
    };
  };
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
      user: null,
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
      user: null,
      error: 'Not authorized',
    };
  }

  const { userId, tier } = event.arguments.input;

  if (!userId || !tier) {
    return {
      success: false,
      user: null,
      error: 'userId and tier are required',
    };
  }

  if (!Object.values(Tier).includes(tier)) {
    return {
      success: false,
      user: null,
      error: `Invalid tier: ${tier}. Must be one of: ${Object.values(Tier).join(', ')}`,
    };
  }

  try {
    const pricingService = PricingService.getInstance();
    await pricingService.setUserTier(userId, tier, TierSource.MANUAL);

    const userRepo = UserRepository.getInstance();
    const updatedUser = await userRepo.getById(userId);

    return {
      success: true,
      user: updatedUser,
      error: null,
    };
  } catch (error) {
    console.error('Error setting user tier:', error);
    return {
      success: false,
      user: null,
      error: error instanceof Error ? error.message : 'Failed to set user tier',
    };
  }
};
