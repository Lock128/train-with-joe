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
    // Filter out corrupt/incomplete records that would fail GraphQL non-null validation
    return trainings.filter((t) => t.name && t.mode && t.vocabularyListIds && t.words && t.createdAt && t.updatedAt);
  } catch (error) {
    console.error('Error getting trainings:', error);
    return [];
  }
};
