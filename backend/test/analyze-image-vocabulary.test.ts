import { describe, test, expect, vi, beforeEach } from 'vitest';

const { mockSend } = vi.hoisted(() => ({
  mockSend: vi.fn(),
}));

vi.mock('@aws-sdk/client-s3', () => {
  return {
    S3Client: class {
      send = mockSend;
    },
    GetObjectCommand: class {
      constructor(public input: any) {}
    },
  };
});

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
    mockSend.mockResolvedValue({
      Body: {
        transformToByteArray: () => Promise.resolve(new Uint8Array(Buffer.from('imagedata'))),
      },
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
    mockCreate.mockImplementation((list: any) => Promise.resolve(list));

    const event = {
      arguments: {
        input: {
          imageS3Keys: ['uploads/user-123/image1.jpg'],
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
    expect(result.vocabularyList.sourceImageKey).toBe('uploads/user-123/image1.jpg');
    expect(result.error).toBeNull();
    expect(mockAnalyzeImageForVocabulary).toHaveBeenCalledWith(
      Buffer.from(new Uint8Array(Buffer.from('imagedata'))).toString('base64'),
      'user-123',
      'English',
    );
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  test('should return error when authentication is missing', async () => {
    const event = {
      arguments: {
        input: {
          imageS3Keys: ['uploads/user-123/image1.jpg'],
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

  test('should return error when imageS3Keys is empty', async () => {
    const event = {
      arguments: {
        input: {
          imageS3Keys: [],
        },
      },
      identity: {
        sub: 'user-123',
      },
    };

    const result = await handler(event);

    expect(result.success).toBe(false);
    expect(result.vocabularyList).toBeNull();
    expect(result.error).toBe('At least one image S3 key is required');
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
    expect(result.error).toBe('At least one image S3 key is required');
  });

  test('should return error when AI service throws', async () => {
    mockAnalyzeImageForVocabulary.mockRejectedValue(new Error('Model invocation failed'));

    const event = {
      arguments: {
        input: {
          imageS3Keys: ['uploads/user-123/image1.jpg'],
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
          imageS3Keys: ['uploads/user-123/image1.jpg'],
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
          imageS3Keys: ['uploads/user-123/image1.jpg'],
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
