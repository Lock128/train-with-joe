import { TrainingRepository } from '../repositories/training-repository';

/**
 * Lambda resolver for Mutation.deleteTraining
 * Deletes a training owned by the authenticated user
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

  if (!trainingId) {
    return {
      success: false,
      training: null,
      error: 'Training ID is required',
    };
  }

  try {
    const repository = TrainingRepository.getInstance();
    const training = await repository.getById(trainingId);

    if (!training) {
      return {
        success: false,
        training: null,
        error: 'Training not found',
      };
    }

    if (training.userId !== userId) {
      return {
        success: false,
        training: null,
        error: 'Training not found',
      };
    }

    await repository.delete(trainingId);

    return {
      success: true,
      training,
      error: null,
    };
  } catch (error) {
    console.error('Error deleting training:', error);
    return {
      success: false,
      training: null,
      error: error instanceof Error ? error.message : 'Failed to delete training',
    };
  }
};
