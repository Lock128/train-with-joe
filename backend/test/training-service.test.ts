import { describe, test, expect, beforeEach } from 'vitest';
import { TrainingService } from '../src/services/training-service';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
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
