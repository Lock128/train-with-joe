import { TrainingService } from '../services/training-service';

/**
 * Lambda resolver for Query.getTrainingDayStatistics
 * Returns training statistics for a specific date
 */

interface Event {
  arguments: {
    date: string;
  };
  identity: {
    sub: string;
  };
}

export const handler = async (event: Event) => {
  const userId = event.identity?.sub;
  const { date } = event.arguments;

  if (!userId) {
    return {
      success: false,
      dayStatistics: null,
      error: 'Authentication required',
    };
  }

  try {
    const service = TrainingService.getInstance();
    return await service.getTrainingDayStatistics(userId, date);
  } catch (error) {
    console.error('Error getting training day statistics:', error);
    return {
      success: false,
      dayStatistics: null,
      error: error instanceof Error ? error.message : 'Failed to get training day statistics',
    };
  }
};
