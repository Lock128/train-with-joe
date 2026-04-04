import { TrainingService } from '../services/training-service';

/**
 * Lambda resolver for Mutation.abortTraining
 * Aborts an in-progress training execution, capturing time spent
 */

interface Event {
  arguments: {
    executionId: string;
  };
  identity: {
    sub: string;
  };
}

export const handler = async (event: Event) => {
  const userId = event.identity?.sub;
  const { executionId } = event.arguments;

  if (!userId) {
    return {
      success: false,
      execution: null,
      error: 'Authentication required',
    };
  }

  try {
    const service = TrainingService.getInstance();
    return await service.abortTraining(executionId, userId);
  } catch (error) {
    console.error('Error aborting training:', error);
    return {
      success: false,
      execution: null,
      error: error instanceof Error ? error.message : 'Failed to abort training',
    };
  }
};
