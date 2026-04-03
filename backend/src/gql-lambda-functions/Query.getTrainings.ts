import { TrainingService } from '../services/training-service';

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
    const trainings = await service.getTrainings(userId);
    // Filter out corrupt/incomplete records, then backfill missing direction for older records
    const filtered = trainings
      .filter(
        (t) =>
          t.name != null &&
          t.mode != null &&
          Array.isArray(t.vocabularyListIds) &&
          t.vocabularyListIds.length > 0 &&
          Array.isArray(t.words) &&
          t.words.length > 0 &&
          t.createdAt != null &&
          t.updatedAt != null,
      )
      .map((t) => ({
        ...t,
        direction: t.direction || 'WORD_TO_TRANSLATION',
      }));
    console.log(
      'getTrainings returning',
      filtered.length,
      'trainings, IDs:',
      filtered.map((t) => t.id),
    );
    return filtered;
  } catch (error) {
    console.error('Error getting trainings:', error);
    return [];
  }
};
