import { VocabularyListRepository } from '../repositories/vocabulary-list-repository';

/**
 * Lambda resolver for Mutation.flagWord
 * Flags a word in a vocabulary list for review by the list owner
 */

interface Event {
  arguments: {
    input: {
      vocabularyListId: string;
      word: string;
    };
  };
  identity: {
    sub: string;
  };
}

export const handler = async (event: Event) => {
  const userId = event.identity?.sub;
  const { vocabularyListId, word } = event.arguments.input;

  if (!userId) {
    return { success: false, vocabularyList: null, error: 'Authentication required' };
  }

  try {
    const repo = VocabularyListRepository.getInstance();
    const list = await repo.getById(vocabularyListId);

    if (!list) {
      return { success: false, vocabularyList: null, error: 'Vocabulary list not found' };
    }

    const wordIndex = list.words.findIndex((w) => w.word.toLowerCase() === word.toLowerCase());

    if (wordIndex === -1) {
      return { success: false, vocabularyList: null, error: 'Word not found in vocabulary list' };
    }

    list.words[wordIndex].flagged = true;

    const updated = await repo.update(vocabularyListId, { words: list.words });

    return { success: true, vocabularyList: updated, error: null };
  } catch (error) {
    console.error('Error flagging word:', error);
    return {
      success: false,
      vocabularyList: null,
      error: error instanceof Error ? error.message : 'Failed to flag word',
    };
  }
};
