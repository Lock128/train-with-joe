import { describe, test, expect, vi, beforeEach } from 'vitest';

const { mockLambdaSend } = vi.hoisted(() => ({
  mockLambdaSend: vi.fn(),
}));

vi.mock('@aws-sdk/client-lambda', () => {
  return {
    LambdaClient: class {
      send = mockLambdaSend;
    },
    InvokeCommand: class {
      constructor(public input: any) {}
    },
  };
});

vi.mock('../src/repositories/vocabulary-list-repository', () => ({
  VocabularyListRepository: {
    getInstance: vi.fn(),
  },
}));

import { handler } from '../src/gql-lambda-functions/Mutation.analyzeImageVocabulary';
import { VocabularyListRepository } from '../src/repositories/vocabulary-list-repository';

const mockCreate = vi.fn();

describe('Mutation.analyzeImageVocabulary handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (VocabularyListRepository.getInstance as any).mockReturnValue({
      create: mockCreate,
    });
    mockCreate.mockImplementation((list: any) => Promise.resolve(list));
    mockLambdaSend.mockResolvedValue({});
  });

  test('should create a PENDING vocabulary list and invoke processor async', async () => {
    const event = {
      arguments: {
        input: {
          imageS3Keys: ['uploads/user-123/image1.jpg'],
          sourceLanguage: 'English',
        },
      },
      identity: { sub: 'user-123' },
    };

    const result = await handler(event);

    expect(result.success).toBe(true);
    expect(result.vocabularyList).toBeDefined();
    expect(result.vocabularyList.title).toBe('Analyzing...');
    expect(result.vocabularyList.status).toBe('PENDING');
    expect(result.vocabularyList.words).toEqual([]);
    expect(result.vocabularyList.sourceImageKey).toBe('uploads/user-123/image1.jpg');
    expect(result.error).toBeNull();
    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockLambdaSend).toHaveBeenCalledTimes(1);
  });

  test('should return error when authentication is missing', async () => {
    const event = {
      arguments: {
        input: { imageS3Keys: ['uploads/user-123/image1.jpg'] },
      },
      identity: { sub: undefined as any },
    };

    const result = await handler(event);

    expect(result.success).toBe(false);
    expect(result.vocabularyList).toBeNull();
    expect(result.error).toBe('Authentication required');
    expect(mockCreate).not.toHaveBeenCalled();
    expect(mockLambdaSend).not.toHaveBeenCalled();
  });

  test('should return error when imageS3Keys is empty', async () => {
    const event = {
      arguments: { input: { imageS3Keys: [] } },
      identity: { sub: 'user-123' },
    };

    const result = await handler(event);

    expect(result.success).toBe(false);
    expect(result.vocabularyList).toBeNull();
    expect(result.error).toBe('At least one image S3 key is required');
  });

  test('should return error when input is null', async () => {
    const event = {
      arguments: { input: null as any },
      identity: { sub: 'user-123' },
    };

    const result = await handler(event);

    expect(result.success).toBe(false);
    expect(result.vocabularyList).toBeNull();
    expect(result.error).toBe('At least one image S3 key is required');
  });

  test('should return error for invalid image key (wrong user prefix)', async () => {
    const event = {
      arguments: {
        input: { imageS3Keys: ['uploads/other-user/image1.jpg'] },
      },
      identity: { sub: 'user-123' },
    };

    const result = await handler(event);

    expect(result.success).toBe(false);
    expect(result.vocabularyList).toBeNull();
    expect(result.error).toBe('Invalid image key');
  });

  test('should return error when repository create fails', async () => {
    mockCreate.mockRejectedValue(new Error('DynamoDB write failed'));

    const event = {
      arguments: {
        input: { imageS3Keys: ['uploads/user-123/image1.jpg'] },
      },
      identity: { sub: 'user-123' },
    };

    const result = await handler(event);

    expect(result.success).toBe(false);
    expect(result.vocabularyList).toBeNull();
    expect(result.error).toBe('DynamoDB write failed');
    expect(mockLambdaSend).not.toHaveBeenCalled();
  });

  test('should return error when Lambda invoke fails', async () => {
    mockLambdaSend.mockRejectedValue(new Error('Lambda invoke failed'));

    const event = {
      arguments: {
        input: { imageS3Keys: ['uploads/user-123/image1.jpg'] },
      },
      identity: { sub: 'user-123' },
    };

    const result = await handler(event);

    expect(result.success).toBe(false);
    expect(result.vocabularyList).toBeNull();
    expect(result.error).toBe('Lambda invoke failed');
  });

  test('should return generic error message for non-Error throws', async () => {
    mockCreate.mockRejectedValue('string error');

    const event = {
      arguments: {
        input: { imageS3Keys: ['uploads/user-123/image1.jpg'] },
      },
      identity: { sub: 'user-123' },
    };

    const result = await handler(event);

    expect(result.success).toBe(false);
    expect(result.vocabularyList).toBeNull();
    expect(result.error).toBe('Failed to start image analysis');
  });
});
