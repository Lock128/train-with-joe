import { TrainingService } from '../services/training-service';
import { UserRepository } from '../repositories/user-repository';
import { resolveUserIdFromEmail } from '../services/user-lookup-service';

const ADMIN_EMAILS = ['johannes.koch@gmail.com', 'lockhead+joe1@lockhead.info', 'lockhead@lockhead.info'];

/**
 * Lambda resolver for Query.getTrainingDayStatistics
 * Returns training statistics for a specific date
 * Admins can view statistics for other users by providing a userId
 */

interface Event {
  arguments: {
    date: string;
    userId?: string;
  };
  identity: {
    sub: string;
    username?: string;
    claims: Record<string, string>;
  };
}

export const handler = async (event: Event) => {
  const callerUserId = event.identity?.sub;
  const { date, userId: targetUserId } = event.arguments;

  if (!callerUserId) {
    return {
      success: false,
      dayStatistics: null,
      error: 'Authentication required',
    };
  }

  let effectiveUserId = callerUserId;
  if (targetUserId) {
    // Access tokens don't carry an email claim, so also check the username claim
    // (which Cognito sets to the email when email is used as the sign-in alias).
    const claims = event.identity?.claims ?? {};
    let callerEmail: string | undefined =
      claims.email ?? claims['cognito:email'] ?? claims['custom:email'] ?? claims.username ?? event.identity?.username;
    console.log(
      '[AdminAuth] getTrainingDayStatistics — callerUserId:',
      callerUserId,
      'targetUserId:',
      targetUserId,
      'jwtEmail:',
      callerEmail,
      'allClaimKeys:',
      Object.keys(claims),
    );
    if (!callerEmail) {
      console.log('[AdminAuth] JWT email claim missing, falling back to DB lookup');
      try {
        const userRepo = UserRepository.getInstance();
        const callerUser = await userRepo.getById(callerUserId);
        callerEmail = callerUser?.email;
        console.log('[AdminAuth] DB email lookup result:', callerEmail);
      } catch (dbError) {
        console.error('[AdminAuth] DB lookup failed:', dbError);
      }
    }
    const isAdmin = callerEmail != null && ADMIN_EMAILS.includes(callerEmail);
    console.log('[AdminAuth] email:', callerEmail, 'isAdmin:', isAdmin);
    if (!callerEmail || !isAdmin) {
      console.warn('[AdminAuth] DENIED — getTrainingDayStatistics for targetUserId:', targetUserId);
      return {
        success: false,
        dayStatistics: null,
        error: "Not authorized to view other users' statistics",
      };
    }
    console.log('[AdminAuth] GRANTED — viewing day stats for user:', targetUserId);
    // Resolve email to actual user ID (Cognito sub) — tries DynamoDB then Cognito
    effectiveUserId = await resolveUserIdFromEmail(targetUserId);
  }

  try {
    const service = TrainingService.getInstance();
    return await service.getTrainingDayStatistics(effectiveUserId, date);
  } catch (error) {
    console.error('Error getting training day statistics:', error);
    return {
      success: false,
      dayStatistics: null,
      error: error instanceof Error ? error.message : 'Failed to get training day statistics',
    };
  }
};
