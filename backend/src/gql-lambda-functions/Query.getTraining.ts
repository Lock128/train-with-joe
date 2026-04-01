import { TrainingService } from '../services/training-service';

/**
 * Lambda resolver for Query.getTraining
 * Returns a training with its executions
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
      training: null,
      error: 'Authentication required',
    };
  }

  try {
    const service = TrainingService.getInstance();
    return await service.getTraining(trainingId, userId);
  } catch (error) {
    console.error('Error getting training:', error);
    return {
      success: false,
      training: null,
      error: error instanceof Error ? error.message : 'Failed to get training',
    };
  }
};
