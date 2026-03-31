import { VocabularyListRepository } from '../repositories/vocabulary-list-repository';

/**
 * Lambda resolver for Mutation.deleteVocabularyList
 * Deletes a vocabulary list owned by the authenticated user
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
    return {
      success: false,
      vocabularyList: null,
      error: 'Authentication required',
    };
  }

  if (!id) {
    return {
      success: false,
      vocabularyList: null,
      error: 'Vocabulary list ID is required',
    };
  }

  try {
    const repository = VocabularyListRepository.getInstance();
    const vocabularyList = await repository.getById(id);

    if (!vocabularyList) {
      return {
        success: false,
        vocabularyList: null,
        error: 'Vocabulary list not found',
      };
    }

    // Authorization check: verify the list belongs to the requesting user
    if (vocabularyList.userId !== userId) {
      return {
        success: false,
        vocabularyList: null,
        error: 'Vocabulary list not found',
      };
    }

    await repository.delete(id);

    return {
      success: true,
      vocabularyList,
      error: null,
    };
  } catch (error) {
    console.error('Error deleting vocabulary list:', error);
    return {
      success: false,
      vocabularyList: null,
      error: error instanceof Error ? error.message : 'Failed to delete vocabulary list',
    };
  }
};
