import { describe, test, expect, beforeEach } from 'vitest';
import * as crypto from 'crypto';
import * as fc from 'fast-check';
import { TrainingService } from '../src/services/training-service';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import type { Training, TrainingExecution } from '../src/model/domain/Training';

/**
 * Property-Based Tests for Training Service
 */

const ddbMock = mockClient(DynamoDBDocumentClient);

const VOCAB_TABLE = 'train-with-joe-vocabulary-lists-sandbox';

// Shared arbitraries
const wordArb = fc.record({
  word: fc.string({ minLength: 1, maxLength: 30 }),
  translation: fc.string({ minLength: 1, maxLength: 30 }),
  vocabularyListId: fc.uuid(),
});

const vocabularyWordArb = fc.record({
  word: fc.string({ minLength: 1, maxLength: 30 }),
  translation: fc.string({ minLength: 1, maxLength: 30 }),
  definition: fc.string({ minLength: 1, maxLength: 50 }),
});

const trainingModeArb = fc.constantFrom('TEXT_INPUT' as const, 'MULTIPLE_CHOICE' as const);

describe('Training Service Property Tests', () => {
  beforeEach(() => {
    ddbMock.reset();
  });

  /**
   * Property 1: Training creation preserves all input data
   */
  test('Property 1: Training creation preserves all input data', { timeout: 60000 }, async () => {
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
        trainingModeArb,
        async (userId, vocabLists, mode) => {
          ddbMock.reset();

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
          const result = await service.createTraining(userId, listIds, mode);

          expect(result.success).toBe(true);
          expect(result.training).toBeDefined();
          expect(result.training!.mode).toBe(mode);
          expect(result.training!.userId).toBe(userId);

          // Words should be union of all list words that have translations
          const expectedWords = vocabLists.flatMap((l) =>
            l.words
              .filter((w) => w.translation)
              .map((w) => ({
                word: w.word,
                translation: w.translation,
                vocabularyListId: l.id,
              })),
          );

          expect(result.training!.words).toHaveLength(expectedWords.length);
          for (let i = 0; i < expectedWords.length; i++) {
            expect(result.training!.words[i].word).toBe(expectedWords[i].word);
            expect(result.training!.words[i].translation).toBe(expectedWords[i].translation);
            expect(result.training!.words[i].vocabularyListId).toBe(expectedWords[i].vocabularyListId);
          }

          // vocabularyListIds should match input
          expect(result.training!.vocabularyListIds).toEqual(listIds);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 2: Empty vocabulary lists are excluded
   */
  test('Property 2: Empty vocabulary lists are excluded', { timeout: 60000 }, async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.array(
          fc.record({
            id: fc.uuid(),
            words: fc.array(vocabularyWordArb, { minLength: 1, maxLength: 10 }),
          }),
          { minLength: 1, maxLength: 3 },
        ),
        fc.array(
          fc.record({
            id: fc.uuid(),
            words: fc.constant([]),
          }),
          { minLength: 1, maxLength: 3 },
        ),
        trainingModeArb,
        async (userId, nonEmptyLists, emptyLists, mode) => {
          ddbMock.reset();

          const allLists = [...nonEmptyLists, ...emptyLists];

          ddbMock.on(GetCommand).callsFake((input) => {
            if (input.TableName === VOCAB_TABLE) {
              const list = allLists.find((l) => l.id === input.Key.id);
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
          const allIds = allLists.map((l) => l.id);
          const result = await service.createTraining(userId, allIds, mode);

          expect(result.success).toBe(true);
          expect(result.training).toBeDefined();

          // Words should only come from non-empty lists
          const nonEmptyIds = new Set(nonEmptyLists.map((l) => l.id));
          for (const word of result.training!.words) {
            expect(nonEmptyIds.has(word.vocabularyListId)).toBe(true);
          }

          // No words should come from empty lists
          const emptyIds = new Set(emptyLists.map((l) => l.id));
          for (const word of result.training!.words) {
            expect(emptyIds.has(word.vocabularyListId)).toBe(false);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 7: Answer correctness matches expected translation
   */
  test('Property 7: Answer correctness matches expected translation', { timeout: 60000 }, async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        wordArb,
        fc.boolean(),
        fc.string({ minLength: 1, maxLength: 30 }),
        async (userId, trainingWord, shouldMatch, randomAnswer) => {
          ddbMock.reset();

          const trainingId = `training#${fc.sample(fc.uuid(), 1)[0]}`;
          const executionId = `execution#${fc.sample(fc.uuid(), 1)[0]}`;

          const answer = shouldMatch
            ? ` ${trainingWord.translation} ` // with whitespace to test trimming
            : randomAnswer;

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
            name: 'Test Training',
            mode: 'TEXT_INPUT',
            direction: 'WORD_TO_TRANSLATION',
            vocabularyListIds: [trainingWord.vocabularyListId],
            words: [trainingWord],
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
            return {};
          });

          ddbMock.on(UpdateCommand).resolves({
            Attributes: execution,
          });

          const service = TrainingService.getInstance();
          const result = await service.submitAnswer(executionId, userId, 0, answer);

          expect(result.success).toBe(true);
          expect(result.result).toBeDefined();

          const expectedCorrect = answer.trim().toLowerCase() === trainingWord.translation.trim().toLowerCase();
          expect(result.result!.correct).toBe(expectedCorrect);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 8: Completing all answers finalizes the execution
   */
  test('Property 8: Completing all answers finalizes the execution', { timeout: 60000 }, async () => {
    await fc.assert(
      fc.asyncProperty(fc.uuid(), fc.array(wordArb, { minLength: 2, maxLength: 10 }), async (userId, words) => {
        ddbMock.reset();

        const trainingId = `training#${fc.sample(fc.uuid(), 1)[0]}`;
        const executionId = `execution#${fc.sample(fc.uuid(), 1)[0]}`;

        const training: Training = {
          id: trainingId,
          userId,
          name: 'Test Training',
          mode: 'TEXT_INPUT',
          direction: 'WORD_TO_TRANSLATION',
          vocabularyListIds: [...new Set(words.map((w) => w.vocabularyListId))],
          words,
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
        for (let i = 0; i < words.length; i++) {
          // Alternate between correct and wrong answers
          const answer = i % 2 === 0 ? words[i].translation : 'wrong-answer-xyz';
          lastResult = await service.submitAnswer(executionId, userId, i, answer);
          expect(lastResult.success).toBe(true);
        }

        // After all answers are submitted
        expect(lastResult!.completed).toBe(true);
        expect(executionState.correctCount + executionState.incorrectCount).toBe(words.length);
        expect(executionState.completedAt).toBeDefined();
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 6: Multiple-choice options are valid
   */
  test('Property 6: Multiple-choice options are valid', { timeout: 60000 }, async () => {
    await fc.assert(
      fc.asyncProperty(fc.uuid(), fc.array(wordArb, { minLength: 3, maxLength: 10 }), async (userId, words) => {
        ddbMock.reset();

        const trainingId = `training#${fc.sample(fc.uuid(), 1)[0]}`;

        const training: Training = {
          id: trainingId,
          userId,
          name: 'MC Training',
          mode: 'MULTIPLE_CHOICE',
          direction: 'WORD_TO_TRANSLATION',
          vocabularyListIds: [...new Set(words.map((w) => w.vocabularyListId))],
          words,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        };

        ddbMock.on(GetCommand).callsFake((input) => {
          if (input.Key.id === trainingId) {
            return { Item: { ...training } };
          }
          return {};
        });

        ddbMock.on(PutCommand).resolves({});

        const service = TrainingService.getInstance();
        const result = await service.startTraining(trainingId, userId);

        expect(result.success).toBe(true);
        expect(result.execution).toBeDefined();
        expect(result.execution!.multipleChoiceOptions).toBeDefined();

        const options = result.execution!.multipleChoiceOptions!;
        expect(options).toHaveLength(words.length);

        const allTranslations = new Set(words.map((w) => w.translation));

        for (let i = 0; i < options.length; i++) {
          const opt = options[i];
          // Each option has exactly 3 choices
          expect(opt.options).toHaveLength(3);

          // The correct answer is at correctOptionIndex
          expect(opt.options[opt.correctOptionIndex]).toBe(words[i].translation);

          // The other 2 options are translations from other words in the training
          for (const o of opt.options) {
            expect(allTranslations.has(o)).toBe(true);
          }

          // The 2 distractors should not equal the correct answer (they come from other words)
          const distractors = opt.options.filter((_, idx) => idx !== opt.correctOptionIndex);
          for (const d of distractors) {
            // Distractors are from other words in the training
            const otherTranslations = words.filter((_, j) => j !== i).map((w) => w.translation);
            expect(otherTranslations).toContain(d);
          }
        }
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 12: Accuracy statistics correctly computed
   */
  test('Property 12: Accuracy statistics correctly computed', { timeout: 60000 }, async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.array(wordArb, { minLength: 1, maxLength: 5 }),
        fc.array(
          fc.record({
            correctCount: fc.nat({ max: 10 }),
            incorrectCount: fc.nat({ max: 10 }),
          }),
          { minLength: 1, maxLength: 5 },
        ),
        async (userId, words, executionSpecs) => {
          ddbMock.reset();

          const trainingId = `training#${fc.sample(fc.uuid(), 1)[0]}`;

          const training: Training = {
            id: trainingId,
            userId,
            name: 'Stats Training',
            mode: 'TEXT_INPUT',
            direction: 'WORD_TO_TRANSLATION',
            vocabularyListIds: [...new Set(words.map((w) => w.vocabularyListId))],
            words,
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
          };

          // Build executions with known results
          const executions: TrainingExecution[] = executionSpecs.map((spec, idx) => {
            const results = [];
            let correct = 0;
            let incorrect = 0;

            // Distribute correct and incorrect among words
            for (let w = 0; w < words.length; w++) {
              if (correct < spec.correctCount) {
                results.push({
                  wordIndex: w,
                  word: words[w].word,
                  expectedAnswer: words[w].translation,
                  userAnswer: words[w].translation,
                  correct: true,
                });
                correct++;
              } else if (incorrect < spec.incorrectCount) {
                results.push({
                  wordIndex: w,
                  word: words[w].word,
                  expectedAnswer: words[w].translation,
                  userAnswer: 'wrong',
                  correct: false,
                });
                incorrect++;
              }
            }

            return {
              id: `execution#${idx}`,
              trainingId,
              userId,
              startedAt: `2024-01-0${idx + 1}T10:00:00.000Z`,
              completedAt: `2024-01-0${idx + 1}T10:05:00.000Z`,
              results,
              correctCount: correct,
              incorrectCount: incorrect,
            };
          });

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

          // Compute expected accuracy
          let totalCorrect = 0;
          let totalAnswers = 0;
          for (const exec of executions) {
            for (const r of exec.results) {
              totalAnswers++;
              if (r.correct) totalCorrect++;
            }
          }

          const expectedAccuracy = totalAnswers > 0 ? (totalCorrect / totalAnswers) * 100 : 0;
          expect(result.statistics!.overallAccuracy).toBeCloseTo(expectedAccuracy, 5);

          // Per-word stats
          for (const wordStat of result.statistics!.perWordStatistics) {
            let wCorrect = 0;
            let wTotal = 0;
            for (const exec of executions) {
              for (const r of exec.results) {
                if (r.word === wordStat.word) {
                  wTotal++;
                  if (r.correct) wCorrect++;
                }
              }
            }
            expect(wordStat.correctCount).toBe(wCorrect);
            expect(wordStat.totalCount).toBe(wTotal);
            const expectedWordAccuracy = wTotal > 0 ? (wCorrect / wTotal) * 100 : 0;
            expect(wordStat.accuracyPercentage).toBeCloseTo(expectedWordAccuracy, 5);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 15: Day statistics filter executions by date
   */
  test('Property 15: Day statistics filter executions by date', { timeout: 60000 }, async () => {
    const dateArb = fc.constantFrom('2024-01-01', '2024-01-02', '2024-01-03');

    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        dateArb,
        fc.array(
          fc.record({
            date: dateArb,
            correctCount: fc.nat({ max: 5 }),
            incorrectCount: fc.nat({ max: 5 }),
          }),
          { minLength: 2, maxLength: 8 },
        ),
        async (userId, targetDate, executionSpecs) => {
          ddbMock.reset();

          const trainingId = `training#${fc.sample(fc.uuid(), 1)[0]}`;

          const training: Training = {
            id: trainingId,
            userId,
            name: 'Day Stats Training',
            mode: 'TEXT_INPUT',
            direction: 'WORD_TO_TRANSLATION',
            vocabularyListIds: ['list1'],
            words: [{ word: 'hello', translation: 'hola', vocabularyListId: 'list1' }],
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
          };

          const executions: TrainingExecution[] = executionSpecs.map((spec, idx) => ({
            id: `execution#${idx}`,
            trainingId,
            userId,
            startedAt: `${spec.date}T10:${String(idx).padStart(2, '0')}:00.000Z`,
            completedAt: `${spec.date}T10:${String(idx + 10).padStart(2, '0')}:00.000Z`,
            results: [],
            correctCount: spec.correctCount,
            incorrectCount: spec.incorrectCount,
          }));

          // getAllByUserId returns trainings via QueryCommand on userId-index
          ddbMock.on(QueryCommand).callsFake((input) => {
            if (input.IndexName === 'userId-index') {
              return { Items: [training] };
            }
            if (input.IndexName === 'trainingId-index') {
              return { Items: executions };
            }
            return { Items: [] };
          });

          const service = TrainingService.getInstance();
          const result = await service.getTrainingDayStatistics(userId, targetDate);

          expect(result.success).toBe(true);
          expect(result.dayStatistics).toBeDefined();
          expect(result.dayStatistics!.date).toBe(targetDate);

          // Only executions on the target date should be returned
          const expectedExecutions = executionSpecs.filter((s) => s.date === targetDate);
          expect(result.dayStatistics!.executions).toHaveLength(expectedExecutions.length);

          // Totals should match
          let expectedCorrect = 0;
          let expectedIncorrect = 0;
          for (const spec of expectedExecutions) {
            expectedCorrect += spec.correctCount;
            expectedIncorrect += spec.incorrectCount;
          }
          expect(result.dayStatistics!.totalCorrect).toBe(expectedCorrect);
          expect(result.dayStatistics!.totalIncorrect).toBe(expectedIncorrect);
        },
      ),
      { numRuns: 100 },
    );
  });
});

describe('Randomized Training Property Tests', () => {
  beforeEach(() => {
    ddbMock.reset();
  });

  /**
   * Feature: randomized-training, Property 1: Randomized training creation stores configuration correctly
   * Validates: Requirements 1.1, 1.2
   *
   * For any valid isRandomized=true training creation with valid vocabulary list IDs
   * and a valid randomizedWordCount, the resulting Training entity SHALL have
   * isRandomized=true, the specified randomizedWordCount, an empty words array,
   * and vocabularyListIds matching the input.
   */
  test(
    'Feature: randomized-training, Property 1: Randomized training creation stores configuration correctly',
    { timeout: 60000 },
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.array(fc.uuid(), { minLength: 1, maxLength: 5 }),
          fc.integer({ min: 1, max: 100 }),
          trainingModeArb,
          async (userId, vocabularyListIds, randomizedWordCount, mode) => {
            ddbMock.reset();

            ddbMock.on(PutCommand).resolves({});

            const service = TrainingService.getInstance();
            const result = await service.createTraining(
              userId,
              vocabularyListIds,
              mode,
              undefined, // name
              undefined, // wordCount
              undefined, // direction
              undefined, // units
              true, // isRandomized
              randomizedWordCount,
            );

            expect(result.success).toBe(true);
            expect(result.training).toBeDefined();
            expect(result.training!.isRandomized).toBe(true);
            expect(result.training!.randomizedWordCount).toBe(randomizedWordCount);
            expect(result.training!.words).toEqual([]);
            expect(result.training!.vocabularyListIds).toEqual(vocabularyListIds);
            expect(result.training!.userId).toBe(userId);
            expect(result.training!.mode).toBe(mode);
          },
        ),
        { numRuns: 100 },
      );
    },
  );

  /**
   * Feature: randomized-training, Property 2: Word count validation and capping
   * Validates: Requirements 1.4, 1.5
   *
   * For any randomized training creation, if randomizedWordCount > 100 the stored
   * value SHALL be 100, and if randomizedWordCount < 1 the request SHALL be rejected
   * with an error. For values in [1, 100], the stored value SHALL equal the input.
   */
  describe('Feature: randomized-training, Property 2: Word count validation and capping', () => {
    test('Capping: randomizedWordCount > 100 is stored as 100', { timeout: 60000 }, async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.array(fc.uuid(), { minLength: 1, maxLength: 5 }),
          fc.integer({ min: 101, max: 10000 }),
          trainingModeArb,
          async (userId, vocabularyListIds, randomizedWordCount, mode) => {
            ddbMock.reset();

            ddbMock.on(PutCommand).resolves({});

            const service = TrainingService.getInstance();
            const result = await service.createTraining(
              userId,
              vocabularyListIds,
              mode,
              undefined, // name
              undefined, // wordCount
              undefined, // direction
              undefined, // units
              true, // isRandomized
              randomizedWordCount,
            );

            expect(result.success).toBe(true);
            expect(result.training).toBeDefined();
            expect(result.training!.isRandomized).toBe(true);
            expect(result.training!.randomizedWordCount).toBe(100);
          },
        ),
        { numRuns: 100 },
      );
    });

    test('Rejection: randomizedWordCount < 1 is rejected with error', { timeout: 60000 }, async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.array(fc.uuid(), { minLength: 1, maxLength: 5 }),
          fc.integer({ min: -100, max: 0 }),
          trainingModeArb,
          async (userId, vocabularyListIds, randomizedWordCount, mode) => {
            ddbMock.reset();

            const service = TrainingService.getInstance();
            const result = await service.createTraining(
              userId,
              vocabularyListIds,
              mode,
              undefined, // name
              undefined, // wordCount
              undefined, // direction
              undefined, // units
              true, // isRandomized
              randomizedWordCount,
            );

            expect(result.success).toBe(false);
            expect(result.error).toBe('Randomized word count must be at least 1');
            expect(result.training).toBeUndefined();
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Feature: randomized-training, Property 3: Dynamic word selection produces a correct subset
   * Validates: Requirements 2.1, 2.2, 2.3, 2.6
   *
   * For any randomized training with attached vocabulary lists containing words with translations,
   * starting the training SHALL produce a TrainingExecution whose words are a subset of the union
   * of all available vocabulary words, with words.length == min(randomizedWordCount, totalAvailableWords).
   */
  test(
    'Feature: randomized-training, Property 3: Dynamic word selection produces a correct subset',
    { timeout: 60000 },
    async () => {
      const TRAINING_TABLE = 'train-with-joe-trainings-sandbox';

      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.array(
            fc.record({
              id: fc.uuid(),
              words: fc.array(
                fc.record({
                  word: fc.string({ minLength: 1, maxLength: 20 }),
                  translation: fc.string({ minLength: 1, maxLength: 20 }),
                  definition: fc.string({ minLength: 1, maxLength: 30 }),
                }),
                { minLength: 1, maxLength: 8 },
              ),
            }),
            { minLength: 1, maxLength: 4 },
          ),
          fc.integer({ min: 1, max: 100 }),
          async (userId, vocabLists, randomizedWordCount) => {
            ddbMock.reset();

            const trainingId = crypto.randomUUID();
            const listIds = vocabLists.map((l) => l.id);

            // Build the union of all available words (words with translations)
            const allAvailableWords = vocabLists.flatMap((l) =>
              l.words
                .filter((w) => w.translation && w.translation.length > 0)
                .map((w) => ({
                  word: w.word,
                  translation: w.translation,
                  vocabularyListId: l.id,
                })),
            );

            const totalAvailableWords = allAvailableWords.length;

            // The training object stored in DynamoDB
            const training: Training = {
              id: trainingId,
              userId,
              name: 'Randomized Training',
              mode: 'TEXT_INPUT',
              direction: 'WORD_TO_TRANSLATION',
              vocabularyListIds: listIds,
              words: [],
              isRandomized: true,
              randomizedWordCount,
              createdAt: '2024-01-01T00:00:00.000Z',
              updatedAt: '2024-01-01T00:00:00.000Z',
            };

            // Mock GetCommand: differentiate training lookup vs vocab list lookup by TableName
            ddbMock.on(GetCommand).callsFake((input) => {
              if (input.TableName === VOCAB_TABLE) {
                // Vocabulary list lookup
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
                return { Item: undefined };
              }
              if (input.TableName === TRAINING_TABLE) {
                // Training lookup
                if (input.Key.id === trainingId) {
                  return { Item: { ...training } };
                }
                return { Item: undefined };
              }
              return {};
            });

            // Mock PutCommand for execution creation
            ddbMock.on(PutCommand).resolves({});

            const service = TrainingService.getInstance();
            const result = await service.startTraining(trainingId, userId);

            expect(result.success).toBe(true);
            expect(result.execution).toBeDefined();

            const execution = result.execution!;

            // Assert words field is populated
            expect(execution.words).toBeDefined();
            expect(Array.isArray(execution.words)).toBe(true);

            // Assert words.length == min(randomizedWordCount, totalAvailableWords)
            const expectedLength = Math.min(randomizedWordCount, totalAvailableWords);
            expect(execution.words!.length).toBe(expectedLength);

            // Assert every word in execution.words is a member of the union of all vocab list words
            for (const execWord of execution.words!) {
              const found = allAvailableWords.some(
                (aw) =>
                  aw.word === execWord.word &&
                  aw.translation === execWord.translation &&
                  aw.vocabularyListId === execWord.vocabularyListId,
              );
              expect(found).toBe(true);
            }

            // Assert no duplicate words in the execution
            const wordKeys = execution.words!.map((w) => `${w.word}|${w.translation}|${w.vocabularyListId}`);
            const uniqueKeys = new Set(wordKeys);
            expect(uniqueKeys.size).toBe(execution.words!.length);
          },
        ),
        { numRuns: 100 },
      );
    },
  );

  /**
   * Feature: randomized-training, Property 4: Deleted vocabulary lists are skipped during word selection
   * Validates: Requirements 2.4
   *
   * For any randomized training where some attached vocabulary lists have been deleted,
   * starting the training SHALL select words only from the remaining (non-deleted) lists,
   * and no word in the execution SHALL reference a deleted list's ID.
   */
  test(
    'Feature: randomized-training, Property 4: Deleted vocabulary lists are skipped during word selection',
    { timeout: 60000 },
    async () => {
      const TRAINING_TABLE = 'train-with-joe-trainings-sandbox';

      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          // Existing lists: at least 1 list with at least 1 word
          fc.array(
            fc.record({
              id: fc.uuid(),
              words: fc.array(
                fc.record({
                  word: fc.string({ minLength: 1, maxLength: 20 }),
                  translation: fc.string({ minLength: 1, maxLength: 20 }),
                  definition: fc.string({ minLength: 1, maxLength: 30 }),
                }),
                { minLength: 1, maxLength: 8 },
              ),
            }),
            { minLength: 1, maxLength: 4 },
          ),
          // Deleted lists: IDs only (no data in DynamoDB)
          fc.array(fc.uuid(), { minLength: 1, maxLength: 4 }),
          fc.integer({ min: 1, max: 100 }),
          async (userId, existingLists, deletedListIds, randomizedWordCount) => {
            ddbMock.reset();

            const trainingId = crypto.randomUUID();
            const existingListIds = existingLists.map((l) => l.id);
            // Combine existing + deleted list IDs for the training's vocabularyListIds
            const allListIds = [...existingListIds, ...deletedListIds];
            const deletedIdSet = new Set(deletedListIds);

            // Build the union of words from existing (non-deleted) lists only
            const existingWords = existingLists.flatMap((l) =>
              l.words
                .filter((w) => w.translation && w.translation.length > 0)
                .map((w) => ({
                  word: w.word,
                  translation: w.translation,
                  vocabularyListId: l.id,
                })),
            );

            const training: Training = {
              id: trainingId,
              userId,
              name: 'Randomized Training',
              mode: 'TEXT_INPUT',
              direction: 'WORD_TO_TRANSLATION',
              vocabularyListIds: allListIds,
              words: [],
              isRandomized: true,
              randomizedWordCount,
              createdAt: '2024-01-01T00:00:00.000Z',
              updatedAt: '2024-01-01T00:00:00.000Z',
            };

            // Mock GetCommand: return data for existing lists, undefined for deleted lists
            ddbMock.on(GetCommand).callsFake((input) => {
              if (input.TableName === VOCAB_TABLE) {
                const list = existingLists.find((l) => l.id === input.Key.id);
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
                // Deleted list or unknown — return no item
                return { Item: undefined };
              }
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

            const execution = result.execution!;
            expect(execution.words).toBeDefined();
            expect(Array.isArray(execution.words)).toBe(true);

            // Assert no word references a deleted list's ID
            for (const execWord of execution.words!) {
              expect(deletedIdSet.has(execWord.vocabularyListId)).toBe(false);
            }

            // Assert every word comes from an existing (non-deleted) list
            for (const execWord of execution.words!) {
              const found = existingWords.some(
                (ew) =>
                  ew.word === execWord.word &&
                  ew.translation === execWord.translation &&
                  ew.vocabularyListId === execWord.vocabularyListId,
              );
              expect(found).toBe(true);
            }

            // Assert word count is correct: min(randomizedWordCount, existingWords.length)
            const expectedLength = Math.min(randomizedWordCount, existingWords.length);
            expect(execution.words!.length).toBe(expectedLength);
          },
        ),
        { numRuns: 100 },
      );
    },
  );

  /**
   * Feature: randomized-training, Property 6: Multiple choice options generated from dynamically selected words
   * Validates: Requirements 7.1
   *
   * For any randomized training in MULTIPLE_CHOICE mode with at least 3 dynamically selected words,
   * starting the training SHALL produce multiple choice options where each option set contains the
   * correct answer and distractors drawn exclusively from the execution's selected words.
   */
  test(
    'Feature: randomized-training, Property 6: Multiple choice options generated from dynamically selected words',
    { timeout: 60000 },
    async () => {
      const TRAINING_TABLE = 'train-with-joe-trainings-sandbox';

      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.array(
            fc.record({
              id: fc.uuid(),
              words: fc.array(
                fc.record({
                  word: fc.string({ minLength: 1, maxLength: 20 }),
                  translation: fc.string({ minLength: 1, maxLength: 20 }),
                  definition: fc.string({ minLength: 1, maxLength: 30 }),
                }),
                { minLength: 1, maxLength: 8 },
              ),
            }),
            { minLength: 1, maxLength: 4 },
          ),
          fc.integer({ min: 3, max: 100 }),
          fc.constantFrom('WORD_TO_TRANSLATION' as const, 'TRANSLATION_TO_WORD' as const),
          async (userId, vocabLists, randomizedWordCount, direction) => {
            ddbMock.reset();

            // Compute total available words with translations across all lists
            const allAvailableWords = vocabLists.flatMap((l) =>
              l.words
                .filter((w) => w.translation && w.translation.length > 0)
                .map((w) => ({
                  word: w.word,
                  translation: w.translation,
                  vocabularyListId: l.id,
                })),
            );

            // Skip if fewer than 3 words available (MC requires at least 3)
            if (allAvailableWords.length < 3) return;

            const trainingId = crypto.randomUUID();
            const listIds = vocabLists.map((l) => l.id);

            const training: Training = {
              id: trainingId,
              userId,
              name: 'Randomized MC Training',
              mode: 'MULTIPLE_CHOICE',
              direction,
              vocabularyListIds: listIds,
              words: [],
              isRandomized: true,
              randomizedWordCount,
              createdAt: '2024-01-01T00:00:00.000Z',
              updatedAt: '2024-01-01T00:00:00.000Z',
            };

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
                return { Item: undefined };
              }
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

            const execution = result.execution!;

            // Assert multipleChoiceOptions is populated
            expect(execution.multipleChoiceOptions).toBeDefined();
            expect(Array.isArray(execution.multipleChoiceOptions)).toBe(true);

            // Assert words are populated on the execution
            expect(execution.words).toBeDefined();
            expect(execution.words!.length).toBeGreaterThanOrEqual(3);

            const selectedWords = execution.words!;
            const options = execution.multipleChoiceOptions!;

            // One option set per selected word
            expect(options.length).toBe(selectedWords.length);

            // Build the set of valid answer values from the execution's selected words
            const reversed = direction === 'TRANSLATION_TO_WORD';
            const allAnswerValues = new Set(selectedWords.map((w) => (reversed ? w.word : w.translation)));

            for (let i = 0; i < options.length; i++) {
              const opt = options[i];

              // Each option set has exactly 3 options
              expect(opt.options).toHaveLength(3);

              // The correct answer is at correctOptionIndex
              const correctAnswer = reversed ? selectedWords[i].word : selectedWords[i].translation;
              expect(opt.options[opt.correctOptionIndex]).toBe(correctAnswer);

              // All options (correct + distractors) are drawn from the execution's selected words
              for (const o of opt.options) {
                expect(allAnswerValues.has(o)).toBe(true);
              }
            }
          },
        ),
        { numRuns: 100 },
      );
    },
  );

  /**
   * Feature: randomized-training, Property 5: Static training backward compatibility
   * Validates: Requirements 3.1, 3.3
   *
   * For any training created without isRandomized (or with isRandomized=false),
   * the Training entity SHALL have a non-empty words array pre-selected at creation time,
   * and starting the training SHALL use those pre-stored words — identical to existing behavior.
   */
  test(
    'Feature: randomized-training, Property 5: Static training backward compatibility',
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
          trainingModeArb,
          fc.constantFrom(undefined, false),
          async (userId, vocabLists, mode, isRandomized) => {
            ddbMock.reset();

            // Mock GetCommand for vocabulary list lookups
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
            const result = await service.createTraining(
              userId,
              listIds,
              mode,
              undefined, // name
              undefined, // wordCount
              undefined, // direction
              undefined, // units
              isRandomized as boolean | undefined, // isRandomized: undefined or false
            );

            expect(result.success).toBe(true);
            expect(result.training).toBeDefined();

            // isRandomized should be falsy (undefined for static trainings)
            expect(result.training!.isRandomized).toBeFalsy();

            // Words should be non-empty and pre-selected from the vocabulary lists
            expect(result.training!.words.length).toBeGreaterThan(0);

            // All words should come from the provided vocabulary lists
            const allAvailableWords = vocabLists.flatMap((l) =>
              l.words
                .filter((w) => w.translation)
                .map((w) => ({ word: w.word, translation: w.translation, vocabularyListId: l.id })),
            );

            for (const trainingWord of result.training!.words) {
              const found = allAvailableWords.some(
                (aw) =>
                  aw.word === trainingWord.word &&
                  aw.translation === trainingWord.translation &&
                  aw.vocabularyListId === trainingWord.vocabularyListId,
              );
              expect(found).toBe(true);
            }

            // vocabularyListIds should match input
            expect(result.training!.vocabularyListIds).toEqual(listIds);
          },
        ),
        { numRuns: 100 },
      );
    },
  );
});
