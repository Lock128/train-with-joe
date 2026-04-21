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

const mockGetById = vi.fn();
const mockUpdate = vi.fn();

vi.mock('../src/repositories/vocabulary-list-repository', () => ({
  VocabularyListRepository: {
    getInstance: vi.fn(() => ({
      getById: mockGetById,
      update: mockUpdate,
    })),
  },
}));

import { handler } from '../src/gql-lambda-functions/Mutation.translateRecognizedWords';

describe('Mutation.translateRecognizedWords handler', () => {
  const userId = 'user-123';
  const vocabularyListId = 'list-abc';
  const targetLanguage = 'English';

  const recognizedList = {
    id: vocabularyListId,
    userId,
    title: 'Menu at Café',
    status: 'RECOGNIZED',
    sourceLanguage: 'French',
    sourceImageKeys: ['uploads/user-123/img1.jpg'],
    words: [{ word: 'croissant', definition: 'Recognized word' }],
    isPublic: 'false',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };

  const makeEvent = (overrides?: Partial<{ vocabularyListId: string; targetLanguage: string; sub: any }>) => ({
    arguments: {
      input: {
        vocabularyListId: overrides?.vocabularyListId ?? vocabularyListId,
        targetLanguage: overrides?.targetLanguage ?? targetLanguage,
      },
    },
    identity: { sub: overrides && 'sub' in overrides ? overrides.sub : userId },
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetById.mockResolvedValue(recognizedList);
    mockUpdate.mockImplementation((_id: string, updates: any) =>
      Promise.resolve({ ...recognizedList, ...updates, updatedAt: new Date().toISOString() }),
    );
    mockLambdaSend.mockResolvedValue({});
  });

  test('should transition RECOGNIZED → TRANSLATING and invoke processor async', async () => {
    const result = await handler(makeEvent());

    expect(result.success).toBe(true);
    expect(result.vocabularyList).toBeDefined();
    expect(result.error).toBeNull();

    // Verify status update to TRANSLATING
    expect(mockUpdate).toHaveBeenCalledWith(vocabularyListId, {
      status: 'TRANSLATING',
      targetLanguage,
    });

    // Verify async Lambda invocation
    expect(mockLambdaSend).toHaveBeenCalledTimes(1);
    const invokeCommand = mockLambdaSend.mock.calls[0][0];
    const payload = JSON.parse(invokeCommand.input.Payload);
    expect(payload.phase).toBe('translate');
    expect(payload.vocabularyListId).toBe(vocabularyListId);
    expect(payload.userId).toBe(userId);
    expect(payload.targetLanguage).toBe(targetLanguage);
    expect(payload.sourceLanguage).toBe('French');
  });

  test('should return error when vocabulary list is not found', async () => {
    mockGetById.mockResolvedValue(null);

    const result = await handler(makeEvent());

    expect(result.success).toBe(false);
    expect(result.vocabularyList).toBeNull();
    expect(result.error).toBe('Vocabulary list not found');
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockLambdaSend).not.toHaveBeenCalled();
  });

  test('should return error when list is owned by a different user', async () => {
    mockGetById.mockResolvedValue({ ...recognizedList, userId: 'other-user' });

    const result = await handler(makeEvent());

    expect(result.success).toBe(false);
    expect(result.vocabularyList).toBeNull();
    expect(result.error).toBe('Vocabulary list not found');
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockLambdaSend).not.toHaveBeenCalled();
  });

  test('should return error when status is not RECOGNIZED', async () => {
    mockGetById.mockResolvedValue({ ...recognizedList, status: 'PENDING' });

    const result = await handler(makeEvent());

    expect(result.success).toBe(false);
    expect(result.vocabularyList).toBeNull();
    expect(result.error).toBe('Vocabulary list is not ready for translation');
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockLambdaSend).not.toHaveBeenCalled();
  });

  test('should return error when status is COMPLETED', async () => {
    mockGetById.mockResolvedValue({ ...recognizedList, status: 'COMPLETED' });

    const result = await handler(makeEvent());

    expect(result.success).toBe(false);
    expect(result.error).toBe('Vocabulary list is not ready for translation');
  });

  test('should return error when status is TRANSLATING', async () => {
    mockGetById.mockResolvedValue({ ...recognizedList, status: 'TRANSLATING' });

    const result = await handler(makeEvent());

    expect(result.success).toBe(false);
    expect(result.error).toBe('Vocabulary list is not ready for translation');
  });

  test('should return error when authentication is missing', async () => {
    const result = await handler(makeEvent({ sub: undefined as any }));

    expect(result.success).toBe(false);
    expect(result.vocabularyList).toBeNull();
    expect(result.error).toBe('Authentication required');
    expect(mockGetById).not.toHaveBeenCalled();
  });

  test('should return error when repository update fails', async () => {
    mockUpdate.mockRejectedValue(new Error('DynamoDB write failed'));

    const result = await handler(makeEvent());

    expect(result.success).toBe(false);
    expect(result.vocabularyList).toBeNull();
    expect(result.error).toBe('DynamoDB write failed');
    expect(mockLambdaSend).not.toHaveBeenCalled();
  });

  test('should return error when Lambda invoke fails', async () => {
    mockLambdaSend.mockRejectedValue(new Error('Lambda invoke failed'));

    const result = await handler(makeEvent());

    expect(result.success).toBe(false);
    expect(result.vocabularyList).toBeNull();
    expect(result.error).toBe('Lambda invoke failed');
  });

  test('should return generic error message for non-Error throws', async () => {
    mockGetById.mockRejectedValue('string error');

    const result = await handler(makeEvent());

    expect(result.success).toBe(false);
    expect(result.vocabularyList).toBeNull();
    expect(result.error).toBe('Failed to start translation');
  });

  test('should pass sourceImageKeys from the vocabulary list to the processor', async () => {
    const result = await handler(makeEvent());

    expect(result.success).toBe(true);
    const invokeCommand = mockLambdaSend.mock.calls[0][0];
    const payload = JSON.parse(invokeCommand.input.Payload);
    expect(payload.imageS3Keys).toEqual(['uploads/user-123/img1.jpg']);
  });
});
