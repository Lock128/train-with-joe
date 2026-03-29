import { describe, test, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/services/ai-service', () => ({
  getAIService: vi.fn(),
}));

vi.mock('../src/repositories/vocabulary-list-repository', () => ({
  VocabularyListRepository: {
    getInstance: vi.fn(),
  },
}));

import { handler } from '../src/gql-lambda-functions/Mutation.analyzeImageVocabulary';
import { getAIService } from '../src/services/ai-service';
import { VocabularyListRepository } from '../src/repositories/vocabulary-list-repository';
import type { VocabularyList } from '../src/model/domain/VocabularyList';

const mockAnalyzeImageForVocabulary = vi.fn();
const mockCreate = vi.fn();

describe('Mutation.analyzeImageVocabulary handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getAIService as any).mockReturnValue({
      analyzeImageForVocabulary: mockAnalyzeImageForVocabulary,
    });
    (VocabularyListRepository.getInstance as any).mockReturnValue({
      create: mockCreate,
    });
  });

  test('should successfully analyze an image and return vocabulary list', async () => {
    const aiResult = {
      title: 'Kitchen Vocabulary',
      words: [
        {
          word: 'spatula',
          definition: 'A flat utensil used for mixing and spreading',
          partOfSpeech: 'noun',
          exampleSentence: 'Use the spatula to flip the pancake.',
          difficulty: 'easy',
        },
        {
          word: 'whisk',
          definition: 'A utensil for whipping eggs or cream',
          partOfSpeech: 'noun',
          exampleSentence: 'She used a whisk to beat the eggs.',
          difficulty: 'easy',
        },
      ],
      language: 'English',
    };

    mockAnalyzeImageForVocabulary.mockResolvedValue(aiResult);

    const createdList: VocabularyList = {
      id: 'test-uuid',
      userId: 'user-123',
      title: 'Kitchen Vocabulary',
      words: aiResult.words,
      language: 'English',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    };

    mockCreate.mockResolvedValue(createdList);

    const event = {
      arguments: {
        input: {
          imageBase64: 'base64encodedimagedata',
          language: 'English',
        },
      },
      identity: {
        sub: 'user-123',
      },
    };

    const result = await handler(event);

    expect(result.success).toBe(true);
    expect(result.vocabularyList).toBeDefined();
    expect(result.vocabularyList.title).toBe('Kitchen Vocabulary');
    expect(result.vocabularyList.words).toHaveLength(2);
    expect(result.error).toBeNull();
    expect(mockAnalyzeImageForVocabulary).toHaveBeenCalledWith('base64encodedimagedata', 'user-123', 'English');
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  test('should return error when authentication is missing', async () => {
    const event = {
      arguments: {
        input: {
          imageBase64: 'base64encodedimagedata',
        },
      },
      identity: {
        sub: undefined as any,
      },
    };

    const result = await handler(event);

    expect(result.success).toBe(false);
    expect(result.vocabularyList).toBeNull();
    expect(result.error).toBe('Authentication required');
    expect(mockAnalyzeImageForVocabulary).not.toHaveBeenCalled();
  });

  test('should return error when imageBase64 is missing', async () => {
    const event = {
      arguments: {
        input: {
          imageBase64: '',
        },
      },
      identity: {
        sub: 'user-123',
      },
    };

    const result = await handler(event);

    expect(result.success).toBe(false);
    expect(result.vocabularyList).toBeNull();
    expect(result.error).toBe('Image data is required');
    expect(mockAnalyzeImageForVocabulary).not.toHaveBeenCalled();
  });

  test('should return error when input is null', async () => {
    const event = {
      arguments: {
        input: null as any,
      },
      identity: {
        sub: 'user-123',
      },
    };

    const result = await handler(event);

    expect(result.success).toBe(false);
    expect(result.vocabularyList).toBeNull();
    expect(result.error).toBe('Image data is required');
  });

  test('should return error when AI service throws', async () => {
    mockAnalyzeImageForVocabulary.mockRejectedValue(new Error('Model invocation failed'));

    const event = {
      arguments: {
        input: {
          imageBase64: 'base64encodedimagedata',
        },
      },
      identity: {
        sub: 'user-123',
      },
    };

    const result = await handler(event);

    expect(result.success).toBe(false);
    expect(result.vocabularyList).toBeNull();
    expect(result.error).toBe('Model invocation failed');
  });

  test('should return error when repository create fails', async () => {
    mockAnalyzeImageForVocabulary.mockResolvedValue({
      title: 'Test',
      words: [{ word: 'test', definition: 'a test' }],
      language: 'English',
    });

    mockCreate.mockRejectedValue(new Error('DynamoDB write failed'));

    const event = {
      arguments: {
        input: {
          imageBase64: 'base64encodedimagedata',
        },
      },
      identity: {
        sub: 'user-123',
      },
    };

    const result = await handler(event);

    expect(result.success).toBe(false);
    expect(result.vocabularyList).toBeNull();
    expect(result.error).toBe('DynamoDB write failed');
  });

  test('should return generic error message for non-Error throws', async () => {
    mockAnalyzeImageForVocabulary.mockRejectedValue('string error');

    const event = {
      arguments: {
        input: {
          imageBase64: 'base64encodedimagedata',
        },
      },
      identity: {
        sub: 'user-123',
      },
    };

    const result = await handler(event);

    expect(result.success).toBe(false);
    expect(result.vocabularyList).toBeNull();
    expect(result.error).toBe('Failed to analyze image for vocabulary');
  });
});
