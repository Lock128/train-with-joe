import { TrainingService } from '../services/training-service';
import { UserRepository } from '../repositories/user-repository';

const ADMIN_EMAILS = ['johannes.koch@gmail.com', 'lockhead+joe1@lockhead.info'];

/**
 * Lambda resolver for Query.getTrainingOverviewStatistics
 * Returns per-day training count and total learning time across a date range
 * Admins can view statistics for other users by providing a userId
 */

interface Event {
  arguments: {
    fromDate: string;
    toDate: string;
    userId?: string;
  };
  identity: {
    sub: string;
    username?: string;
    claims: Record<string, string>;
  };
}

export const handler = async (event: Event) => {
  console.log('[DEBUG] Full event.identity:', JSON.stringify(event.identity, null, 2));
  console.log('[DEBUG] Full event.arguments:', JSON.stringify(event.arguments, null, 2));
  const callerUserId = event.identity?.sub;
  const { fromDate, toDate, userId: targetUserId } = event.arguments;

  if (!callerUserId) {
    return {
      success: false,
      statistics: null,
      error: 'Authentication required',
    };
  }

  let effectiveUserId = callerUserId;
  if (targetUserId) {
    // Extract email from JWT claims — AppSync may place it under different keys
    const claims = event.identity?.claims ?? {};
    let callerEmail: string | undefined = claims.email ?? claims['cognito:email'] ?? claims['custom:email'];
    console.log(
      '[AdminAuth] getTrainingOverviewStatistics — callerUserId:',
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
        console.log('[AdminAuth] Looking up user by id:', callerUserId, 'table:', process.env.USERS_TABLE_NAME);
        const callerUser = await userRepo.getById(callerUserId);
        console.log('[AdminAuth] DB lookup returned:', JSON.stringify(callerUser));
        callerEmail = callerUser?.email;
        console.log('[AdminAuth] DB email lookup result:', callerEmail);
      } catch (dbError) {
        console.error('[AdminAuth] DB lookup failed:', dbError);
      }
    }
    const isAdmin = callerEmail != null && ADMIN_EMAILS.includes(callerEmail);
    console.log('[AdminAuth] email:', callerEmail, 'isAdmin:', isAdmin);
    if (!callerEmail || !isAdmin) {
      console.warn('[AdminAuth] DENIED — getTrainingOverviewStatistics for targetUserId:', targetUserId);
      return {
        success: false,
        statistics: null,
        error: "Not authorized to view other users' statistics",
      };
    }
    console.log('[AdminAuth] GRANTED — viewing stats for user:', targetUserId);
    effectiveUserId = targetUserId;
  }

  try {
    const service = TrainingService.getInstance();
    return await service.getTrainingOverviewStatistics(effectiveUserId, fromDate, toDate);
  } catch (error) {
    console.error('Error getting training overview statistics:', error);
    return {
      success: false,
      statistics: null,
      error: error instanceof Error ? error.message : 'Failed to get training overview statistics',
    };
  }
};
