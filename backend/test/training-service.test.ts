import { describe, test, expect, beforeEach } from 'vitest';
import { TrainingService } from '../src/services/training-service';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import type { Training, TrainingExecution } from '../src/model/domain/Training';

/**
 * Unit Tests for Training Service - Edge Cases
 */

const ddbMock = mockClient(DynamoDBDocumentClient);

const VOCAB_TABLE = 'train-with-joe-vocabulary-lists-sandbox';

describe('Training Service Unit Tests', () => {
  beforeEach(() => {
    ddbMock.reset();
  });

  describe('createTraining', () => {
    test('should return error when all vocabulary lists have empty words', async () => {
      const userId = 'user-123';
      const listIds = ['list-1', 'list-2'];

      ddbMock.on(GetCommand).callsFake((input) => {
        if (input.TableName === VOCAB_TABLE) {
          return {
            Item: {
              id: input.Key.id,
              userId,
              words: [],
              createdAt: '2024-01-01T00:00:00.000Z',
              updatedAt: '2024-01-01T00:00:00.000Z',
            },
          };
        }
        return {};
      });

      const service = TrainingService.getInstance();
      const result = await service.createTraining(userId, listIds, 'TEXT_INPUT');

      expect(result.success).toBe(false);
      expect(result.error).toContain('No words available');
    });
  });

  describe('updateTraining', () => {
    test('should return error when updating with empty words array', async () => {
      const userId = 'user-123';
      const trainingId = 'training#abc-123';

      const training: Training = {
        id: trainingId,
        userId,
        name: 'Test Training',
        mode: 'TEXT_INPUT',
        vocabularyListIds: ['list-1'],
        words: [{ word: 'hello', translation: 'hola', vocabularyListId: 'list-1' }],
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      ddbMock.on(GetCommand).callsFake((input) => {
        if (input.Key.id === trainingId) {
          return { Item: { ...training } };
        }
        return {};
      });

      const service = TrainingService.getInstance();
      const result = await service.updateTraining(trainingId, userId, []);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Cannot remove last word');
    });
  });

  describe('startTraining', () => {
    test('should return error when starting MC training with fewer than 3 words', async () => {
      const userId = 'user-123';
      const trainingId = 'training#abc-123';

      const training: Training = {
        id: trainingId,
        userId,
        name: 'MC Training',
        mode: 'MULTIPLE_CHOICE',
        vocabularyListIds: ['list-1'],
        words: [
          { word: 'hello', translation: 'hola', vocabularyListId: 'list-1' },
          { word: 'goodbye', translation: 'adios', vocabularyListId: 'list-1' },
        ],
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      ddbMock.on(GetCommand).callsFake((input) => {
        if (input.Key.id === trainingId) {
          return { Item: { ...training } };
        }
        return {};
      });

      const service = TrainingService.getInstance();
      const result = await service.startTraining(trainingId, userId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('at least 3 words');
    });
  });

  describe('submitAnswer', () => {
    test('should return error when submitting answer for already-completed execution', async () => {
      const userId = 'user-123';
      const executionId = 'execution#abc-123';
      const trainingId = 'training#abc-123';

      const execution: TrainingExecution = {
        id: executionId,
        trainingId,
        userId,
        startedAt: '2024-01-01T10:00:00.000Z',
        completedAt: '2024-01-01T10:05:00.000Z',
        results: [
          {
            wordIndex: 0,
            word: 'hello',
            expectedAnswer: 'hola',
            userAnswer: 'hola',
            correct: true,
          },
        ],
        correctCount: 1,
        incorrectCount: 0,
      };

      ddbMock.on(GetCommand).callsFake((input) => {
        if (input.Key.id === executionId) {
          return { Item: { ...execution } };
        }
        return {};
      });

      const service = TrainingService.getInstance();
      const result = await service.submitAnswer(executionId, userId, 1, 'some answer');

      expect(result.success).toBe(false);
      expect(result.error).toContain('already completed');
    });

    test('should return error when submitting answer for already-answered wordIndex', async () => {
      const userId = 'user-123';
      const executionId = 'execution#abc-123';
      const trainingId = 'training#abc-123';

      const execution: TrainingExecution = {
        id: executionId,
        trainingId,
        userId,
        startedAt: '2024-01-01T10:00:00.000Z',
        results: [
          {
            wordIndex: 0,
            word: 'hello',
            expectedAnswer: 'hola',
            userAnswer: 'hola',
            correct: true,
          },
        ],
        correctCount: 1,
        incorrectCount: 0,
      };

      ddbMock.on(GetCommand).callsFake((input) => {
        if (input.Key.id === executionId) {
          return { Item: { ...execution } };
        }
        return {};
      });

      const service = TrainingService.getInstance();
      const result = await service.submitAnswer(executionId, userId, 0, 'hola');

      expect(result.success).toBe(false);
      expect(result.error).toContain('already submitted');
    });
  });

  describe('getTrainingStatistics', () => {
    test('should return zero statistics with no executions', async () => {
      const userId = 'user-123';
      const trainingId = 'training#abc-123';

      const training: Training = {
        id: trainingId,
        userId,
        name: 'Empty Stats Training',
        mode: 'TEXT_INPUT',
        vocabularyListIds: ['list-1'],
        words: [
          { word: 'hello', translation: 'hola', vocabularyListId: 'list-1' },
          { word: 'goodbye', translation: 'adios', vocabularyListId: 'list-1' },
        ],
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      ddbMock.on(GetCommand).callsFake((input) => {
        if (input.Key.id === trainingId) {
          return { Item: { ...training } };
        }
        return {};
      });

      ddbMock.on(QueryCommand).resolves({
        Items: [],
      });

      const service = TrainingService.getInstance();
      const result = await service.getTrainingStatistics(trainingId, userId);

      expect(result.success).toBe(true);
      expect(result.statistics).toBeDefined();
      expect(result.statistics!.overallAccuracy).toBe(0);
      expect(result.statistics!.averageTimeSeconds).toBe(0);
      expect(result.statistics!.totalExecutions).toBe(0);
      expect(result.statistics!.mostMissedWords).toEqual([]);
      expect(result.statistics!.accuracyTrend).toEqual([]);
    });
  });
});

describe('Randomized Training Creation Edge Cases', () => {
  beforeEach(() => {
    ddbMock.reset();
  });

  /**
   * Req 1.3: Default randomizedWordCount to 10 when not specified
   */
  test('should default randomizedWordCount to 10 when not specified', async () => {
    const userId = 'user-123';
    const listIds = ['list-1', 'list-2'];

    ddbMock.on(PutCommand).resolves({});

    const service = TrainingService.getInstance();
    const result = await service.createTraining(
      userId,
      listIds,
      'TEXT_INPUT',
      undefined, // name
      undefined, // wordCount
      undefined, // direction
      undefined, // units
      true, // isRandomized
      undefined, // randomizedWordCount — not specified
    );

    expect(result.success).toBe(true);
    expect(result.training).toBeDefined();
    expect(result.training!.isRandomized).toBe(true);
    expect(result.training!.randomizedWordCount).toBe(10);
    expect(result.training!.words).toEqual([]);
  });

  /**
   * Req 1.4: randomizedWordCount > 100 is capped at 100
   */
  test('should cap randomizedWordCount at 100 when value exceeds 100', async () => {
    const userId = 'user-123';
    const listIds = ['list-1'];

    ddbMock.on(PutCommand).resolves({});

    const service = TrainingService.getInstance();
    const result = await service.createTraining(
      userId,
      listIds,
      'TEXT_INPUT',
      undefined, // name
      undefined, // wordCount
      undefined, // direction
      undefined, // units
      true, // isRandomized
      150, // randomizedWordCount — exceeds 100
    );

    expect(result.success).toBe(true);
    expect(result.training).toBeDefined();
    expect(result.training!.isRandomized).toBe(true);
    expect(result.training!.randomizedWordCount).toBe(100);
  });

  /**
   * Req 1.5: randomizedWordCount < 1 returns error
   */
  test('should return error when randomizedWordCount is 0', async () => {
    const userId = 'user-123';
    const listIds = ['list-1'];

    const service = TrainingService.getInstance();
    const result = await service.createTraining(
      userId,
      listIds,
      'TEXT_INPUT',
      undefined, // name
      undefined, // wordCount
      undefined, // direction
      undefined, // units
      true, // isRandomized
      0, // randomizedWordCount — less than 1
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe('Randomized word count must be at least 1');
    expect(result.training).toBeUndefined();
  });

  test('should return error when randomizedWordCount is negative', async () => {
    const userId = 'user-123';
    const listIds = ['list-1'];

    const service = TrainingService.getInstance();
    const result = await service.createTraining(
      userId,
      listIds,
      'TEXT_INPUT',
      undefined, // name
      undefined, // wordCount
      undefined, // direction
      undefined, // units
      true, // isRandomized
      -1, // randomizedWordCount — negative
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe('Randomized word count must be at least 1');
    expect(result.training).toBeUndefined();
  });
});

describe('Randomized Training startTraining Edge Cases', () => {
  const TRAINING_TABLE = 'train-with-joe-trainings-sandbox';

  beforeEach(() => {
    ddbMock.reset();
  });

  /**
   * Req 2.5: All attached lists deleted returns error
   */
  test('should return error when all attached vocabulary lists are deleted', async () => {
    const userId = 'user-123';
    const trainingId = 'training#rand-1';

    const training: Training = {
      id: trainingId,
      userId,
      name: 'Randomized Training',
      mode: 'TEXT_INPUT',
      direction: 'WORD_TO_TRANSLATION',
      vocabularyListIds: ['list-deleted-1', 'list-deleted-2'],
      words: [],
      isRandomized: true,
      randomizedWordCount: 10,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    };

    ddbMock.on(GetCommand).callsFake((input) => {
      if (input.TableName === TRAINING_TABLE && input.Key.id === trainingId) {
        return { Item: { ...training } };
      }
      // Vocabulary list lookups return undefined (deleted lists)
      return { Item: undefined };
    });

    const service = TrainingService.getInstance();
    const result = await service.startTraining(trainingId, userId);

    expect(result.success).toBe(false);
    expect(result.error).toContain('No words available from the selected vocabulary lists');
  });

  /**
   * Req 7.2: MULTIPLE_CHOICE with < 3 available words returns error
   */
  test('should return error when MULTIPLE_CHOICE randomized training has fewer than 3 words', async () => {
    const userId = 'user-123';
    const trainingId = 'training#rand-mc';
    const vocabListId = 'list-small';

    const training: Training = {
      id: trainingId,
      userId,
      name: 'MC Randomized Training',
      mode: 'MULTIPLE_CHOICE',
      direction: 'WORD_TO_TRANSLATION',
      vocabularyListIds: [vocabListId],
      words: [],
      isRandomized: true,
      randomizedWordCount: 10,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    };

    ddbMock.on(GetCommand).callsFake((input) => {
      if (input.TableName === TRAINING_TABLE && input.Key.id === trainingId) {
        return { Item: { ...training } };
      }
      if (input.Key.id === vocabListId) {
        return {
          Item: {
            id: vocabListId,
            userId,
            words: [
              { word: 'hello', translation: 'hola', definition: 'greeting' },
              { word: 'goodbye', translation: 'adios', definition: 'farewell' },
            ],
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
          },
        };
      }
      return { Item: undefined };
    });

    const service = TrainingService.getInstance();
    const result = await service.startTraining(trainingId, userId);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Multiple-choice requires at least 3 words');
  });

  /**
   * Req 3.2: Static training start still uses training.words
   */
  test('should use pre-stored training.words for static (non-randomized) training', async () => {
    const userId = 'user-123';
    const trainingId = 'training#static-1';

    const preStoredWords = [
      { word: 'cat', translation: 'gato', vocabularyListId: 'list-1' },
      { word: 'dog', translation: 'perro', vocabularyListId: 'list-1' },
      { word: 'bird', translation: 'pajaro', vocabularyListId: 'list-1' },
    ];

    const training: Training = {
      id: trainingId,
      userId,
      name: 'Static Training',
      mode: 'TEXT_INPUT',
      direction: 'WORD_TO_TRANSLATION',
      vocabularyListIds: ['list-1'],
      words: preStoredWords,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    };

    ddbMock.on(GetCommand).callsFake((input) => {
      if (input.TableName === TRAINING_TABLE && input.Key.id === trainingId) {
        return { Item: { ...training } };
      }
      return { Item: undefined };
    });

    ddbMock.on(PutCommand).resolves({});

    const service = TrainingService.getInstance();
    const result = await service.startTraining(trainingId, userId);

    expect(result.success).toBe(true);
    expect(result.execution).toBeDefined();
    // Static training execution should NOT have words on the execution
    expect(result.execution!.words).toBeUndefined();
    // The execution should have been created without fetching from vocab lists
    // (no vocab list GetCommand calls needed for static training)
  });
});

describe('submitAnswer dual-path', () => {
  //const TRAINING_TABLE = 'train-with-joe-trainings-sandbox';

  beforeEach(() => {
    ddbMock.reset();
  });

  /**
   * Req 2.6: Randomized execution resolves words from execution.words
   */
  test('should resolve words from execution.words for randomized training', async () => {
    const userId = 'user-123';
    const executionId = 'execution#rand-1';
    const trainingId = 'training#rand-1';

    const execution: TrainingExecution = {
      id: executionId,
      trainingId,
      userId,
      startedAt: '2024-01-01T10:00:00.000Z',
      results: [],
      words: [{ word: 'cat', translation: 'gato', vocabularyListId: 'list-1' }],
      correctCount: 0,
      incorrectCount: 0,
    };

    const training: Training = {
      id: trainingId,
      userId,
      name: 'Randomized Training',
      mode: 'TEXT_INPUT',
      direction: 'WORD_TO_TRANSLATION',
      vocabularyListIds: ['list-1'],
      words: [],
      isRandomized: true,
      randomizedWordCount: 10,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    };

    ddbMock.on(GetCommand).callsFake((input) => {
      if (input.Key.id === executionId) {
        return { Item: { ...execution } };
      }
      if (input.Key.id === trainingId) {
        return { Item: { ...training } };
      }
      return { Item: undefined };
    });

    ddbMock.on(UpdateCommand).resolves({
      Attributes: {
        ...execution,
        results: [{ wordIndex: 0, word: 'cat', expectedAnswer: 'gato', userAnswer: 'gato', correct: true }],
        correctCount: 1,
      },
    });

    const service = TrainingService.getInstance();
    const result = await service.submitAnswer(executionId, userId, 0, 'gato');

    expect(result.success).toBe(true);
    expect(result.result).toBeDefined();
    expect(result.result!.correct).toBe(true);
    expect(result.result!.expectedAnswer).toBe('gato');
    expect(result.result!.word).toBe('cat');
  });

  /**
   * Req 3.2: Static execution resolves words from training.words
   */
  test('should resolve words from training.words for static training', async () => {
    const userId = 'user-123';
    const executionId = 'execution#static-1';
    const trainingId = 'training#static-1';

    const execution: TrainingExecution = {
      id: executionId,
      trainingId,
      userId,
      startedAt: '2024-01-01T10:00:00.000Z',
      results: [],
      correctCount: 0,
      incorrectCount: 0,
    };

    const training: Training = {
      id: trainingId,
      userId,
      name: 'Static Training',
      mode: 'TEXT_INPUT',
      direction: 'WORD_TO_TRANSLATION',
      vocabularyListIds: ['list-1'],
      words: [{ word: 'dog', translation: 'perro', vocabularyListId: 'list-1' }],
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    };

    ddbMock.on(GetCommand).callsFake((input) => {
      if (input.Key.id === executionId) {
        return { Item: { ...execution } };
      }
      if (input.Key.id === trainingId) {
        return { Item: { ...training } };
      }
      return { Item: undefined };
    });

    ddbMock.on(UpdateCommand).resolves({
      Attributes: {
        ...execution,
        results: [{ wordIndex: 0, word: 'dog', expectedAnswer: 'perro', userAnswer: 'perro', correct: true }],
        correctCount: 1,
      },
    });

    const service = TrainingService.getInstance();
    const result = await service.submitAnswer(executionId, userId, 0, 'perro');

    expect(result.success).toBe(true);
    expect(result.result).toBeDefined();
    expect(result.result!.correct).toBe(true);
    expect(result.result!.expectedAnswer).toBe('perro');
    expect(result.result!.word).toBe('dog');
  });
});
