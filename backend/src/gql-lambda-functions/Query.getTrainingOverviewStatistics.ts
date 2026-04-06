import { TrainingService } from '../services/training-service';

const ADMIN_EMAILS = ['johannes.koch@gmail.com'];

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
    claims?: {
      email?: string;
    };
  };
}

export const handler = async (event: Event) => {
  const callerUserId = event.identity?.sub;
  const callerEmail = event.identity?.claims?.email;
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
    if (!callerEmail || !ADMIN_EMAILS.includes(callerEmail)) {
      return {
        success: false,
        statistics: null,
        error: "Not authorized to view other users' statistics",
      };
    }
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
