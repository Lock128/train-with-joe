import { describe, test, expect, beforeEach } from 'vitest';
import * as crypto from 'crypto';
import * as fc from 'fast-check';
import { TrainingService } from '../src/services/training-service';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import type { Training, TrainingExecution, AIExercise } from '../src/model/domain/Training';

const ddbMock = mockClient(DynamoDBDocumentClient);
const bedrockMock = mockClient(BedrockRuntimeClient);
const VOCAB_TABLE = 'train-with-joe-vocabulary-lists-sandbox';
const TRAINING_TABLE = 'train-with-joe-trainings-sandbox';

// Helper to build Bedrock response for given words
function buildBedrockExercisesResponse(words: { word: string }[]): { body: Uint8Array } {
  const exercises = words.map((w, i) => ({
    prompt: `Exercise for ${w.word}: Fill in the blank`,
    options: [`opt_a_${i}`, `opt_b_${i}`, `opt_c_${i}`],
    correctOptionIndex: 0,
    exerciseType: i % 2 === 0 ? 'fill_in_the_blank' : 'verb_conjugation',
    sourceWord: w.word,
  }));
  return {
    body: new TextEncoder().encode(JSON.stringify({ results: [{ outputText: JSON.stringify(exercises) }] })),
  };
}

const vocabularyWordArb = fc.record({
  word: fc.string({ minLength: 1, maxLength: 20 }),
  translation: fc.string({ minLength: 1, maxLength: 20 }),
  definition: fc.string({ minLength: 1, maxLength: 30 }),
});

