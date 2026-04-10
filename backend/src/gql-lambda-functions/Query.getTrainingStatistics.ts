import { TrainingService } from '../services/training-service';

const ADMIN_EMAILS = ['johannes.koch@gmail.com', 'lockhead+joe1@lockhead.info'];

/**
 * Lambda resolver for Query.getTrainingStatistics
 * Returns statistics for a specific training
 * Admins can view statistics for other users by providing a userId
 */

interface Event {
  arguments: {
    trainingId: string;
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
  const { trainingId, userId: targetUserId } = event.arguments;

  if (!callerUserId) {
    return {
      success: false,
      statistics: null,
      error: 'Authentication required',
    };
  }

  // If a targetUserId is provided, only admins may use it
  let effectiveUserId = callerUserId;
  if (targetUserId) {
    const callerEmail = event.identity?.claims?.email;
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
    return await service.getTrainingStatistics(trainingId, effectiveUserId);
  } catch (error) {
    console.error('Error getting training statistics:', error);
    return {
      success: false,
      statistics: null,
      error: error instanceof Error ? error.message : 'Failed to get training statistics',
    };
  }
};
