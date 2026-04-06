import { VocabularyListRepository } from '../repositories/vocabulary-list-repository';

/**
 * Lambda resolver for Mutation.setVocabularyListPublic
 * Toggles the public visibility of a vocabulary list owned by the authenticated user
 */

interface Event {
  arguments: {
    input: {
      id: string;
      isPublic: boolean;
    };
  };
  identity: {
    sub: string;
  };
}

export const handler = async (event: Event) => {
  const userId = event.identity?.sub;
  const { id, isPublic } = event.arguments.input;

  if (!userId) {
    return { success: false, vocabularyList: null, error: 'Authentication required' };
  }

  if (!id || typeof isPublic !== 'boolean') {
    return { success: false, vocabularyList: null, error: 'ID and isPublic flag are required' };
  }

  try {
    const repository = VocabularyListRepository.getInstance();
    const vocabularyList = await repository.getById(id);

    if (!vocabularyList || vocabularyList.userId !== userId) {
      return { success: false, vocabularyList: null, error: 'Vocabulary list not found' };
    }

    // Store as string 'true'/'false' for DynamoDB GSI partition key
    const updated = await repository.update(id, { isPublic: isPublic ? 'true' : 'false' });

    return {
      success: true,
      vocabularyList: { ...updated, isPublic: updated.isPublic === 'true' },
      error: null,
    };
  } catch (error) {
    console.error('Error setting vocabulary list public:', error);
    return {
      success: false,
      vocabularyList: null,
      error: error instanceof Error ? error.message : 'Failed to update vocabulary list visibility',
    };
  }
};
