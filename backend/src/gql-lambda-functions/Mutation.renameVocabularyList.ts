import { VocabularyListRepository } from '../repositories/vocabulary-list-repository';

/**
 * Lambda resolver for Mutation.renameVocabularyList
 * Renames a vocabulary list owned by the authenticated user
 */

interface Event {
  arguments: {
    input: {
      id: string;
      title: string;
    };
  };
  identity: {
    sub: string;
  };
}

export const handler = async (event: Event) => {
  const userId = event.identity?.sub;
  const { id, title } = event.arguments.input;

  if (!userId) {
    return { success: false, vocabularyList: null, error: 'Authentication required' };
  }

  if (!id || !title?.trim()) {
    return { success: false, vocabularyList: null, error: 'ID and non-empty title are required' };
  }

  try {
    const repository = VocabularyListRepository.getInstance();
    const vocabularyList = await repository.getById(id);

    if (!vocabularyList || vocabularyList.userId !== userId) {
      return { success: false, vocabularyList: null, error: 'Vocabulary list not found' };
    }

    const updated = await repository.update(id, { title: title.trim() });

    return { success: true, vocabularyList: updated, error: null };
  } catch (error) {
    console.error('Error renaming vocabulary list:', error);
    return {
      success: false,
      vocabularyList: null,
      error: error instanceof Error ? error.message : 'Failed to rename vocabulary list',
    };
  }
};
