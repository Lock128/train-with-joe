import { SpacedRepetitionService } from '../services/spaced-repetition-service';

/**
 * Lambda resolver for Query.getWordMastery
 * Returns word mastery statistics for the authenticated user
 */

interface Event {
  arguments: {
    vocabularyListIds: string[];
  };
  identity: {
    sub: string;
  };
}

export const handler = async (event: Event) => {
  const userId = event.identity?.sub;
  const { vocabularyListIds } = event.arguments;

  if (!userId) {
    return {
      success: false,
      mastery: null,
      error: 'Authentication required',
    };
  }

  if (!vocabularyListIds || vocabularyListIds.length === 0) {
    return {
      success: false,
      mastery: null,
      error: 'At least one vocabulary list ID is required',
    };
  }

  try {
    const service = SpacedRepetitionService.getInstance();
    const mastery = await service.getWordMastery(userId, vocabularyListIds);

    return {
      success: true,
      mastery,
      error: null,
    };
  } catch (error) {
    console.error('Error getting word mastery:', error);
    return {
      success: false,
      mastery: null,
      error: error instanceof Error ? error.message : 'Failed to get word mastery',
    };
  }
};
