import { getAIService } from '../services/ai-service';
import { VocabularyListRepository } from '../repositories/vocabulary-list-repository';
import type { VocabularyList } from '../model/domain/VocabularyList';

/**
 * Lambda resolver for Mutation.analyzeImageVocabulary
 * Analyzes an image using Amazon Bedrock AI to extract vocabulary words
 */

interface AnalyzeImageVocabularyInput {
  imageBase64: string;
  language?: string;
}

interface Event {
  arguments: {
    input: AnalyzeImageVocabularyInput;
  };
  identity: {
    sub: string;
  };
}

export const handler = async (event: Event) => {
  const userId = event.identity?.sub;
  const { input } = event.arguments;

  if (!userId) {
    return {
      success: false,
      vocabularyList: null,
      error: 'Authentication required',
    };
  }

  if (!input || !input.imageBase64) {
    return {
      success: false,
      vocabularyList: null,
      error: 'Image data is required',
    };
  }

  try {
    const aiService = getAIService();
    const result = await aiService.analyzeImageForVocabulary(input.imageBase64, userId, input.language);

    const repository = VocabularyListRepository.getInstance();
    const vocabularyList: VocabularyList = {
      id: crypto.randomUUID(),
      userId,
      title: result.title,
      words: result.words,
      language: result.language,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const created = await repository.create(vocabularyList);

    return {
      success: true,
      vocabularyList: created,
      error: null,
    };
  } catch (error) {
    console.error('Error analyzing image for vocabulary:', error);
    return {
      success: false,
      vocabularyList: null,
      error: error instanceof Error ? error.message : 'Failed to analyze image for vocabulary',
    };
  }
};
