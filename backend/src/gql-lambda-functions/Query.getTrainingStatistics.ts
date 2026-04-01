import { TrainingService } from '../services/training-service';

/**
 * Lambda resolver for Query.getTrainingStatistics
 * Returns statistics for a specific training
 */

interface Event {
  arguments: {
    trainingId: string;
  };
  identity: {
    sub: string;
  };
}

export const handler = async (event: Event) => {
  const userId = event.identity?.sub;
  const { trainingId } = event.arguments;

  if (!userId) {
    return {
      success: false,
      statistics: null,
      error: 'Authentication required',
    };
  }

  try {
    const service = TrainingService.getInstance();
    return await service.getTrainingStatistics(trainingId, userId);
  } catch (error) {
    console.error('Error getting training statistics:', error);
    return {
      success: false,
      statistics: null,
      error: error instanceof Error ? error.message : 'Failed to get training statistics',
    };
  }
};
