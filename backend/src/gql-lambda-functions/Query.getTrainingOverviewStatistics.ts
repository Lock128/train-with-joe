import { TrainingService } from '../services/training-service';

/**
 * Lambda resolver for Query.getTrainingOverviewStatistics
 * Returns per-day training count and total learning time across a date range
 */

interface Event {
  arguments: {
    fromDate: string;
    toDate: string;
  };
  identity: {
    sub: string;
  };
}

export const handler = async (event: Event) => {
  const userId = event.identity?.sub;
  const { fromDate, toDate } = event.arguments;

  if (!userId) {
    return {
      success: false,
      statistics: null,
      error: 'Authentication required',
    };
  }

  try {
    const service = TrainingService.getInstance();
    return await service.getTrainingOverviewStatistics(userId, fromDate, toDate);
  } catch (error) {
    console.error('Error getting training overview statistics:', error);
    return {
      success: false,
      statistics: null,
      error: error instanceof Error ? error.message : 'Failed to get training overview statistics',
    };
  }
};
