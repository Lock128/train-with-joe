import { TrainingService } from '../services/training-service';

const ADMIN_EMAILS = ['johannes.koch@gmail.com', 'lockhead+joe1@lockhead.info'];

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
    claims?: {
      email?: string;
    };
  };
}

export const handler = async (event: Event) => {
  const callerUserId = event.identity?.sub;
  const callerEmail = event.identity?.claims?.email;
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
    if (!callerEmail || !ADMIN_EMAILS.includes(callerEmail)) {
      return {
        success: false,
        dayStatistics: null,
        error: "Not authorized to view other users' statistics",
      };
    }
    effectiveUserId = targetUserId;
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