describe('AI Training Service Property Tests', () => {
  beforeEach(() => {
    ddbMock.reset();
    bedrockMock.reset();
  });

  /**
   * Feature: ai-training-mode, Property 1: AI training creation stores mode correctly
   */
  test(
    'Feature: ai-training-mode, Property 1: AI training creation stores mode correctly',
    { timeout: 60000 },
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.array(
            fc.record({
              id: fc.uuid(),
              words: fc.array(vocabularyWordArb, { minLength: 1, maxLength: 10 }),
            }),
            { minLength: 1, maxLength: 5 },
          ),
          async (userId, vocabLists) => {
            ddbMock.reset();
            bedrockMock.reset();

            // Mock GetCommand with callsFake to differentiate tables
            ddbMock.on(GetCommand).callsFake((input) => {
              if (input.TableName === VOCAB_TABLE) {
                const list = vocabLists.find((l) => l.id === input.Key.id);
                if (list) {
                  return {
                    Item: {
                      id: list.id,
                      userId,
                      words: list.words,
                      createdAt: '2024-01-01T00:00:00.000Z',
                      updatedAt: '2024-01-01T00:00:00.000Z',
                    },
                  };
                }
              }
              return {};
            });

            ddbMock.on(PutCommand).resolves({});

            const service = TrainingService.getInstance();
            const listIds = vocabLists.map((l) => l.id);
            const result = await service.createTraining(userId, listIds, 'AI_TRAINING');

            expect(result.success).toBe(true);
            expect(result.training).toBeDefined();
            expect(result.training!.mode).toBe('AI_TRAINING');
            expect(result.training!.userId).toBe(userId);
            expect(result.training!.vocabularyListIds).toEqual(listIds);
          },
        ),
        { numRuns: 100 },
      );
    },
  );

  /**
   * Feature: ai-training-mode, Property 5: AI training start produces one exercise per selected word
   */
  test(
    'Feature: ai-training-mode, Property 5: AI training start produces one exercise per selected word',
    { timeout: 60000 },
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.array(
            fc.record({
              id: fc.uuid(),
              words: fc.array(vocabularyWordArb, { minLength: 1, maxLength: 8 }),
            }),
            { minLength: 1, maxLength: 4 },
          ),
          async (userId, vocabLists) => {
            ddbMock.reset();
            bedrockMock.reset();

            const trainingId = crypto.randomUUID();
            const listIds = vocabLists.map((l) => l.id);

            // Compute the expected words (those with non-empty translations)
            const allWords = vocabLists.flatMap((l) =>
              l.words
                .filter((w) => w.translation && w.translation.length > 0)
                .map((w) => ({
                  word: w.word,
                  translation: w.translation,
                  vocabularyListId: l.id,
                })),
            );

            // Skip if no words with translations available
            if (allWords.length === 0) return;

            const training: Training = {
              id: trainingId,
              userId,
              name: 'AI Static Training',
              mode: 'AI_TRAINING',
              direction: 'WORD_TO_TRANSLATION',
              vocabularyListIds: listIds,
              words: allWords,
              createdAt: '2024-01-01T00:00:00.000Z',
              updatedAt: '2024-01-01T00:00:00.000Z',
            };

            // Mock GetCommand: differentiate training vs vocab list by TableName
            ddbMock.on(GetCommand).callsFake((input) => {
              if (input.TableName === TRAINING_TABLE) {
                if (input.Key.id === trainingId) {
                  return { Item: { ...training } };
                }
                return { Item: undefined };
              }
              if (input.TableName === VOCAB_TABLE) {
                const list = vocabLists.find((l) => l.id === input.Key.id);
                if (list) {
                  return {
                    Item: {
                      id: list.id,
                      userId,
                      sourceLanguage: 'English',
                      targetLanguage: 'Spanish',
                      words: list.words,
                      createdAt: '2024-01-01T00:00:00.000Z',
                      updatedAt: '2024-01-01T00:00:00.000Z',
                    },
                  };
                }
                return { Item: undefined };
              }
              return {};
            });

            // Mock InvokeModelCommand to return exercises for each word
            bedrockMock.on(InvokeModelCommand).callsFake(() => {
              return buildBedrockExercisesResponse(allWords.map((w) => ({ word: w.word })));
            });

            ddbMock.on(PutCommand).resolves({});

            const service = TrainingService.getInstance();
            const result = await service.startTraining(trainingId, userId);

            expect(result.success).toBe(true);
            expect(result.execution).toBeDefined();
            expect(result.execution!.aiExercises).toBeDefined();
            expect(result.execution!.aiExercises!.length).toBeGreaterThan(0);

            // Each exercise's sourceWord should correspond to one of the training words
            const trainingWordSet = new Set(allWords.map((w) => w.word));
            for (const exercise of result.execution!.aiExercises!) {
              expect(trainingWordSet.has(exercise.sourceWord)).toBe(true);
            }
          },
        ),
        { numRuns: 100 },
      );
    },
  );

  /**
   * Feature: ai-training-mode, Property 6: AI answer submission and completion
   */
  test('Feature: ai-training-mode, Property 6: AI answer submission and completion', { timeout: 60000 }, async () => {
    const aiExerciseArb = fc.record({
      prompt: fc.string({ minLength: 1, maxLength: 40 }),
      options: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 3, maxLength: 5 }),
      correctOptionIndex: fc.nat({ max: 2 }),
      exerciseType: fc.constantFrom('fill_in_the_blank', 'verb_conjugation', 'preposition', 'sentence_completion'),
      sourceWord: fc.string({ minLength: 1, maxLength: 20 }),
    });

    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.array(aiExerciseArb, { minLength: 2, maxLength: 5 }),
        async (userId, exercises) => {
          ddbMock.reset();
          bedrockMock.reset();

          // Ensure correctOptionIndex is valid for each exercise
          const validExercises: AIExercise[] = exercises.map((e) => ({
            ...e,
            correctOptionIndex: e.correctOptionIndex % e.options.length,
          }));

          const trainingId = `training#${crypto.randomUUID()}`;
          const executionId = `execution#${crypto.randomUUID()}`;

          const training: Training = {
            id: trainingId,
            userId,
            name: 'AI Training',
            mode: 'AI_TRAINING',
            direction: 'WORD_TO_TRANSLATION',
            vocabularyListIds: ['list-1'],
            words: validExercises.map((e) => ({
              word: e.sourceWord,
              translation: 'translation',
              vocabularyListId: 'list-1',
            })),
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
          };

          // Track execution state across calls
          const executionState: TrainingExecution = {
            id: executionId,
            trainingId,
            userId,
            startedAt: '2024-01-01T10:00:00.000Z',
            results: [],
            aiExercises: validExercises,
            correctCount: 0,
            incorrectCount: 0,
          };

          ddbMock.on(GetCommand).callsFake((input) => {
            if (input.Key.id === executionId) {
              return { Item: { ...executionState, results: [...executionState.results] } };
            }
            if (input.Key.id === trainingId) {
              return { Item: { ...training } };
            }
            return {};
          });

          ddbMock.on(UpdateCommand).callsFake((input) => {
            // Reflect updates back to execution state
            if (input.ExpressionAttributeValues) {
              if (input.ExpressionAttributeValues[':results']) {
                executionState.results = input.ExpressionAttributeValues[':results'];
              }
              if (input.ExpressionAttributeValues[':correctCount'] !== undefined) {
                executionState.correctCount = input.ExpressionAttributeValues[':correctCount'];
              }
              if (input.ExpressionAttributeValues[':incorrectCount'] !== undefined) {
                executionState.incorrectCount = input.ExpressionAttributeValues[':incorrectCount'];
              }
              if (input.ExpressionAttributeValues[':completedAt']) {
                executionState.completedAt = input.ExpressionAttributeValues[':completedAt'];
              }
            }
            return { Attributes: { ...executionState } };
          });

          const service = TrainingService.getInstance();

          let lastResult;
          for (let i = 0; i < validExercises.length; i++) {
            // Alternate between correct and incorrect answers
            const answerIndex =
              i % 2 === 0
                ? validExercises[i].correctOptionIndex
                : (validExercises[i].correctOptionIndex + 1) % validExercises[i].options.length;
            lastResult = await service.submitAnswer(executionId, userId, i, String(answerIndex));

            expect(lastResult.success).toBe(true);
            expect(lastResult.result).toBeDefined();

            // Verify correctness: correct if submitted index === correctOptionIndex
            const expectedCorrect = answerIndex === validExercises[i].correctOptionIndex;
            expect(lastResult.result!.correct).toBe(expectedCorrect);
          }

          // After all answers are submitted
          expect(lastResult!.completed).toBe(true);
          expect(executionState.correctCount + executionState.incorrectCount).toBe(validExercises.length);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Feature: ai-training-mode, Property 8: Non-AI trainings backward compatibility
   */
  test(
    'Feature: ai-training-mode, Property 8: Non-AI trainings backward compatibility',
    { timeout: 60000 },
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.constantFrom('TEXT_INPUT' as const, 'MULTIPLE_CHOICE' as const),
          fc.array(
            fc.record({
              word: fc.string({ minLength: 1, maxLength: 20 }),
              translation: fc.string({ minLength: 1, maxLength: 20 }),
              vocabularyListId: fc.uuid(),
            }),
            { minLength: 3, maxLength: 10 },
          ),
          async (userId, mode, words) => {
            ddbMock.reset();
            bedrockMock.reset();

            const trainingId = crypto.randomUUID();

            const training: Training = {
              id: trainingId,
              userId,
              name: 'Non-AI Training',
              mode,
              direction: 'WORD_TO_TRANSLATION',
              vocabularyListIds: [...new Set(words.map((w) => w.vocabularyListId))],
              words,
              createdAt: '2024-01-01T00:00:00.000Z',
              updatedAt: '2024-01-01T00:00:00.000Z',
            };

            ddbMock.on(GetCommand).callsFake((input) => {
              if (input.TableName === TRAINING_TABLE) {
                if (input.Key.id === trainingId) {
                  return { Item: { ...training } };
                }
                return { Item: undefined };
              }
              return {};
            });

            ddbMock.on(PutCommand).resolves({});

            const service = TrainingService.getInstance();
            const result = await service.startTraining(trainingId, userId);

            expect(result.success).toBe(true);
            expect(result.execution).toBeDefined();

            // Verify Bedrock was NOT called for non-AI trainings
            expect(bedrockMock.commandCalls(InvokeModelCommand).length).toBe(0);

            // AI exercises should not be present
            expect(result.execution!.aiExercises).toBeUndefined();
          },
        ),
        { numRuns: 100 },
      );
    },
  );
});
