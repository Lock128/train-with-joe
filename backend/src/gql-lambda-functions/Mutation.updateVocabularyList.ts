import { VocabularyListRepository } from '../repositories/vocabulary-list-repository';
import type { VocabularyWord } from '../model/domain/VocabularyList';

/**
 * Lambda resolver for Mutation.updateVocabularyList
 * Updates title, languages, and/or words of a vocabulary list owned by the authenticated user
 */

interface Event {
  arguments: {
    input: {
      id: string;
      title?: string;
      sourceLanguage?: string;
      targetLanguage?: string;
      words?: VocabularyWord[];
    };
  };
  identity: {
    sub: string;
  };
}

export const handler = async (event: Event) => {
  const userId = event.identity?.sub;
  const { id, title, sourceLanguage, targetLanguage, words } = event.arguments.input;

  if (!userId) {
    return { success: false, vocabularyList: null, error: 'Authentication required' };
  }

  if (!id) {
    return { success: false, vocabularyList: null, error: 'ID is required' };
  }

  try {
    const repository = VocabularyListRepository.getInstance();
    const vocabularyList = await repository.getById(id);

    if (!vocabularyList || vocabularyList.userId !== userId) {
      return { success: false, vocabularyList: null, error: 'Vocabulary list not found' };
    }

    const updates: Record<string, unknown> = {};
    if (title !== undefined) updates.title = title.trim();
    if (sourceLanguage !== undefined) updates.sourceLanguage = sourceLanguage;
    if (targetLanguage !== undefined) updates.targetLanguage = targetLanguage;
    if (words !== undefined) updates.words = words;

    if (Object.keys(updates).length === 0) {
      return { success: true, vocabularyList, error: null };
    }

    const updated = await repository.update(id, updates);

    return { success: true, vocabularyList: updated, error: null };
  } catch (error) {
    console.error('Error updating vocabulary list:', error);
    return {
      success: false,
      vocabularyList: null,
      error: error instanceof Error ? error.message : 'Failed to update vocabulary list',
    };
  }
};
