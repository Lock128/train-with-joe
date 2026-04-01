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
    return await service.getTrainings(userId);
  } catch (error) {
    console.error('Error getting trainings:', error);
    return [];
  }
};
