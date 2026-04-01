import { TrainingService } from '../services/training-service';
import type { TrainingWord } from '../model/domain/Training';

/**
 * Lambda resolver for Mutation.updateTraining
 * Updates training words
 */

interface Event {
  arguments: {
    input: {
      trainingId: string;
      words?: TrainingWord[];
      name?: string;
    };
  };
  identity: {
    sub: string;
  };
}

export const handler = async (event: Event) => {
  const userId = event.identity?.sub;
  const { trainingId, words, name } = event.arguments.input;

  if (!userId) {
    return {
      success: false,
      training: null,
      error: 'Authentication required',
    };
  }

  try {
    const service = TrainingService.getInstance();
    return await service.updateTraining(trainingId, userId, words, name);
  } catch (error) {
    console.error('Error updating training:', error);
    return {
      success: false,
      training: null,
      error: error instanceof Error ? error.message : 'Failed to update training',
    };
  }
};
