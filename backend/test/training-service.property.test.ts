import { describe, test, expect, beforeEach } from 'vitest';
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
