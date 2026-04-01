import { TrainingService } from '../services/training-service';

/**
 * Lambda resolver for Mutation.startTraining
 * Starts a new training execution
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
      execution: null,
      error: 'Authentication required',
    };
  }

  try {
    const service = TrainingService.getInstance();
    return await service.startTraining(trainingId, userId);
  } catch (error) {
    console.error('Error starting training:', error);
    return {
      success: false,
      execution: null,
      error: error instanceof Error ? error.message : 'Failed to start training',
    };
  }
};
