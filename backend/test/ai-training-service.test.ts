import { describe, test, expect, beforeEach } from 'vitest';
import { TrainingService } from '../src/services/training-service';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import type { Training, TrainingExecution } from '../src/model/domain/Training';

const ddbMock = mockClient(DynamoDBDocumentClient);
const bedrockMock = mockClient(BedrockRuntimeClient);

const VOCAB_TABLE = 'train-with-joe-vocabulary-lists-sandbox';
const TRAINING_TABLE = 'train-with-joe-trainings-sandbox';

/**
 * Helper: create a valid Bedrock response containing AI exercises for the given words
 */
function createExercisesResponse(words: { word: string }[]) {
  const exercises = words.map((w, i) => ({
    prompt: `Fill in the blank: ___ is the word for ${w.word}`,
    options: [`option_a_${i}`, `option_b_${i}`, `option_c_${i}`],
    correctOptionIndex: 0,
    exerciseType: 'fill_in_the_blank',
    sourceWord: w.word,
  }));
  return {
    body: new TextEncoder().encode(
      JSON.stringify({
        results: [{ outputText: JSON.stringify(exercises) }],
      }),
    ),
  };
}

describe('AI Training Service Unit Tests', () => {
  beforeEach(() => {
    ddbMock.reset();
    bedrockMock.reset();
  });

  describe('startTraining - AI_TRAINING static path', () => {
    test('should return error when starting AI training with 0 words', async () => {
      const userId = 'user-123';
      const trainingId = 'training#ai-empty';

      const training: Training = {
        id: trainingId,
        userId,
        name: 'Empty AI Training',
        mode: 'AI_TRAINING',
        direction: 'WORD_TO_TRANSLATION',
        vocabularyListIds: ['list-1'],
        words: [],
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      ddbMock.on(GetCommand).callsFake((input) => {
        if (input.TableName === TRAINING_TABLE && input.Key.id === trainingId) {
          return { Item: { ...training } };
        }
        return { Item: undefined };
      });

      const service = TrainingService.getInstance();
      const result = await service.startTraining(trainingId, userId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('No words available');
    });

    test('should succeed with valid words and return aiExercises', async () => {
      const userId = 'user-123';
      const trainingId = 'training#ai-valid';
      const vocabListId = 'list-1';

      const training: Training = {
        id: trainingId,
        userId,
        name: 'AI Training',
        mode: 'AI_TRAINING',
        direction: 'WORD_TO_TRANSLATION',
        vocabularyListIds: [vocabListId],
        words: [
          { word: 'hello', translation: 'hola', vocabularyListId: vocabListId },
          { word: 'goodbye', translation: 'adios', vocabularyListId: vocabListId },
        ],
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      ddbMock.on(GetCommand).callsFake((input) => {
        if (input.TableName === TRAINING_TABLE && input.Key.id === trainingId) {
          return { Item: { ...training } };
        }
        if (input.TableName === VOCAB_TABLE && input.Key.id === vocabListId) {
          return {
            Item: {
              id: vocabListId,
              userId,
              sourceLanguage: 'English',
              targetLanguage: 'Spanish',
              words: [
                { word: 'hello', translation: 'hola', definition: 'a greeting' },
                { word: 'goodbye', translation: 'adios', definition: 'a farewell' },
              ],
              createdAt: '2024-01-01T00:00:00.000Z',
              updatedAt: '2024-01-01T00:00:00.000Z',
            },
          };
        }
        return { Item: undefined };
      });

      bedrockMock.on(InvokeModelCommand).resolves(createExercisesResponse([{ word: 'hello' }, { word: 'goodbye' }]));

      ddbMock.on(PutCommand).resolves({});

      const service = TrainingService.getInstance();
      const result = await service.startTraining(trainingId, userId);

      expect(result.success).toBe(true);
      expect(result.execution).toBeDefined();
      expect(result.execution!.aiExercises).toBeDefined();
      expect(result.execution!.aiExercises!.length).toBe(2);
      expect(result.execution!.multipleChoiceOptions).toBeUndefined();
    });
  });

  describe('TEXT_INPUT training backward compatibility', () => {
    test('should not invoke Bedrock for TEXT_INPUT training', async () => {
      const userId = 'user-123';
      const trainingId = 'training#text-input';

      const training: Training = {
        id: trainingId,
        userId,
        name: 'Text Input Training',
        mode: 'TEXT_INPUT',
        direction: 'WORD_TO_TRANSLATION',
        vocabularyListIds: ['list-1'],
        words: [
          { word: 'cat', translation: 'gato', vocabularyListId: 'list-1' },
          { word: 'dog', translation: 'perro', vocabularyListId: 'list-1' },
          { word: 'bird', translation: 'pajaro', vocabularyListId: 'list-1' },
        ],
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
      expect(result.execution!.aiExercises).toBeUndefined();
      expect(bedrockMock.commandCalls(InvokeModelCommand).length).toBe(0);
    });
  });

  describe('AI answer submission', () => {
    test('should mark answer correct when selected index matches correctOptionIndex', async () => {
      const userId = 'user-123';
      const executionId = 'execution#ai-1';
      const trainingId = 'training#ai-1';

      const execution: TrainingExecution = {
        id: executionId,
        trainingId,
        userId,
        startedAt: '2024-01-01T10:00:00.000Z',
        results: [],
        aiExercises: [
          {
            prompt: 'Fill in the blank: ___ is the word for hello',
            options: ['hola', 'adios', 'gato'],
            correctOptionIndex: 0,
            exerciseType: 'fill_in_the_blank',
            sourceWord: 'hello',
          },
          {
            prompt: 'Fill in the blank: ___ is the word for goodbye',
            options: ['adios', 'hola', 'perro'],
            correctOptionIndex: 0,
            exerciseType: 'fill_in_the_blank',
            sourceWord: 'goodbye',
          },
        ],
        correctCount: 0,
        incorrectCount: 0,
      };

      const training: Training = {
        id: trainingId,
        userId,
        name: 'AI Training',
        mode: 'AI_TRAINING',
        direction: 'WORD_TO_TRANSLATION',
        vocabularyListIds: ['list-1'],
        words: [
          { word: 'hello', translation: 'hola', vocabularyListId: 'list-1' },
          { word: 'goodbye', translation: 'adios', vocabularyListId: 'list-1' },
        ],
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
          results: [
            {
              wordIndex: 0,
              word: 'Fill in the blank: ___ is the word for hello',
              expectedAnswer: 'hola',
              userAnswer: '0',
              correct: true,
            },
          ],
          correctCount: 1,
        },
      });

      const service = TrainingService.getInstance();
      const result = await service.submitAnswer(executionId, userId, 0, '0');

      expect(result.success).toBe(true);
      expect(result.result).toBeDefined();
      expect(result.result!.correct).toBe(true);
    });

    test('should mark answer incorrect when selected index does not match correctOptionIndex', async () => {
      const userId = 'user-123';
      const executionId = 'execution#ai-2';
      const trainingId = 'training#ai-2';

      const execution: TrainingExecution = {
        id: executionId,
        trainingId,
        userId,
        startedAt: '2024-01-01T10:00:00.000Z',
        results: [],
        aiExercises: [
          {
            prompt: 'Fill in the blank: ___ is the word for hello',
            options: ['hola', 'adios', 'gato'],
            correctOptionIndex: 0,
            exerciseType: 'fill_in_the_blank',
            sourceWord: 'hello',
          },
        ],
        correctCount: 0,
        incorrectCount: 0,
      };

      const training: Training = {
        id: trainingId,
        userId,
        name: 'AI Training',
        mode: 'AI_TRAINING',
        direction: 'WORD_TO_TRANSLATION',
        vocabularyListIds: ['list-1'],
        words: [{ word: 'hello', translation: 'hola', vocabularyListId: 'list-1' }],
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
          results: [
            {
              wordIndex: 0,
              word: 'Fill in the blank: ___ is the word for hello',
              expectedAnswer: 'hola',
              userAnswer: '2',
              correct: false,
            },
          ],
          incorrectCount: 1,
        },
      });

      const service = TrainingService.getInstance();
      const result = await service.submitAnswer(executionId, userId, 0, '2');

      expect(result.success).toBe(true);
      expect(result.result).toBeDefined();
      expect(result.result!.correct).toBe(false);
    });
  });

  describe('AI training completion', () => {
    test('should mark training completed after all exercises are answered', async () => {
      const userId = 'user-123';
      const executionId = 'execution#ai-complete';
      const trainingId = 'training#ai-complete';

      const execution: TrainingExecution = {
        id: executionId,
        trainingId,
        userId,
        startedAt: '2024-01-01T10:00:00.000Z',
        results: [
          {
            wordIndex: 0,
            word: 'Fill in the blank: ___ is the word for hello',
            expectedAnswer: 'hola',
            userAnswer: '0',
            correct: true,
          },
        ],
        aiExercises: [
          {
            prompt: 'Fill in the blank: ___ is the word for hello',
            options: ['hola', 'adios', 'gato'],
            correctOptionIndex: 0,
            exerciseType: 'fill_in_the_blank',
            sourceWord: 'hello',
          },
          {
            prompt: 'Fill in the blank: ___ is the word for goodbye',
            options: ['adios', 'hola', 'perro'],
            correctOptionIndex: 0,
            exerciseType: 'fill_in_the_blank',
            sourceWord: 'goodbye',
          },
        ],
        correctCount: 1,
        incorrectCount: 0,
      };

      const training: Training = {
        id: trainingId,
        userId,
        name: 'AI Training',
        mode: 'AI_TRAINING',
        direction: 'WORD_TO_TRANSLATION',
        vocabularyListIds: ['list-1'],
        words: [
          { word: 'hello', translation: 'hola', vocabularyListId: 'list-1' },
          { word: 'goodbye', translation: 'adios', vocabularyListId: 'list-1' },
        ],
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
          results: [
            ...execution.results,
            {
              wordIndex: 1,
              word: 'Fill in the blank: ___ is the word for goodbye',
              expectedAnswer: 'adios',
              userAnswer: '0',
              correct: true,
            },
          ],
          correctCount: 2,
          completedAt: '2024-01-01T10:05:00.000Z',
        },
      });

      const service = TrainingService.getInstance();
      const result = await service.submitAnswer(executionId, userId, 1, '0');

      expect(result.success).toBe(true);
      expect(result.completed).toBe(true);
    });
  });

  describe('getTrainingStatistics - AI_TRAINING', () => {
    test('should return non-empty perWordStatistics from AI exercise results', async () => {
      const userId = 'user-123';
      const trainingId = 'training#ai-stats';

      const training: Training = {
        id: trainingId,
        userId,
        name: 'AI Stats Training',
        mode: 'AI_TRAINING',
        direction: 'WORD_TO_TRANSLATION',
        vocabularyListIds: ['list-1'],
        words: [
          { word: 'hello', translation: 'hola', vocabularyListId: 'list-1' },
          { word: 'goodbye', translation: 'adios', vocabularyListId: 'list-1' },
        ],
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      const executions: TrainingExecution[] = [
        {
          id: 'execution#ai-stats-1',
          trainingId,
          userId,
          startedAt: '2024-01-01T10:00:00.000Z',
          completedAt: '2024-01-01T10:05:00.000Z',
          results: [
            {
              wordIndex: 0,
              word: 'Fill in the blank: ___ is the word for hello',
              expectedAnswer: 'hola',
              userAnswer: '0',
              correct: true,
            },
            {
              wordIndex: 1,
              word: 'Fill in the blank: ___ is the word for goodbye',
              expectedAnswer: 'adios',
              userAnswer: '2',
              correct: false,
            },
          ],
          correctCount: 1,
          incorrectCount: 1,
        },
      ];

      ddbMock.on(GetCommand).callsFake((input) => {
        if (input.Key.id === trainingId) {
          return { Item: { ...training } };
        }
        return {};
      });

      ddbMock.on(QueryCommand).resolves({
        Items: executions,
      });

      const service = TrainingService.getInstance();
      const result = await service.getTrainingStatistics(trainingId, userId);

      expect(result.success).toBe(true);
      expect(result.statistics).toBeDefined();
      expect(result.statistics!.totalExecutions).toBe(1);
      expect(result.statistics!.overallAccuracy).toBe(50);

      // AI exercise results use prompt strings as word keys, not vocabulary words
      const perWord = result.statistics!.perWordStatistics;
      expect(perWord.length).toBeGreaterThanOrEqual(2);

      // The AI prompt-based entries should be tracked
      const aiPrompt1 = perWord.find((p) => p.word === 'Fill in the blank: ___ is the word for hello');
      expect(aiPrompt1).toBeDefined();
      expect(aiPrompt1!.correctCount).toBe(1);
      expect(aiPrompt1!.totalCount).toBe(1);
      expect(aiPrompt1!.accuracyPercentage).toBe(100);

      const aiPrompt2 = perWord.find((p) => p.word === 'Fill in the blank: ___ is the word for goodbye');
      expect(aiPrompt2).toBeDefined();
      expect(aiPrompt2!.correctCount).toBe(0);
      expect(aiPrompt2!.totalCount).toBe(1);
      expect(aiPrompt2!.accuracyPercentage).toBe(0);

      // AI prompt entries should have empty translation (no match in training.words)
      expect(aiPrompt1!.translation).toBe('');
      expect(aiPrompt2!.translation).toBe('');

      // mostMissedWords should include the incorrect AI exercise
      const missed = result.statistics!.mostMissedWords;
      expect(missed.length).toBeGreaterThan(0);
      expect(missed.some((m) => m.word === 'Fill in the blank: ___ is the word for goodbye')).toBe(true);
    });
  });

  describe('startTraining - AI_TRAINING randomized path', () => {
    test('should succeed with randomized AI training and return aiExercises with words', async () => {
      const userId = 'user-123';
      const trainingId = 'training#ai-rand';
      const vocabListId = 'list-rand-1';

      const training: Training = {
        id: trainingId,
        userId,
        name: 'Randomized AI Training',
        mode: 'AI_TRAINING',
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
        if (input.TableName === VOCAB_TABLE && input.Key.id === vocabListId) {
          return {
            Item: {
              id: vocabListId,
              userId,
              sourceLanguage: 'English',
              targetLanguage: 'French',
              words: [
                { word: 'house', translation: 'maison', definition: 'a building' },
                { word: 'car', translation: 'voiture', definition: 'a vehicle' },
                { word: 'tree', translation: 'arbre', definition: 'a plant' },
              ],
              createdAt: '2024-01-01T00:00:00.000Z',
              updatedAt: '2024-01-01T00:00:00.000Z',
            },
          };
        }
        return { Item: undefined };
      });

      bedrockMock
        .on(InvokeModelCommand)
        .resolves(createExercisesResponse([{ word: 'house' }, { word: 'car' }, { word: 'tree' }]));

      ddbMock.on(PutCommand).resolves({});

      const service = TrainingService.getInstance();
      const result = await service.startTraining(trainingId, userId);

      expect(result.success).toBe(true);
      expect(result.execution).toBeDefined();
      expect(result.execution!.aiExercises).toBeDefined();
      expect(result.execution!.aiExercises!.length).toBeGreaterThan(0);
      expect(result.execution!.words).toBeDefined();
      expect(result.execution!.words!.length).toBeGreaterThan(0);
    });
  });
});
