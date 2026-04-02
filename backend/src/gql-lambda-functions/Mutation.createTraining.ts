import { TrainingService } from '../services/training-service';
import type { TrainingMode, TrainingDirection } from '../model/domain/Training';

/**
 * Lambda resolver for Mutation.createTraining
 * Creates a new training from vocabulary lists
 */

interface Event {
  arguments: {
    input: {
      vocabularyListIds: string[];
      mode: TrainingMode;
      direction?: TrainingDirection;
      name?: string;
      wordCount?: number;
    };
  };
  identity: {
    sub: string;
  };
}

export const handler = async (event: Event) => {
  const userId = event.identity?.sub;
  const { vocabularyListIds, mode, name, wordCount, direction } = event.arguments.input;

  if (!userId) {
    return {
      success: false,
      training: null,
      error: 'Authentication required',
    };
  }

  try {
    const service = TrainingService.getInstance();
    return await service.createTraining(userId, vocabularyListIds, mode, name, wordCount, direction);
  } catch (error) {
    console.error('Error creating training:', error);
    return {
      success: false,
      training: null,
      error: error instanceof Error ? error.message : 'Failed to create training',
    };
  }
};
