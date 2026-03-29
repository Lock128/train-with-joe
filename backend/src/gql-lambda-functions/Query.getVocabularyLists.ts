import { VocabularyListRepository } from '../repositories/vocabulary-list-repository';

/**
 * Lambda resolver for Query.getVocabularyLists
 * Returns all vocabulary lists for the authenticated user
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
    const repository = VocabularyListRepository.getInstance();
    return await repository.getAllByUserId(userId);
  } catch (error) {
    console.error('Error getting vocabulary lists:', error);
    return [];
  }
};
