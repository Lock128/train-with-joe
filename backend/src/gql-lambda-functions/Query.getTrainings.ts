import { TrainingService } from '../services/training-service';
import { TrainingRepository } from '../repositories/training-repository';

/**
 * Lambda resolver for Query.getTrainings
 * Returns all trainings for the authenticated user
 */

interface Event {
  identity: {
    sub: string;
  };
}

export const handler = async (event: Event) => {
  const userId = event.identity?.sub;

  if (!userId) {
    return [];
  }

  try {
    const service = TrainingService.getInstance();
    const trainingRepo = TrainingRepository.getInstance();
    const trainings = await service.getTrainings(userId);
    // Filter out corrupt/incomplete records, then backfill missing direction for older records
    const filtered = trainings
      .filter(
        (t) =>
          t.name != null &&
          t.mode != null &&
          Array.isArray(t.vocabularyListIds) &&
          t.vocabularyListIds.length > 0 &&
          (t.isRandomized || (Array.isArray(t.words) && t.words.length > 0)) &&
          t.createdAt != null &&
          t.updatedAt != null,
      )
      .map((t) => ({
        ...t,
        direction: t.direction || 'WORD_TO_TRANSLATION',
      }));

    // Attach executions for each training
    const withExecutions = await Promise.all(
      filtered.map(async (t) => {
        const executions = await trainingRepo.getExecutionsByTrainingId(t.id);
        return { ...t, executions };
      }),
    );

    console.log(
      'getTrainings returning',
      withExecutions.length,
      'trainings, IDs:',
      withExecutions.map((t) => t.id),
    );
    return withExecutions;
  } catch (error) {
    console.error('Error getting trainings:', error);
    return [];
  }
};
