import { VocabularyListRepository } from '../repositories/vocabulary-list-repository';

/**
 * Lambda resolver for Query.getPublicVocabularyLists
 * Returns all vocabulary lists that have been marked as public
 */

export const handler = async () => {
  try {
    const repository = VocabularyListRepository.getInstance();
    return await repository.getPublicLists();
  } catch (error) {
    console.error('Error getting public vocabulary lists:', error);
    return [];
  }
};
