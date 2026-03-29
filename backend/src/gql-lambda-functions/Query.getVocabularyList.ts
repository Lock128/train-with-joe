import { VocabularyListRepository } from '../repositories/vocabulary-list-repository';

/**
 * Lambda resolver for Query.getVocabularyList
 * Returns a single vocabulary list by ID for the authenticated user
 */

interface Event {
  arguments: {
    id: string;
  };
  identity: {
    sub: string;
  };
}

export const handler = async (event: Event) => {
  const userId = event.identity?.sub;
  const { id } = event.arguments;

  if (!userId) {
    return null;
  }

  if (!id) {
    return null;
  }

  try {
    const repository = VocabularyListRepository.getInstance();
    const vocabularyList = await repository.getById(id);

    if (!vocabularyList) {
      return null;
    }

    // Authorization check: verify the list belongs to the requesting user
    if (vocabularyList.userId !== userId) {
      return null;
    }

    return vocabularyList;
  } catch (error) {
    console.error('Error getting vocabulary list:', error);
    return null;
  }
};
