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
    claims: {
      email?: string;
    };
  };
}

export const handler = async (event: Event) => {
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
    // Try JWT claim first, fall back to DB lookup
    let callerEmail = event.identity?.claims?.email;
    console.log(
      '[AdminAuth] getTrainingOverviewStatistics — callerUserId:',
      callerUserId,
      'targetUserId:',
      targetUserId,
      'jwtEmail:',
      callerEmail,
    );
    if (!callerEmail) {
      console.log('[AdminAuth] JWT email claim missing, falling back to DB lookup');
      const userRepo = UserRepository.getInstance();
      const callerUser = await userRepo.getById(callerUserId);
      callerEmail = callerUser?.email;
      console.log('[AdminAuth] DB email lookup result:', callerEmail);
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
